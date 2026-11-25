import { t } from '@/i18n';
const maxOrigins = 10;

export function parseAllowedOrigins(text: string): string[] {
  const origins = text
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (origins.length > maxOrigins)
    throw new Error(t('Enter at most {max} origins.', { max: maxOrigins }));
  const seen = new Set<string>();
  for (const origin of origins) {
    const parts =
      /^(https?):\/\/((?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)*[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?)(?::([1-9]\d{0,4}))?$/.exec(
        origin,
      );
    if (
      origin.length > 300 ||
      !parts ||
      Number(parts[3]) > 65535 ||
      parts[3] === (parts[1] === 'https' ? '443' : '80')
    ) {
      throw new Error(
        t('Enter a valid HTTP or HTTPS origin without a path or wildcards.'),
      );
    }
    if (seen.has(origin)) throw new Error(t('Origins must be unique.'));
    seen.add(origin);
  }
  return origins;
}
