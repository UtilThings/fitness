import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const apiMessageArguments = new Map([
  ['Error', 0],
  ['RangeError', 0],
  ['ForbiddenError', 0],
  ['UnauthorizedError', 0],
  ['BadRequestError', 0],
  ['NotFoundError', 0],
  ['InternalServerError', 0],
  ['PublicQueryError', 0],
  ['ReportRangeError', 0],
  ['ApiError', 1],
  ['ValidationError', 1],
  ['fieldError', 1],
  ['bookingError', 1],
  ['membershipError', 2],
  ['scheduleAudit', 4],
  ['invalid', 1],
  ['conflict', 0],
]);
const messageMaps = new Set([
  'actionSummaries',
  'bookingSummaries',
  'eligibilityMessages',
  'messages',
]);
const messageProperties = new Set(['error', 'message', 'summary']);

export function collectApiMessages(
  sources: Record<string, string>,
  documented: ReadonlySet<string> = new Set(),
): Map<string, string> {
  const messages = new Map<string, string>();
  for (const [file, code] of Object.entries(sources)) {
    const source = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.Latest,
      true,
    );
    function readMessage(node?: ts.Node) {
      if (!node) return;
      if (ts.isStringLiteralLike(node) && node.text.trim()) {
        messages.set(node.text, file);
      } else if (ts.isConditionalExpression(node)) {
        readMessage(node.whenTrue);
        readMessage(node.whenFalse);
      }
    }

    function visit(node: ts.Node) {
      if (ts.isStringLiteralLike(node) && documented.has(node.text)) {
        readMessage(node);
      }
      if (
        (ts.isCallExpression(node) || ts.isNewExpression(node)) &&
        ts.isIdentifier(node.expression)
      ) {
        const index = apiMessageArguments.get(node.expression.text);
        if (index !== undefined) readMessage(node.arguments?.[index]);
      }
      if (ts.isPropertyAssignment(node)) {
        const name = ts.isIdentifier(node.name) ? node.name.text : '';
        if (messageProperties.has(name)) readMessage(node.initializer);
        if (
          ts.isObjectLiteralExpression(node.parent) &&
          ts.isVariableDeclaration(node.parent.parent) &&
          ts.isIdentifier(node.parent.parent.name) &&
          messageMaps.has(node.parent.parent.name.text)
        ) {
          readMessage(node.initializer);
        }
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
        (ts.isElementAccessExpression(node.left) ||
          ts.isPropertyAccessExpression(node.left)) &&
        ts.isIdentifier(node.left.expression) &&
        node.left.expression.text === 'errors'
      ) {
        readMessage(node.right);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return messages;
}

export function readApiMessages(): Map<string, string> {
  const root = resolve('../api/src');
  const inventory = readFileSync('../docs/i18n.md', 'utf8');
  const documented = new Set(
    inventory
      .split('\n')
      .filter(
        (line) => line.startsWith('| `hooks/') || line.startsWith('| `lib/'),
      )
      .map((line) => line.split(' | ')[2]),
  );

  const sources: Record<string, string> = {};
  for (const directory of ['hooks', 'lib']) {
    for (const name of readdirSync(join(root, directory), {
      recursive: true,
      encoding: 'utf8',
    })) {
      if (
        !name.endsWith('.ts') ||
        name.endsWith('.test.ts') ||
        name.endsWith('.d.ts')
      )
        continue;
      const path = join(directory, name);
      sources[`api/src/${path}`] = readFileSync(join(root, path), 'utf8');
    }
  }
  return collectApiMessages(sources, documented);
}
