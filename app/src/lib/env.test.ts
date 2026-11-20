import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/lib/env';

describe('parseEnv', () => {
  it('acepta una URL válida', () => {
    expect(parseEnv({ VITE_POCKETBASE_URL: 'http://127.0.0.1:8090' })).toEqual({
      pocketbaseUrl: 'http://127.0.0.1:8090',
      primevueLicense: undefined,
    });
  });

  it('elimina la barra final', () => {
    expect(
      parseEnv({ VITE_POCKETBASE_URL: 'https://pb.example.com/' })
        .pocketbaseUrl,
    ).toBe('https://pb.example.com');
  });

  it('nombra la variable cuando falta', () => {
    expect(() => parseEnv({})).toThrow('VITE_POCKETBASE_URL');
    expect(() => parseEnv({ VITE_POCKETBASE_URL: '  ' })).toThrow(
      'VITE_POCKETBASE_URL',
    );
  });

  it('rechaza URLs inválidas o con otro protocolo', () => {
    expect(() => parseEnv({ VITE_POCKETBASE_URL: 'no-es-url' })).toThrow(
      'VITE_POCKETBASE_URL',
    );
    expect(() => parseEnv({ VITE_POCKETBASE_URL: 'ftp://host' })).toThrow(
      'VITE_POCKETBASE_URL',
    );
  });

  it('expone la licencia de PrimeVue solo si no está vacía', () => {
    const base = { VITE_POCKETBASE_URL: 'http://127.0.0.1:8090' };
    expect(
      parseEnv({ ...base, VITE_PRIMEVUE_LICENSE: ' abc ' }).primevueLicense,
    ).toBe('abc');
    expect(
      parseEnv({ ...base, VITE_PRIMEVUE_LICENSE: '' }).primevueLicense,
    ).toBeUndefined();
  });
});
