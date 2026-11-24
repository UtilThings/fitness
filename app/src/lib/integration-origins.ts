export function parseAllowedOrigins(text: string): string[] {
  const origins = text
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (origins.length > 10) throw new Error('Ingresa un máximo de 10 orígenes.');
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
        'Ingresa un origen HTTP o HTTPS válido, sin ruta ni comodines.',
      );
    }
    if (seen.has(origin)) throw new Error('Los orígenes no pueden repetirse.');
    seen.add(origin);
  }
  return origins;
}
