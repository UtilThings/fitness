import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Window } from 'happy-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  formatPrice,
  groupPlans,
  jumpPlans,
  personalOneOnOne,
  personalPartner,
} from '../../src/lib/data';

const dist = resolve('dist');
const routes = [
  ['', 'JQ Fitness — Stronger Every Day | Miramar, FL', 'Stronger every day.'],
  [
    'personal-training',
    'Personal Training | JQ Fitness Miramar',
    'Coaching built for you.',
  ],
  [
    'group-strength-training',
    'Group Strength Training | JQ Fitness',
    'Small group. Big results.',
  ],
  [
    'tropical-jump',
    'Tropical Jump Trampoline Classes | JQ Fitness',
    'Jump. Sweat. Vibe.',
  ],
  [
    'online-coaching',
    'Online Coaching Programs | JQ Fitness',
    'Coaching anywhere.',
  ],
  ['schedule', 'Class Schedule | JQ Fitness', 'Find your class.'],
  ['pricing', 'Pricing & Packages | JQ Fitness', 'Invest in stronger.'],
  [
    'about',
    'About JQ Fitness | Miramar Boutique Studio',
    'Built on community.',
  ],
  ['contact', 'Contact JQ Fitness | Miramar, FL', "Let's get started."],
  ['404.html', 'Page not found', '404'],
] as const;

const { DOMParser } = new Window({
  settings: { disableJavaScriptEvaluation: true },
});

beforeAll(() => {
  if (!existsSync(dist)) throw new Error('Ejecuta bun run build antes');
});

function builtFile(route: string) {
  return join(dist, route, route === '404.html' ? '' : 'index.html');
}

function page(route: string) {
  const html = readFileSync(builtFile(route), 'utf8');
  return { html, document: new DOMParser().parseFromString(html, 'text/html') };
}

function isFile(path: string): boolean {
  return statSync(path, { throwIfNoEntry: false })?.isFile() ?? false;
}

describe('static routes', () => {
  it.each(routes)(
    '/%s has the expected metadata, layout and links',
    (route, title, heading) => {
      const { html, document } = page(route);
      expect(document.title).toBe(title);
      const headings = [...document.querySelectorAll('h1')].map((el) =>
        el.textContent.trim(),
      );
      expect(headings).toEqual([heading]);
      const bare = route === '404.html';
      expect(Boolean(document.querySelector('header'))).toBe(!bare);
      expect(Boolean(document.querySelector('footer'))).toBe(!bare);
      if (!bare) {
        expect(
          document
            .querySelector('meta[name="description"]')
            ?.getAttribute('content')
            ?.trim(),
        ).toBeTruthy();
      }
      expect(html).not.toMatch(/lovable|gpteng/i);

      for (const element of document.querySelectorAll('[href^="/"]')) {
        const href = element.getAttribute('href')!;
        if (href.startsWith('//')) continue;
        const url = new URL(href, 'https://local.test');
        const target = join(dist, decodeURIComponent(url.pathname));
        expect(
          isFile(target) || isFile(join(target, 'index.html')),
          `Broken href ${href} in /${route}`,
        ).toBe(true);
      }
    },
  );
});

describe('shared page components in the build', () => {
  it('renders translated CTA text and its link', () => {
    const { document } = page('');
    const title = document.querySelector(
      'h2 [data-i18n="Your first class is on us."]',
    );
    expect(title?.textContent).toBe('Your first class is on us.');
    const band = title?.closest('section');
    expect(
      band?.querySelector('[data-i18n^="Try Tropical Jump"]')?.textContent,
    ).toContain('Try Tropical Jump');
    expect(band?.querySelector('a')?.getAttribute('href')).toBe('/schedule');
  });

  it('renders prices and notes, and highlights only featured plans', () => {
    const personal = page('personal-training').document;
    expect(
      personal.querySelector('main .card-surface.border-primary')?.textContent,
    ).toContain('$1,080');
    expect(
      personal.querySelector('main .card-surface li')?.textContent.trim(),
    ).toBe('8 sessions');

    const jump = page('tropical-jump').document;
    const featured = jump.querySelector('main .card-surface.border-primary');
    expect(featured?.textContent).toContain('Free');
    expect(featured?.textContent).toContain('Most popular');
    expect(featured?.textContent).toContain('One per client account.');
    expect(
      jump.querySelector('.card-surface ul.text-muted-foreground li')
        ?.textContent,
    ).toBe('• First class free — one per client account.');

    const pricing = page('pricing').document;
    expect(pricing.querySelector('main section:first-child img')).toBeNull();
    expect(
      pricing.querySelector('main .card-surface.border-primary'),
    ).toBeNull();
    expect(pricing.querySelector('main')?.textContent).not.toContain(
      'Most popular',
    );
  });
});

describe('build without PUBLIC_API_URL', () => {
  const cases = [
    [
      'pricing',
      [...personalOneOnOne, ...personalPartner, ...groupPlans, ...jumpPlans],
    ],
    ['personal-training', [...personalOneOnOne, ...personalPartner]],
    ['group-strength-training', groupPlans],
    ['tropical-jump', jumpPlans],
  ] as const;

  it.each(cases)(
    '/%s includes the fallback prices in static HTML',
    (route, plans) => {
      const cards = [
        ...page(route).document.querySelectorAll(
          'main astro-island .card-surface',
        ),
      ];
      const prices = cards.flatMap((card) => {
        const price = card.querySelector('p.text-5xl');
        return price ? [price.textContent.trim()] : [];
      });
      expect(prices).toEqual(plans.map((plan) => formatPrice(plan.price)));
    },
  );

  it('ships the schedule as a client-only island', () => {
    const island = page('schedule').document.querySelector(
      'main astro-island[client="only"]',
    );
    expect(island?.getAttribute('component-url')).toMatch(
      /ScheduleBoard\..+\.js$/,
    );
    expect(island?.querySelector('.card-surface')).toBeNull();
  });
});

describe('bilingual build', () => {
  const spanish = JSON.parse(
    readFileSync(resolve('src/i18n/locales/es.json'), 'utf8'),
  ) as Record<string, string>;

  it.each(routes)(
    '/%s keeps English HTML with translation markers',
    (route, title, heading) => {
      const { document } = page(route);
      expect(document.documentElement.lang).toBe('en');
      expect(document.title).toBe(title);
      expect(document.querySelector('title')?.hasAttribute('data-i18n')).toBe(
        true,
      );
      const mainHeading = document.querySelector(
        route === '404.html' ? 'h2' : 'h1',
      );
      expect(mainHeading?.querySelector('[data-i18n]')?.textContent).toBe(
        route === '404.html' ? 'Page not found' : heading,
      );

      const marks = Array.from(document.querySelectorAll('*')).flatMap(
        (element) =>
          Array.from(element.attributes)
            .filter(
              ({ name }) =>
                name === 'data-i18n' ||
                /^data-i18n-(alt|aria-label|placeholder|title)$/.test(name),
            )
            .map(({ value }) => value),
      );
      expect(marks.length).toBeGreaterThan(2);
      for (const key of marks)
        expect(
          key !== null && Object.hasOwn(spanish, key),
          key ?? 'Empty marker',
        ).toBe(true);
    },
  );

  it('loads the Spanish catalog through a separate, dynamically imported chunk', () => {
    const assets = join(dist, '_astro');
    const files = readdirSync(assets).filter((file) => file.endsWith('.js'));
    const catalogs = files.filter((file) => /^es\..+\.js$/.test(file));
    expect(catalogs).toHaveLength(1);

    const catalog = catalogs[0];
    const bundled = readFileSync(join(assets, catalog), 'utf8');
    expect(bundled).toContain('Reserva tu clase');
    expect(bundled).toContain('Página no encontrada');
    const entrypoints = files
      .filter((file) => file !== catalog)
      .map((file) => readFileSync(join(assets, file), 'utf8'));
    expect(
      entrypoints.some((entry) =>
        ['"', "'", '`'].some((quote) =>
          entry.includes(`import(${quote}./${catalog}${quote})`),
        ),
      ),
    ).toBe(true);
    expect(
      entrypoints.some((entry) => entry.includes('Reserva tu clase')),
    ).toBe(false);
    for (const [route] of routes) {
      expect(page(route).html).not.toContain(catalog);
    }
  });
});
