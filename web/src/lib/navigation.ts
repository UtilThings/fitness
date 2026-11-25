import { tl, type MessageKey } from '@/i18n';

interface NavItem {
  key: MessageKey;
  headerKey?: MessageKey;
  href: string;
}

export const navigation: readonly NavItem[] = [
  {
    key: tl('Personal Training'),
    headerKey: tl("Personal Training{''}"),
    href: '/personal-training',
  },
  {
    key: tl('Group Strength'),
    headerKey: tl("Group Strength{''}"),
    href: '/group-strength-training',
  },
  { key: tl('Tropical Jump'), href: '/tropical-jump' },
  {
    key: tl('Online Coaching'),
    headerKey: tl("Online Coaching{''}"),
    href: '/online-coaching',
  },
  { key: tl('Schedule'), href: '/schedule' },
  { key: tl('Pricing'), href: '/pricing' },
  { key: tl('About'), href: '/about' },
  { key: tl('Contact'), href: '/contact' },
];
