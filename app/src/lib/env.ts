export interface AppEnv {
  pocketbaseUrl: string;
  appName: string;
  /** Clave de licencia de PrimeVue 5 (opcional; sin ella PrimeVue muestra un aviso). */
  primevueLicense?: string;
}

/** Valida las variables de entorno crudas y devuelve la configuración tipada. */
export function parseEnv(raw: Partial<Record<string, unknown>>): AppEnv {
  const url = raw.VITE_POCKETBASE_URL;
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error('The VITE_POCKETBASE_URL environment variable is missing');
  }
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new Error('VITE_POCKETBASE_URL must be a valid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('VITE_POCKETBASE_URL must use HTTP or HTTPS');
  }
  const license =
    typeof raw.VITE_PRIMEVUE_LICENSE === 'string'
      ? raw.VITE_PRIMEVUE_LICENSE.trim()
      : '';
  const appName =
    typeof raw.VITE_APP_NAME === 'string' ? raw.VITE_APP_NAME.trim() : '';
  return {
    appName: appName || 'Admin',
    pocketbaseUrl: url.trim().replace(/\/+$/, ''),
    primevueLicense: license || undefined,
  };
}

export const env = parseEnv(import.meta.env);
