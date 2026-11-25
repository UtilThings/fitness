import { t } from '@/i18n';

const maxPhoneLength = 30;
const maxBioLength = 600;

export function validatePhone(phone: string): string | null {
  return phone.length <= maxPhoneLength && /^[0-9+()\-\s.]*$/.test(phone)
    ? null
    : t('Enter a valid phone number of up to {max} characters', {
        max: maxPhoneLength,
      });
}

export function validateBio(bio: string): string | null {
  return [...bio].length > maxBioLength
    ? t('Use up to {max} characters', { max: maxBioLength })
    : null;
}
