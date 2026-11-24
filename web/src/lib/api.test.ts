import { afterEach, expect, it, vi } from 'vitest';
import { ApiError, fetchSchedule } from './api';

vi.mock('./env', () => ({
  env: {
    PUBLIC_API_URL: 'https://api.example.test',
    PUBLIC_BUSINESS_KEY: 'pk_fixture1_12345678901234567890123456789012',
    PUBLIC_API_TIMEOUT_MS: 4000,
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it.each([
  {},
  {
    version: 2,
    business: {
      name: 'Kent Fitness',
      city: 'New York, NY',
      logo_url: '',
      currency: 'USD',
      timezone: 'America/New_York',
    },
    timezone: 'America/New_York',
    week_start: '2026-11-15',
    week_end: '2026-11-21',
    sessions: 'closed',
  },
])('rejects invalid schedule payloads', async (body) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));
  await expect(fetchSchedule('2026-11-19')).rejects.toBeInstanceOf(ApiError);
  expect(fetch).toHaveBeenCalledWith(
    'https://api.example.test/api/public/schedule?week=2026-11-19',
    {
      credentials: 'omit',
      headers: {
        'X-Business-Key': 'pk_fixture1_12345678901234567890123456789012',
      },
      signal: expect.any(AbortSignal),
    },
  );
});
