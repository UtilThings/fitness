import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CATALOG_SEED } from '../../../api/src/lib/catalog';
import { getCatalog } from './catalog';
import * as data from './data';
import { env } from './env';

vi.mock('./env', () => ({
  env: {
    PUBLIC_API_URL: 'https://api.example.test',
    PUBLIC_API_TIMEOUT_MS: 500,
  },
}));

beforeEach(() => {
  env.PUBLIC_API_URL = 'https://api.example.test';
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function time24(time: string) {
  const [clock, period] = time.split(' ');
  const [hour, minute] = clock.split(':');
  return `${String((Number(hour) % 12) + (period === 'PM' ? 12 : 0)).padStart(2, '0')}:${minute}`;
}

const seededCatalog = {
  version: 1,
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
      .filter(
        (slot) =>
          (slot.service === 'Group Strength'
            ? 'group-strength'
            : 'tropical-jump') === slug,
      )
      .map(({ day, time, coach, capacity }) => ({
        weekday: day,
        time: time24(time),
        coach_name: coach,
        capacity,
      })),
  })),
};

const fallback = {
  source: 'static',
  personalOneOnOne: data.personalOneOnOne,
  personalPartner: data.personalPartner,
  groupPlans: data.groupPlans,
  jumpPlans: data.jumpPlans,
  classTemplates: data.classTemplates,
};

it('maps the seeded plans and weekly times to the existing presentation', async () => {
  const request = vi.fn().mockResolvedValue(Response.json(seededCatalog));
  vi.stubGlobal('fetch', request);
  await expect(getCatalog()).resolves.toEqual({ ...fallback, source: 'api' });
  expect(request).toHaveBeenCalledWith(
    'https://api.example.test/api/public/catalog',
    {
      credentials: 'omit',
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
    personalOneOnOne: [],
    personalPartner: [],
    groupPlans: [],
    jumpPlans: [],
    classTemplates: [],
  });
});

it.each([
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
