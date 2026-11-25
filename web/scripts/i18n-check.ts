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
const heritageFiles = new Set([
  'src/lib/i18n.ts',
  'src/components/T.astro',
  'src/components/Header.vue',
  'src/components/Footer.astro',
  'src/components/CtaBand.astro',
  'src/components/ScheduleBoard.vue',
  'src/pages/index.astro',
  'src/pages/schedule.astro',
]);

interface AstroNode {
  type: string;
  start?: number;
  end?: number;
  name?: string | AstroNode;
  value?: unknown;
  callee?: AstroNode;
  openingElement?: AstroNode;
  context?: AstroNode;
  expression?: AstroNode;
  arguments?: AstroNode[];
}

function walkAstro(value: unknown, visit: (node: AstroNode) => void) {
  if (Array.isArray(value)) {
    value.forEach((child) => walkAstro(child, visit));
  } else if (value && typeof value === 'object') {
    if ('type' in value && typeof value.type === 'string')
      visit(value as AstroNode);
    Object.values(value).forEach((child) => walkAstro(child, visit));
  }
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

  function readVue(node: TemplateChildNode) {
    if (
      node.type === NodeTypes.INTERPOLATION &&
      node.content.type === NodeTypes.SIMPLE_EXPRESSION
    ) {
      readCode(node.content.content);
    }
    if (node.type !== NodeTypes.ELEMENT) return;
    for (const prop of node.props) {
      if (
        prop.type === NodeTypes.ATTRIBUTE &&
        (isKeyAttribute(prop.name) || (node.tag === 'T' && prop.name === 'k'))
      ) {
        record(prop.value?.content, `<${node.tag} ${prop.name}>`);
      } else if (
        prop.type === NodeTypes.DIRECTIVE &&
        prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION
      ) {
        if (
          prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
          prop.arg.isStatic &&
          (isKeyAttribute(prop.arg.content) ||
            (node.tag === 'T' && prop.arg.content === 'k'))
        ) {
          const value = ts.createSourceFile(
            file,
            prop.exp.content,
            ts.ScriptTarget.Latest,
          ).statements[0];
          record(
            value && ts.isExpressionStatement(value)
              ? literal(value.expression)
              : undefined,
            `<${node.tag} :${prop.arg.content}="${prop.exp.content}">`,
          );
        }
        readCode(prop.exp.content);
      }
    }
    node.children.forEach(readVue);
  }

  if (file.endsWith('.astro')) {
    const { ast } = parseAstro(code);
    walkAstro(ast, (node) => {
      if (
        node.type === 'CallExpression' &&
        typeof node.callee?.name === 'string'
      ) {
        const name = node.callee.name;
        const argument = node.arguments?.[0];
        if (calls.has(name)) {
          record(
            typeof argument?.value === 'string' ? argument.value : undefined,
            code.slice(node.start, node.end),
          );
        } else if (name === 'i18nAttrs') {
          readCode(code.slice(node.start, node.end), true);
        }
      }
      if (node.type !== 'JSXOpeningElement' || typeof node.name !== 'object')
        return;
      const tag = node.name.name;
      for (const attr of ('attributes' in node
        ? node.attributes
        : []) as AstroNode[]) {
        if (
          attr.type !== 'JSXAttribute' ||
          typeof attr.name !== 'object' ||
          typeof attr.name.name !== 'string'
        )
          continue;
        const name = attr.name.name;
        if (!isKeyAttribute(name) && !(tag === 'T' && name === 'k')) continue;
        const value = attr.value as AstroNode | undefined;
        const term = value?.expression ?? value;
        record(
          typeof term?.value === 'string' ? term.value : undefined,
          code.slice(attr.start, attr.end),
        );
      }
    });
  } else if (file.endsWith('.vue')) {
    const { descriptor } = parseSfc(code, { filename: file });
    if (descriptor.script) readCode(descriptor.script.content);
    if (descriptor.scriptSetup) readCode(descriptor.scriptSetup.content);
    if (descriptor.template)
      parseTemplate(descriptor.template.content).children.forEach(readVue);
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
      // Until task 004 replaces the old consumers, their English dictionary defines the keys.
      const legacy = sources['src/lib/i18n.ts'];
      if (legacy) {
        for (const path of heritageFiles) delete sources[path];
        const english = legacy.match(/const en = \{([\s\S]*?)\n\};/)?.[1] ?? '';
        sources['src/lib/i18n.ts'] = [
          ...english.matchAll(/:\s*('(?:[^'\\]|\\.)*')/g),
        ]
          .map(([, key]) => `tl(${key});`)
          .join('\n');
      }
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
