import type { Key } from './i18n';

export const navigation = [
  { key: 'personal', href: '/personal-training' },
  { key: 'group', href: '/group-strength-training' },
  { key: 'jump', href: '/tropical-jump' },
  { key: 'online', href: '/online-coaching' },
  { key: 'schedule', href: '/schedule' },
  { key: 'pricing', href: '/pricing' },
  { key: 'about', href: '/about' },
  { key: 'contact', href: '/contact' },
] as const satisfies readonly { key: Key; href: string }[];
