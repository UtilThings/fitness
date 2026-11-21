import type { Role } from '@/types/pb';

export const ROLE_STATUS = {
  owner: { label: 'Propietario', severity: 'info' },
  coach: { label: 'Coach', severity: 'success' },
  reception: { label: 'Recepción', severity: 'secondary' },
} as const satisfies Record<Role, { label: string; severity: string }>;

export const ACTIVE_STATUS = {
  true: { label: 'Activo', severity: 'success' },
  false: { label: 'Inactivo', severity: 'secondary' },
} as const;
