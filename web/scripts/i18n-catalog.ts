import ts from 'typescript';

function withoutLiterals(message: string) {
  return message.replace(/\{'(?:[^'\\]|\\.)*'\}/g, '');
}

function messageVariants(message: string) {
  return withoutLiterals(message).split('|');
}

function translationVariables(message: string) {
  const variables = [
    ...withoutLiterals(message).matchAll(/\{([\w$-]+)\}/g),
  ].map((match) => match[1]);
  return [...new Set(variables)].sort().join(', ');
}

export function readCatalog(content: string, file: string) {
  const errors: string[] = [];
  const entries = new Map<string, string>();
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { entries, errors: [`${file}: invalid JSON`] };
  }
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
    const english = messageVariants(key);
    const spanish = messageVariants(prop.initializer.text);
    const sameLength = english.length === spanish.length;
    if (
      translationVariables(key) !==
        translationVariables(prop.initializer.text) ||
      (sameLength &&
        english.some(
          (variant, index) =>
            translationVariables(variant) !==
            translationVariables(spanish[index]),
        ))
    ) {
      errors.push(`${file}: inconsistent interpolation variables for "${key}"`);
    }
    if (!sameLength) {
      errors.push(`${file}: inconsistent plural variants for "${key}"`);
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
