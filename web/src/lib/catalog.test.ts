import { formatMessage, resolveText, setLocale, type Text } from '@/i18n';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CATALOG_SEED } from '../../../api/src/lib/catalog';
import { getCatalog, toPlans } from './catalog';
import * as data from './data';
import { env } from './env';

vi.mock('./env', () => ({
  env: {
    PUBLIC_API_URL: 'https://api.example.test',
    PUBLIC_BUSINESS_KEY: 'pk_fixture1_12345678901234567890123456789012',
    PUBLIC_API_TIMEOUT_MS: 500,
  },
}));

beforeEach(() => {
  env.PUBLIC_API_URL = 'https://api.example.test';
});

afterEach(async () => {
  await setLocale('en');
  localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const seededCatalog = {
  version: 2,
  business: {
    name: 'Kent Fitness',
    city: 'New York, NY',
    logo_url: '',
    currency: 'USD',
    timezone: 'America/New_York',
  },
  currency: 'USD',
  services: CATALOG_SEED.map(({ name, kind, slug, plans }) => ({
    name,
    kind,
    slug,
    plans: plans.map((plan) => ({
      name: plan.name,
      price_cents: plan.price_cents,
      billing_unit: plan.billing_unit,
      sessions: plan.sessions,
      per_week: plan.per_week,
      commitment_periods: plan.commitment_periods,
      is_first_class: plan.is_first_class,
      partner: plan.partner,
      note: plan.note,
    })),
    weekly_times: data.classTemplates
      .filter((slot) => slot.serviceSlug === slug)
      .map(({ day, time, coach, capacity }) => ({
        weekday: day,
        time,
        coach_name: coach,
        capacity,
      })),
  })),
};

const fallback = {
  source: 'static',
  business: data.fallbackBusiness,
  personalOneOnOne: data.personalOneOnOne,
  personalPartner: data.personalPartner,
  groupPlans: data.groupPlans,
  jumpPlans: data.jumpPlans,
  classTemplates: data.classTemplates,
};

it('maps the seeded plans and weekly times to the existing presentation', async () => {
  const request = vi.fn().mockResolvedValue(Response.json(seededCatalog));
  vi.stubGlobal('fetch', request);
  const catalog = await getCatalog();
  expect(catalog.source).toBe('api');
  expect(catalog.business).toEqual(seededCatalog.business);
  for (const group of [
    'personalOneOnOne',
    'personalPartner',
    'groupPlans',
    'jumpPlans',
  ] as const) {
    const render = (text: Text = '') => resolveText(text, formatMessage);
    const snapshot = (plans: data.Plan[]) =>
      plans.map(({ name, price, unit, sessions, freq, note }) => [
        render(name),
        price,
        render(unit),
        render(sessions),
        render(freq),
        render(note),
      ]);
    expect(snapshot(catalog[group])).toEqual(snapshot(fallback[group]));
  }
  expect(
    catalog.classTemplates.map(({ service, ...slot }) => ({
      ...slot,
      service: resolveText(service, formatMessage),
    })),
  ).toEqual(
    fallback.classTemplates.map(({ service, ...slot }) => ({
      ...slot,
      service: resolveText(service, formatMessage),
    })),
  );
  expect(request).toHaveBeenCalledWith(
    'https://api.example.test/api/public/catalog',
    {
      credentials: 'omit',
      headers: {
        'X-Business-Key': 'pk_fixture1_12345678901234567890123456789012',
      },
      signal: expect.any(AbortSignal),
    },
  );
});

it('treats an empty catalog as current data', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(Response.json({ ...seededCatalog, services: [] })),
  );
  await expect(getCatalog()).resolves.toEqual({
    source: 'api',
    business: seededCatalog.business,
    personalOneOnOne: [],
    personalPartner: [],
    groupPlans: [],
    jumpPlans: [],
    classTemplates: [],
  });
});

it.each([
  () => new Response('', { status: 401 }),
  () => new Response('', { status: 404 }),
  () => new Response('', { status: 500 }),
  () => new Response('{'),
  () => Response.json({ services: [] }),
  () => {
    throw new TypeError('offline');
  },
])(
  'falls back when the request cannot supply valid catalog data',
  async (response) => {
    vi.stubGlobal('fetch', vi.fn(response));
    await expect(getCatalog()).resolves.toEqual(fallback);
  },
);

it('aborts a slow download and falls back', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (_url, { signal }: RequestInit) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(signal.reason), {
            once: true,
          });
        }),
    ),
  );
  const result = getCatalog();
  await vi.advanceTimersByTimeAsync(500);
  await expect(result).resolves.toEqual(fallback);
});

it('uses local data with no API URL and makes no request', async () => {
  env.PUBLIC_API_URL = undefined;
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  await expect(getCatalog()).resolves.toEqual(fallback);
  expect(request).not.toHaveBeenCalled();
});

it('translates generated text without altering a business name or note that matches a catalog key', async () => {
  await setLocale('es');
  const service = seededCatalog.services.find(
    ({ slug }) => slug === 'group-strength',
  )!;
  const makePlan = (sessions: number) => ({
    ...service.plans[0],
    sessions,
    name: 'First Class',
    note: 'New clients only',
  });
  const plans = toPlans({
    ...service,
    plans: [makePlan(1), makePlan(8)],
  } as Parameters<typeof toPlans>[0]);
  expect(
    plans.map(({ sessions }) => resolveText(sessions, formatMessage)),
  ).toEqual(['1 clase', '8 clases']);
  expect(resolveText(plans[0].name, formatMessage)).toBe('First Class');
  expect(resolveText(plans[0].note!, formatMessage)).toBe('New clients only');
});
