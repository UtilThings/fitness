import { describe, expect, it } from 'vitest';
import { checkCatalog } from './i18n-check';
import { sortCatalog } from './i18n-catalog';

const file = 'es.json';

describe('i18n catalog checker', () => {
  it('extracts keys from TypeScript, Vue and Astro, including nested expressions', () => {
    const sources = {
      'src/keys.ts': "t('A'); te('B'); tl(`C`);",
      'src/Test.vue': `<script setup>const term = tl('D')</script>
        <template><span :aria-label="t('E')">{{ $t('F') }}</span><i18n-t keypath="G" /></template>`,
      'src/page.astro': `---
        const label = t('H');
        ---
        <title data-i18n="I">Title</title>
        {[1].map(() => <T k="J" />)}
        <div {...i18nAttrs({ alt: 'K', title: { key: 'L', params: {} } })} data-i18n-aria-label="M" data-i18n-params="{}" />`,
    };
    const catalog = Object.fromEntries(
      Array.from('ABCDEFGHIJKLM', (key) => [key, 'Sí']),
    );
    expect(checkCatalog(sources, JSON.stringify(catalog), file)).toEqual([]);
  });

  it('reports missing and orphan keys with their paths', () => {
    expect(
      checkCatalog(
        { 'src/a.ts': 't("Missing");' },
        '{"Orphan":"Huérfana"}',
        file,
      ),
    ).toEqual([
      'src/a.ts: missing translation for "Missing"',
      'es.json: orphan key "Orphan"',
    ]);
  });

  it('reports duplicate, unsorted and malformed catalog entries', () => {
    const errors = checkCatalog(
      { 'src/a.ts': 't("Z"); t("A");' },
      '{"Z":"","A":"a","A":"a"}',
      file,
    );
    expect(errors).toContain('es.json: expected a nonempty string for "Z"');
    expect(errors).toContain('es.json: out of order "A"');
    expect(errors).toContain('es.json: duplicate key "A"');
    expect(checkCatalog({}, '{', file)).toEqual(['es.json: invalid JSON']);
  });

  it('checks variable names and plural counts while allowing escaped syntax', () => {
    const key = "{count} class {'|'} {name} | {count} classes";
    const errors = checkCatalog(
      { 'src/a.ts': `tl(${JSON.stringify(key)});` },
      JSON.stringify({ [key]: '{total} clases' }),
      file,
    );
    expect(errors).toEqual([
      `es.json: inconsistent interpolation variables for "${key}"`,
      `es.json: inconsistent plural variants for "${key}"`,
    ]);
  });

  it('rejects dynamic translation arguments', () => {
    const errors = checkCatalog(
      {
        'src/a.ts': 't(key); tl(`Hello ${name}`);',
        'src/a.astro': '<T k={key} /><img {...i18nAttrs({ alt: imageAlt })} />',
      },
      '{}',
      file,
    );
    expect(errors).toEqual([
      'src/a.ts: t(key) requires a literal key',
      'src/a.ts: tl(`Hello ${name}`) requires a literal key',
      'src/a.astro: k={key} requires a literal key',
      'src/a.astro: i18nAttrs(alt: imageAlt) requires a literal key',
    ]);
  });

  it('sorts idempotently and fails rather than deleting duplicate entries', () => {
    const sorted = sortCatalog('{"Z":"z","A":"a"}', file);
    expect(sorted).toBe('{\n  "A": "a",\n  "Z": "z"\n}\n');
    expect(sortCatalog(sorted, file)).toBe(sorted);
    expect(() => sortCatalog('{"A":"a","A":"b"}', file)).toThrow(
      'duplicate key',
    );
  });
});
