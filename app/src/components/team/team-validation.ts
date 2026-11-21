export function validatePhone(phone: string): string | null {
  return /^[0-9+()\-\s.]{0,30}$/.test(phone)
    ? null
    : 'Ingresa un teléfono válido de hasta 30 caracteres';
}

export function validateBio(bio: string): string | null {
  return [...bio].length > 600 ? 'Usa hasta 600 caracteres' : null;
}
