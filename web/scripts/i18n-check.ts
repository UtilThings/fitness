import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseAstro } from '@astrojs/compiler-rs';
import {
  NodeTypes,
  parse as parseTemplate,
  type TemplateChildNode,
} from '@vue/compiler-dom';
import { parse as parseSfc } from 'vue/compiler-sfc';
import ts from 'typescript';
import { readCatalog, sortCatalog } from './i18n-catalog';

const calls = new Set(['t', '$t', 'te', 'tl']);
const visibleAttributes = new Set([
  'alt',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-valuetext',
  'placeholder',
  'title',
]);
const componentLabels: Record<string, ReadonlySet<string>> = {
  PageHero: new Set(['eyebrow', 'sub']),
  PricingGrid: new Set(['cta']),
  LeadForm: new Set(['submitLabel', 'successMessage']),
};
const untranslatedLiterals = new Set([
  'EN',
  'ES',
  'JQ Fitness',
  'Tropical Jump',
]);
const invisibleElements = new Set(['script', 'style']);

interface AstroNode {
  type: string;
  start?: number;
  end?: number;
  name?: string | AstroNode;
  value?: unknown;
  callee?: AstroNode;
  openingElement?: AstroNode;
  attributes?: AstroNode[];
  expression?: AstroNode;
  arguments?: AstroNode[];
  expressions?: AstroNode[];
  quasis?: { value: { cooked: string | null } }[];
}

function walkAstro(
  value: unknown,
  visit: (node: AstroNode, parent?: AstroNode) => void,
  parent?: AstroNode,
) {
  if (Array.isArray(value)) {
    value.forEach((child) => walkAstro(child, visit, parent));
  } else if (value && typeof value === 'object') {
    const node =
      'type' in value && typeof value.type === 'string'
        ? (value as AstroNode)
        : undefined;
    if (node) visit(node, parent);
    Object.values(value).forEach((child) =>
      walkAstro(child, visit, node ?? parent),
    );
  }
}

function astroLiteral(node?: AstroNode): string | undefined {
  if (typeof node?.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions?.length === 0) {
    return node.quasis?.[0]?.value.cooked ?? undefined;
  }
}

function astroName(node?: AstroNode): string {
  return typeof node?.name === 'object' && typeof node.name.name === 'string'
    ? node.name.name
    : '';
}

function isVisibleAttribute(tag: string, name: string) {
  return visibleAttributes.has(name) || componentLabels[tag]?.has(name);
}

function isKeyAttribute(name: string) {
  return (
    name === 'keypath' || /^data-i18n(?:-(?!params(?:-|$))[a-z-]+)?$/.test(name)
  );
}

function literal(node: ts.Node | undefined): string | undefined {
  return node && ts.isStringLiteralLike(node) ? node.text : undefined;
}

function propertyName(node: ts.PropertyName): string | undefined {
  return ts.isIdentifier(node) ? node.text : literal(node);
}

function readSource(code: string, file: string) {
  const keys = new Set<string>();
  const errors: string[] = [];

  function record(key: string | undefined, usage: string) {
    if (key === undefined)
      errors.push(`${file}: ${usage} requires a literal key`);
    else keys.add(key);
  }

  function checkLiteral(value: string | undefined, usage: string) {
    const text = value?.replace(/\s+/g, ' ').trim();
    if (!text || !/\p{L}/u.test(text) || untranslatedLiterals.has(text)) return;
    errors.push(`${file}: unmarked ${usage} ${JSON.stringify(text)}`);
  }

  function readExpression(content: string) {
    const statement = ts.createSourceFile(file, content, ts.ScriptTarget.Latest)
      .statements[0];
    return statement && ts.isExpressionStatement(statement)
      ? statement.expression
      : undefined;
  }

  function readCode(content: string, attrsOnly = false) {
    const source = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );

    function readAttributeKeys(argument: ts.Expression | undefined) {
      if (!argument || !ts.isObjectLiteralExpression(argument)) {
        record(undefined, 'i18nAttrs(...)');
        return;
      }
      for (const prop of argument.properties) {
        if (!ts.isPropertyAssignment(prop)) {
          record(undefined, `i18nAttrs(${prop.getText(source)})`);
          continue;
        }
        const value = prop.initializer;
        const keyProperty = ts.isObjectLiteralExpression(value)
          ? value.properties.find(
              (entry): entry is ts.PropertyAssignment =>
                ts.isPropertyAssignment(entry) &&
                propertyName(entry.name) === 'key',
            )
          : undefined;
        const key = keyProperty?.initializer ?? value;
        if (ts.isCallExpression(key) && key.expression.getText(source) === 'tl')
          continue;
        record(literal(key), `i18nAttrs(${prop.getText(source)})`);
      }
    }

    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const name = node.expression.text;
        const [argument] = node.arguments;
        if (name === 'i18nAttrs') readAttributeKeys(argument);
        if (!attrsOnly && calls.has(name)) {
          record(
            literal(argument),
            `${name}(${argument?.getText(source) ?? ''})`,
          );
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
  }

  function readVue(node: TemplateChildNode, translated = false) {
    if (node.type === NodeTypes.TEXT && !translated) {
      checkLiteral(node.content, 'template text');
    }
    if (
      node.type === NodeTypes.INTERPOLATION &&
      node.content.type === NodeTypes.SIMPLE_EXPRESSION
    ) {
      const content = node.content.content;
      if (!translated)
        checkLiteral(literal(readExpression(content)), 'template text');
      readCode(content);
    }
    if (node.type !== NodeTypes.ELEMENT || invisibleElements.has(node.tag))
      return;
    const marked = new Set(
      node.props.flatMap((prop) =>
        prop.type === NodeTypes.ATTRIBUTE ? [prop.name] : [],
      ),
    );
    for (const prop of node.props) {
      if (prop.type === NodeTypes.ATTRIBUTE) {
        if (
          isKeyAttribute(prop.name) ||
          (node.tag === 'T' && prop.name === 'k')
        ) {
          record(prop.value?.content, `<${node.tag} ${prop.name}>`);
        } else if (
          isVisibleAttribute(node.tag, prop.name) &&
          !marked.has(`data-i18n-${prop.name}`)
        ) {
          checkLiteral(prop.value?.content, prop.name);
        }
      } else if (prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION) {
        const content = prop.exp.content;
        if (
          prop.name === 'bind' &&
          prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
          prop.arg.isStatic
        ) {
          const name = prop.arg.content;
          const expression = readExpression(content);
          if (isKeyAttribute(name) || (node.tag === 'T' && name === 'k')) {
            const key =
              expression &&
              ts.isCallExpression(expression) &&
              ts.isIdentifier(expression.expression) &&
              expression.expression.text === 'tl'
                ? literal(expression.arguments[0])
                : literal(expression);
            record(key, `<${node.tag} :${name}="${content}">`);
          } else if (
            isVisibleAttribute(node.tag, name) &&
            !marked.has(`data-i18n-${name}`)
          ) {
            checkLiteral(literal(expression), name);
          }
        }
        readCode(content);
      }
    }
    node.children.forEach((child) =>
      readVue(child, translated || marked.has('data-i18n')),
    );
  }

  function readAstro(node: AstroNode, parent?: AstroNode) {
    if (
      node.type === 'CallExpression' &&
      typeof node.callee?.name === 'string'
    ) {
      const name = node.callee.name;
      if (calls.has(name)) {
        record(
          astroLiteral(node.arguments?.[0]),
          code.slice(node.start, node.end),
        );
      } else if (name === 'i18nAttrs') {
        readCode(code.slice(node.start, node.end), true);
      }
    }

    if (
      parent?.type === 'JSXElement' ||
      parent?.type === 'JSXFragment' ||
      parent?.type === 'AstroRoot'
    ) {
      const opening = parent.openingElement;
      const marked = opening?.attributes?.some(
        (attr) => astroName(attr) === 'data-i18n',
      );
      if (!invisibleElements.has(astroName(opening)) && !marked) {
        if (node.type === 'JSXText')
          checkLiteral(astroLiteral(node), 'template text');
        if (node.type === 'JSXExpressionContainer')
          checkLiteral(astroLiteral(node.expression), 'template text');
      }
    }

    if (node.type !== 'JSXOpeningElement') return;
    const tag = astroName(node);
    const attrs = node.attributes ?? [];
    const marked = new Set(attrs.map(astroName));
    for (const attr of attrs) {
      const name = astroName(attr);
      const value = attr.value as AstroNode | undefined;
      const term = value?.expression ?? value;
      if (isKeyAttribute(name) || (tag === 'T' && name === 'k')) {
        const key =
          term?.type === 'CallExpression' && term.callee?.name === 'tl'
            ? astroLiteral(term.arguments?.[0])
            : astroLiteral(term);
        record(key, code.slice(attr.start, attr.end));
      } else if (
        isVisibleAttribute(tag, name) &&
        !marked.has(`data-i18n-${name}`)
      ) {
        checkLiteral(astroLiteral(term), name);
      }
    }
  }

  if (file.endsWith('.astro')) {
    walkAstro(parseAstro(code).ast, readAstro);
  } else if (file.endsWith('.vue')) {
    const { descriptor } = parseSfc(code, { filename: file });
    if (descriptor.script) readCode(descriptor.script.content);
    if (descriptor.scriptSetup) readCode(descriptor.scriptSetup.content);
    if (descriptor.template)
      parseTemplate(descriptor.template.content).children.forEach((node) =>
        readVue(node),
      );
  } else {
    readCode(code);
  }
  return { keys, errors };
}

export function checkCatalog(
  sources: Record<string, string>,
  content: string,
  catalogFile: string,
): string[] {
  const { entries, errors } = readCatalog(content, catalogFile);
  const used = new Set<string>();
  for (const [file, code] of Object.entries(sources)) {
    const source = readSource(code, file);
    errors.push(...source.errors);
    for (const key of source.keys) {
      used.add(key);
      if (!entries.has(key))
        errors.push(`${file}: missing translation for ${JSON.stringify(key)}`);
    }
  }
  for (const key of entries.keys()) {
    if (!used.has(key))
      errors.push(`${catalogFile}: orphan key ${JSON.stringify(key)}`);
  }
  return errors;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(astro|vue|ts)$/.test(path) && !path.endsWith('.test.ts')
      ? [path]
      : [];
  });
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const catalogFile = 'src/i18n/locales/es.json';
  try {
    const content = readFileSync(catalogFile, 'utf8');
    if (process.argv.includes('--sort')) {
      writeFileSync(catalogFile, sortCatalog(content, catalogFile));
    } else {
      const files = sourceFiles('src');
      const sources = Object.fromEntries(
        files.map((file) => [file, readFileSync(file, 'utf8')]),
      );
      const errors = checkCatalog(sources, content, catalogFile);
      if (errors.length) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
      } else {
        console.log('Spanish catalog matches the web translation keys.');
      }
    }
  } catch (error) {
    console.error(`${catalogFile}: ${String(error)}`);
    process.exitCode = 1;
  }
}
