import { tl, translateKey } from '@/i18n';
import { PERMISSIONS } from '@/lib/permissions';
import type { Role } from '@/types/pb';

export interface NavItem {
  label: string;
  icon: string;
  to: string;
  roles?: Role[];
  placeholder?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Cada módulo retira su marcador al registrar la ruta. */
export const adminNav: NavGroup[] = [
  {
    label: tl('Analytics'),
    items: [
      { label: tl('Dashboard'), icon: 'pi pi-chart-bar', to: '/' },
      {
        label: tl('Reports'),
        icon: 'pi pi-chart-pie',
        to: '/reports',
      },
    ],
  },
  {
    label: tl('Operations'),
    items: [
      {
        label: tl('Clients'),
        icon: 'pi pi-users',
        to: '/clients',
      },
      {
        label: tl('Communications'),
        icon: 'pi pi-envelope',
        to: '/communications',
      },
      { label: tl('Online Coaching'), icon: 'pi pi-comments', to: '/coaching' },
      {
        label: tl('Classes'),
        icon: 'pi pi-calendar',
        to: '/classes',
      },
      { label: tl('Schedule'), icon: 'pi pi-calendar-clock', to: '/agenda' },
      { label: tl('Templates'), icon: 'pi pi-list', to: '/classes/templates' },
      { label: tl('Blocks'), icon: 'pi pi-ban', to: '/classes/blocks' },
      {
        label: tl('Bookings'),
        icon: 'pi pi-bookmark',
        to: '/bookings',
        placeholder: true,
      },
    ],
  },
  {
    label: tl('Catalog'),
    items: [{ label: tl('Plans'), icon: 'pi pi-tags', to: '/plans' }],
  },
  {
    label: tl('Settings'),
    items: [
      { label: tl('Services'), icon: 'pi pi-briefcase', to: '/services' },
      {
        label: tl('Audit log'),
        icon: 'pi pi-history',
        to: '/audit',
        roles: ['owner'],
      },
      {
        label: tl('Team'),
        icon: 'pi pi-id-card',
        to: '/team',
      },
      {
        label: tl('Business'),
        icon: 'pi pi-building',
        to: '/settings/business',
        roles: ['owner'],
      },
      {
        label: tl('Integration'),
        icon: 'pi pi-link',
        to: '/settings/integration',
        roles: ['owner'],
      },
      { label: tl('My profile'), icon: 'pi pi-user', to: '/settings/profile' },
    ],
  },
  {
    label: tl('Billing'),
    items: [
      {
        label: tl('Memberships'),
        icon: 'pi pi-ticket',
        to: '/memberships',
      },
      {
        label: tl('Payments'),
        icon: 'pi pi-credit-card',
        to: '/payments',
        roles: [...PERMISSIONS['payments.manage']],
      },
    ],
  },
];

export function navItems(): NavGroup[] {
  return adminNav.map((group) => ({
    ...group,
    label: translateKey(group.label),
    items: group.items.map((item) => ({
      ...item,
      label: translateKey(item.label),
    })),
  }));
}

export function visibleNav(role: Role | null): NavGroup[] {
  return navItems()
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (role !== null && item.roles.includes(role)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
