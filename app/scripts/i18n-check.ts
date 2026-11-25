import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NodeTypes,
  parse as parseTemplate,
  type TemplateChildNode,
} from '@vue/compiler-dom';
import { parse as parseSfc } from 'vue/compiler-sfc';
import ts from 'typescript';

const calls = new Set(['t', '$t', 'te', 'tl']);

type Keys = Map<string, string>;

function translationVariables(message: string): string {
  const withoutLiterals = message.replace(/\{'(?:[^'\\]|\\.)*'\}/g, '');
  const variables = [...withoutLiterals.matchAll(/\{([\w$-]+)\}/g)].map(
    (match) => match[1],
  );
  return [...new Set(variables)].sort().join(', ');
}

function readSource(code: string, file: string) {
  const keys: Keys = new Map();
  const errors: string[] = [];

  function readCode(content: string) {
    const source = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const name = ts.isIdentifier(node.expression)
          ? node.expression.text
          : undefined;
        if (name && calls.has(name)) {
          const [argument] = node.arguments;
          if (argument && ts.isStringLiteralLike(argument))
            keys.set(argument.text, file);
          else if (file !== 'src/i18n/index.ts') {
            errors.push(
              `${file}: dynamic ${name}(${argument?.getText(source) ?? ''}) needs a literal key or a marked key map`,
            );
          }
        }
      }
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'meta' &&
        ts.isObjectLiteralExpression(node.initializer)
      ) {
        for (const prop of node.initializer.properties) {
          if (
            ts.isPropertyAssignment(prop) &&
            ts.isIdentifier(prop.name) &&
            prop.name.text === 'title' &&
            ts.isStringLiteralLike(prop.initializer)
          ) {
            keys.set(prop.initializer.text, file);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }

  function readTemplate(node: TemplateChildNode) {
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
        prop.name === 'keypath' &&
        prop.value
      ) {
        keys.set(prop.value.content, file);
      } else if (
        prop.type === NodeTypes.DIRECTIVE &&
        prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION
      ) {
        readCode(prop.exp.content);
      }
    }
    node.children.forEach(readTemplate);
  }

  if (file.endsWith('.vue')) {
    const { descriptor } = parseSfc(code, { filename: file });
    if (descriptor.script) readCode(descriptor.script.content);
    if (descriptor.scriptSetup) readCode(descriptor.scriptSetup.content);
    if (descriptor.template)
      parseTemplate(descriptor.template.content).children.forEach(readTemplate);
  } else readCode(code);
  return { keys, errors };
}

function readCatalog(content: string, file: string) {
  const errors: string[] = [];
  const entries = new Map<string, string>();
  const parsed: unknown = JSON.parse(content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { entries, errors: [`${file}: expected a flat JSON object`] };
  }
  const source = ts.parseJsonText(file, content);
  const statement = source.statements[0];
  const expression =
    statement && ts.isExpressionStatement(statement)
      ? statement.expression
      : undefined;
  if (!expression || !ts.isObjectLiteralExpression(expression)) {
    return { entries, errors: [`${file}: expected a flat JSON object`] };
  }

  let previous: string | undefined;
  for (const prop of expression.properties) {
    if (!ts.isPropertyAssignment(prop) || !ts.isStringLiteral(prop.name))
      continue;
    const key = prop.name.text;
    if (entries.has(key)) errors.push(`${file}: duplicate key "${key}"`);
    if (previous !== undefined && previous > key)
      errors.push(`${file}: out of order "${key}"`);
    previous = key;
    if (
      !ts.isStringLiteral(prop.initializer) ||
      !prop.initializer.text.trim()
    ) {
      errors.push(`${file}: expected a nonempty string for "${key}"`);
      continue;
    }
    entries.set(key, prop.initializer.text);
    if (
      translationVariables(key) !== translationVariables(prop.initializer.text)
    ) {
      errors.push(`${file}: inconsistent interpolation variables for "${key}"`);
    }
  }

  return { entries, errors };
}

export function sortCatalog(content: string, file: string): string {
  const { entries, errors } = readCatalog(content, file);
  const invalid = errors.filter(
    (error) => !error.startsWith(`${file}: out of order `),
  );
  if (invalid.length) throw new Error(invalid.join('\n'));
  const lines = [...entries.keys()]
    .sort()
    .map(
      (key) => `  ${JSON.stringify(key)}: ${JSON.stringify(entries.get(key))}`,
    );
  return lines.length ? `{\n${lines.join(',\n')}\n}\n` : '{}\n';
}

export function checkCatalog(
  sources: Record<string, string>,
  catalog: string,
  catalogFile: string,
): string[] {
  const { entries, errors } = readCatalog(catalog, catalogFile);
  const used: Keys = new Map();
  for (const [file, code] of Object.entries(sources)) {
    const source = readSource(code, file);
    errors.push(...source.errors);
    for (const [key, path] of source.keys) {
      used.set(key, path);
      if (!entries.has(key))
        errors.push(`${path}: missing translation for "${key}"`);
    }
  }
  for (const key of entries.keys()) {
    if (!used.has(key)) errors.push(`${catalogFile}: orphan key "${key}"`);
  }
  return errors;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return path === 'src/test' ? [] : sourceFiles(path);
    return /\.(vue|ts)$/.test(path) && !path.endsWith('.test.ts') ? [path] : [];
  });
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const catalogFile = 'src/i18n/locales/es.json';
  const catalog = readFileSync(catalogFile, 'utf8');
  try {
    if (process.argv.includes('--sort')) {
      writeFileSync(catalogFile, sortCatalog(catalog, catalogFile));
    } else {
      const sources = Object.fromEntries(
        sourceFiles('src').map((file) => [file, readFileSync(file, 'utf8')]),
      );
      const errors = checkCatalog(sources, catalog, catalogFile);
      if (errors.length) {
        console.error(errors.join('\n'));
        process.exitCode = 1;
      } else console.log('Spanish catalog matches the admin translation keys.');
    }
  } catch (error) {
    console.error(`${catalogFile}: ${String(error)}`);
    process.exitCode = 1;
  }
}
