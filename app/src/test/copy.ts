import { expect } from 'vitest';
import spanish from '@/i18n/locales/es.json';

const normalize = (copy: string) => copy.trim().replace(/\s+/g, ' ');
const english = new Set(
  Object.keys(spanish).map((key) => normalize(key.replaceAll("{''}", ''))),
);
const spanishCopy = new Set(
  Object.values(spanish)
    .filter((value) => !/[{}|]/.test(value))
    .map(normalize)
    .filter((value) => !english.has(value)),
);

export function expectEnglishCopy(root: Element) {
  const copy: string[] = [];
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
  );
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    copy.push(node.textContent ?? '');
  }
  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const attribute of ['aria-label', 'alt', 'placeholder', 'title']) {
      const value = element.getAttribute(attribute);
      if (value) copy.push(value);
    }
  }

  expect([
    ...new Set(copy.map(normalize).filter((text) => spanishCopy.has(text))),
  ]).toEqual([]);
}
