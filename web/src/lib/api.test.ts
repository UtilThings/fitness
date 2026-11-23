import { afterEach, expect, it, vi } from 'vitest';
import {
  ApiError,
  fetchSchedule,
  isPublicCatalog,
  isPublicSchedule,
} from './api';
import { readFileSync } from 'node:fs';

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

const spec = readFileSync(
  '../features/019-catalogo-publico-en-web/spec.md',
  'utf8',
);
const examples = [...spec.matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) =>
  JSON.parse(match[1]),
);

it('accepts both JSON responses in the specification', () => {
  expect(examples).toHaveLength(2);
  expect(isPublicCatalog(examples[0])).toBe(true);
  expect(isPublicSchedule(examples[1])).toBe(true);
});

it.each([{}, { ...examples[1], sessions: 'closed' }])(
  'rejects invalid schedule payloads',
  async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)));
    await expect(fetchSchedule('2026-11-19')).rejects.toBeInstanceOf(ApiError);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.example.test/api/public/schedule?week=2026-11-19',
      {
        credentials: 'omit',
        signal: expect.any(AbortSignal),
      },
    );
  },
);
