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
    label: 'Análisis',
    items: [
      { label: 'Dashboard', icon: 'pi pi-chart-bar', to: '/' },
      {
        label: 'Reportes',
        icon: 'pi pi-file',
        to: '/reports',
        placeholder: true,
      },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      {
        label: 'Clientes',
        icon: 'pi pi-users',
        to: '/clients',
      },
      {
        label: 'Clases',
        icon: 'pi pi-calendar',
        to: '/classes',
      },
      { label: 'Plantillas', icon: 'pi pi-list', to: '/classes/templates' },
      { label: 'Bloqueos', icon: 'pi pi-ban', to: '/classes/blocks' },
      {
        label: 'Reservas',
        icon: 'pi pi-bookmark',
        to: '/bookings',
        placeholder: true,
      },
    ],
  },
  {
    label: 'Catálogo',
    items: [{ label: 'Planes', icon: 'pi pi-tags', to: '/plans' }],
  },
  {
    label: 'Ajustes',
    items: [
      { label: 'Servicios', icon: 'pi pi-briefcase', to: '/services' },
      {
        label: 'Auditoría',
        icon: 'pi pi-history',
        to: '/audit',
        roles: ['owner'],
      },
      {
        label: 'Equipo',
        icon: 'pi pi-id-card',
        to: '/team',
      },
      { label: 'Mi perfil', icon: 'pi pi-user', to: '/settings/profile' },
    ],
  },
  {
    label: 'Facturación',
    items: [
      {
        label: 'Membresías',
        icon: 'pi pi-ticket',
        to: '/memberships',
        placeholder: true,
      },
      {
        label: 'Pagos',
        icon: 'pi pi-credit-card',
        to: '/payments',
        roles: ['owner', 'reception'],
        placeholder: true,
      },
    ],
  },
];

export function visibleNav(role: Role | null): NavGroup[] {
  return adminNav
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (role !== null && item.roles.includes(role)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
