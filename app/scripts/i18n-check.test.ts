import { expect, it } from 'vitest';
import { checkCatalog, sortCatalog } from './i18n-check';

const catalogFile = 'es.json';
const vue = {
  'Component.vue': `<script setup>
    const label = tl("Don't wait.");
  </script>
  <template>
    <Button :label="t('Open')" />
    {{ $t('Done') }}
    <i18n-t keypath="Hello {name}" />
  </template>`,
  'routes.ts': `const routes = [{ meta: { title: 'Settings' } }];`,
};
const catalog = `{
  "Don't wait.": "No esperes.",
  "Done": "Listo",
  "Hello {name}": "Hola {name}",
  "Open": "Abrir",
  "Settings": "Configuración"
}`;

it('extracts keys from Vue scripts, templates and route metadata', () => {
  expect(checkCatalog(vue, catalog, catalogFile)).toEqual([]);
});

it.each([
  ['"Open": "Abrir",', '', /Component\.vue: missing translation for "Open"/],
  [
    '"Open": "Abrir",',
    '"Open": "Abrir", "Orphan": "Huérfana",',
    /es\.json: orphan key "Orphan"/,
  ],
  [
    '"Open": "Abrir",',
    '"Open": "Abrir", "Open": "Abierto",',
    /es\.json: duplicate key "Open"/,
  ],
  [
    '"Open": "Abrir",',
    '"Open": "Abrir", "A": "A",',
    /es\.json: out of order "A"/,
  ],
  [
    'Hola {name}',
    'Hola {client}',
    /es\.json: inconsistent interpolation variables for "Hello \{name\}"/,
  ],
])('reports file and key for broken catalogs %#', (before, after, message) => {
  expect(
    checkCatalog(vue, catalog.replace(before, after), catalogFile).join('\n'),
  ).toMatch(message);
});

it('rejects dynamic keys without a marked map', () => {
  const result = checkCatalog(
    { 'source.ts': 't(prefix + status)' },
    '{}',
    catalogFile,
  );
  expect(result).toEqual([
    'source.ts: dynamic t(prefix + status) needs a literal key or a marked key map',
  ]);
});

it('sorts keys deterministically and never silently discards duplicates', () => {
  const sorted = '{\n  "Alpha": "Alfa",\n  "Zed": "Zeta"\n}\n';
  expect(sortCatalog('{"Zed":"Zeta","Alpha":"Alfa"}', catalogFile)).toBe(
    sorted,
  );
  expect(sortCatalog(sorted, catalogFile)).toBe(sorted);
  expect(() =>
    sortCatalog('{"Alpha":"Alfa","Alpha":"Otro"}', catalogFile),
  ).toThrow('duplicate key');
});
