// 64 characters give each character the same probability when mapping a random byte.
const alphabet =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';

export function generatePassword(length = 12): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function validatePassword(text: string): string | null {
  return [...text].length < 8 ? 'Usa al menos 8 caracteres' : null;
}
