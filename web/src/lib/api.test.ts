import { afterEach, expect, it, vi } from 'vitest';
import { ApiError, fetchSchedule } from './api';

vi.mock('./env', () => ({
  env: {
    PUBLIC_API_URL: 'https://api.example.test',
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
    version: 1,
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
      signal: expect.any(AbortSignal),
    },
  );
});
