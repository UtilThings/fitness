import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';

describe('parseEnv', () => {
  it('devuelve las URL válidas y omite la URL de API cuando falta', () => {
    const site = { PUBLIC_SITE_URL: 'https://example.com' };
    const api = {
      PUBLIC_API_URL: 'https://api.example.com/',
      PUBLIC_BUSINESS_KEY: ' publishable-key ',
      PUBLIC_API_TIMEOUT_MS: '7500',
    };

    expect(parseEnv({ ...site, ...api })).toEqual({
      ...site,
      PUBLIC_API_URL: 'https://api.example.com',
      PUBLIC_BUSINESS_KEY: 'publishable-key',
      PUBLIC_API_TIMEOUT_MS: 7500,
    });
    expect(parseEnv(site)).toEqual({
      ...site,
      PUBLIC_API_URL: undefined,
      PUBLIC_BUSINESS_KEY: undefined,
      PUBLIC_API_TIMEOUT_MS: 4000,
    });
  });

  it('exige una clave pública cuando la integración tiene URL', () => {
    expect(() =>
      parseEnv({
        PUBLIC_SITE_URL: 'https://site.test',
        PUBLIC_API_URL: 'https://api.test',
      }),
    ).toThrow('PUBLIC_BUSINESS_KEY');
  });

  it.each(['abc', '100', '60000', '500.5'])(
    'rechaza el timeout %s',
    (timeout) => {
      expect(() =>
        parseEnv({
          PUBLIC_SITE_URL: 'https://example.com',
          PUBLIC_API_TIMEOUT_MS: timeout,
        }),
      ).toThrow(/PUBLIC_API_TIMEOUT_MS/);
    },
  );

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
