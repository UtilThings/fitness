type PublicEnv = Pick<ImportMetaEnv, 'PUBLIC_SITE_URL' | 'PUBLIC_API_URL'>;

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

  return {
    PUBLIC_SITE_URL: validateUrl(siteUrl, 'PUBLIC_SITE_URL'),
    PUBLIC_API_URL: apiUrl ? validateUrl(apiUrl, 'PUBLIC_API_URL') : undefined,
  };
}

export const env = parseEnv({
  PUBLIC_SITE_URL:
    import.meta.env.PUBLIC_SITE_URL ??
    (import.meta.env.DEV ? 'http://localhost:4321' : undefined),
  PUBLIC_API_URL: import.meta.env.PUBLIC_API_URL,
});
