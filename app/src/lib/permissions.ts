import { ROLES, type Role } from '@/types/pb';

export type Permission =
  | 'team.read'
  | 'team.manage'
  | 'profile.edit'
  | 'audit.read'
  | 'catalog.manage'
  | 'memberships.manage'
  | 'payments.manage'
  | 'coaching.programs.manage'
  | 'coaching.checkins.manage';

// Cada módulo añade aquí los permisos que expone en la interfaz.
export const PERMISSIONS: Record<Permission, readonly Role[]> = {
  'team.read': ROLES,
  'team.manage': ['owner'],
  'profile.edit': ROLES,
  'audit.read': ['owner'],
  'catalog.manage': ['owner'],
  'memberships.manage': ['owner', 'reception'],
  'payments.manage': ['owner', 'reception'],
  'coaching.programs.manage': ROLES,
  'coaching.checkins.manage': ['owner', 'coach'],
};

export function roleCan(role: Role | null, permission: Permission): boolean {
  return role !== null && PERMISSIONS[permission].includes(role);
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  'team.read': 'Consultar el equipo',
  'team.manage': 'Gestionar el equipo',
  'profile.edit': 'Editar el perfil propio',
  'audit.read': 'Consultar la auditoría',
  'catalog.manage': 'Gestionar el catálogo',
  'memberships.manage': 'Gestionar membresías',
  'payments.manage': 'Gestionar pagos',
  'coaching.programs.manage': 'Gestionar programas de coaching',
  'coaching.checkins.manage': 'Registrar check-ins de coaching',
};
