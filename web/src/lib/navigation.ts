import { tl, type MessageKey } from '@/i18n';

export const navigation = [
  { key: tl('Personal Training'), href: '/personal-training' },
  { key: tl('Group Strength'), href: '/group-strength-training' },
  { key: tl('Tropical Jump'), href: '/tropical-jump' },
  { key: tl('Online Coaching'), href: '/online-coaching' },
  { key: tl('Schedule'), href: '/schedule' },
  { key: tl('Pricing'), href: '/pricing' },
  { key: tl('About'), href: '/about' },
  { key: tl('Contact'), href: '/contact' },
] as const satisfies readonly { key: MessageKey; href: string }[];
