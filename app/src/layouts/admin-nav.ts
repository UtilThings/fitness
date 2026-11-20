export interface NavItem {
  label: string;
  icon: string;
  to: string;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Navegación del panel de administración (marcadores de posición). */
export const adminNav: NavGroup[] = [
  {
    label: 'Análisis',
    items: [
      { label: 'Dashboard', icon: 'pi pi-chart-bar', to: '/' },
      { label: 'Reportes', icon: 'pi pi-file', to: '/reports' },
    ],
  },
  {
    label: 'Operaciones',
    items: [
      { label: 'Clientes', icon: 'pi pi-users', to: '/clients', badge: '12' },
      { label: 'Clases', icon: 'pi pi-calendar', to: '/classes', badge: '70' },
      { label: 'Rutinas', icon: 'pi pi-bolt', to: '/routines' },
    ],
  },
  {
    label: 'Ajustes',
    items: [
      { label: 'Equipo', icon: 'pi pi-id-card', to: '/team' },
      { label: 'Planes', icon: 'pi pi-tags', to: '/plans' },
    ],
  },
  {
    label: 'Facturación',
    items: [
      { label: 'Pagos', icon: 'pi pi-credit-card', to: '/payments' },
      { label: 'Suscripciones', icon: 'pi pi-star', to: '/subscriptions' },
    ],
  },
];
