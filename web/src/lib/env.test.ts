import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';

describe('parseEnv', () => {
  it('devuelve las URL válidas y omite la URL de API cuando falta', () => {
    const site = { PUBLIC_SITE_URL: 'https://example.com' };
    const api = { PUBLIC_API_URL: 'https://api.example.com' };

    expect(parseEnv({ ...site, ...api })).toEqual({ ...site, ...api });
    expect(parseEnv(site)).toEqual({ ...site, PUBLIC_API_URL: undefined });
  });

  it('nombra PUBLIC_SITE_URL cuando falta', () => {
    expect(() => parseEnv({})).toThrow(/PUBLIC_SITE_URL/);
  });

  it('nombra PUBLIC_SITE_URL cuando no es una URL válida', () => {
    expect(() =>
      parseEnv({ PUBLIC_SITE_URL: 'ejemplo sin protocolo' }),
    ).toThrow(/PUBLIC_SITE_URL/);
  });

  it('nombra PUBLIC_API_URL cuando no es una URL válida', () => {
    expect(() =>
      parseEnv({
        PUBLIC_SITE_URL: 'https://example.com',
        PUBLIC_API_URL: '/api',
      }),
    ).toThrow(/PUBLIC_API_URL/);
  });
});
