import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { isPublicCatalog, isPublicSchedule } from './api';

const spec = readFileSync(
  '../features/020-multi-tenancy-business/spec.md',
  'utf8',
);
const examples = [...spec.matchAll(/```json\n([\s\S]*?)\n```/g)].map(
  (match): unknown => JSON.parse(match[1]),
);

function checkFields(
  value: unknown,
  path: string,
  rejected: (reason: string) => void,
) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      checkFields(item, `${path}[${index}]`, rejected),
    );
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  const record = value as Record<string, unknown>;
  record.extra_field = true;
  rejected(`${path} contains an extra field`);
  delete record.extra_field;

  for (const [key, original] of Object.entries(record)) {
    const field = `${path}.${key}`;
    delete record[key];
    rejected(`${field} is missing`);
    record[key] = null;
    rejected(`${field} has the wrong type`);
    record[key] = original;
    checkFields(original, field, rejected);
  }
}

it.each([
  ['catalog', isPublicCatalog, examples[0]],
  ['schedule', isPublicSchedule, examples[1]],
] as const)(
  'enforces the exact %s contract from spec.md',
  (name, validate, example) => {
    expect(examples).toHaveLength(2);
    expect(validate(example)).toBe(true);
    checkFields(example, name, (reason) =>
      expect(validate(example), reason).toBe(false),
    );
    expect(validate(example)).toBe(true);
  },
);
