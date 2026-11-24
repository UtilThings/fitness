type PublicEnv = Pick<
  ImportMetaEnv,
  'PUBLIC_SITE_URL' | 'PUBLIC_API_URL' | 'PUBLIC_API_TIMEOUT_MS'
>;

function validateUrl(value: string, name: keyof PublicEnv): string {
  if (!URL.canParse(value)) {
    throw new Error(`${name} debe ser una URL absoluta válida.`);
  }

  return value;
}

export function parseEnv(raw: PublicEnv) {
  const siteUrl = raw.PUBLIC_SITE_URL?.trim();
  if (!siteUrl) {
    throw new Error('PUBLIC_SITE_URL es obligatoria. Configúrala en web/.env.');
  }

  const apiUrl = raw.PUBLIC_API_URL?.trim();
  const timeout = raw.PUBLIC_API_TIMEOUT_MS?.trim();
  const timeoutMs = Number(timeout || '4000');
  if (
    (timeout && !/^\d+$/.test(timeout)) ||
    timeoutMs < 500 ||
    timeoutMs > 15000
  ) {
    throw new Error(
      'PUBLIC_API_TIMEOUT_MS debe ser un entero entre 500 y 15000.',
    );
  }
  if (apiUrl && !/^https?:\/\//i.test(apiUrl)) {
    throw new Error('PUBLIC_API_URL debe ser una URL absoluta HTTP o HTTPS.');
  }

  return {
    PUBLIC_SITE_URL: validateUrl(siteUrl, 'PUBLIC_SITE_URL'),
    PUBLIC_API_URL: apiUrl
      ? validateUrl(apiUrl, 'PUBLIC_API_URL').replace(/\/+$/, '')
      : undefined,
    PUBLIC_API_TIMEOUT_MS: timeoutMs,
  };
}

export const env = parseEnv({
  PUBLIC_SITE_URL:
    import.meta.env.PUBLIC_SITE_URL ??
    (import.meta.env.DEV ? 'http://localhost:4321' : undefined),
  PUBLIC_API_URL: import.meta.env.PUBLIC_API_URL,
  PUBLIC_API_TIMEOUT_MS: import.meta.env.PUBLIC_API_TIMEOUT_MS,
});
