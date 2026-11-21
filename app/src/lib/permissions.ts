import { ROLES, type Role } from '@/types/pb';

export type Permission =
  'team.read' | 'team.manage' | 'profile.edit' | 'audit.read';

// Cada módulo añade aquí los permisos que expone en la interfaz.
export const PERMISSIONS: Record<Permission, readonly Role[]> = {
  'team.read': ROLES,
  'team.manage': ['owner'],
  'profile.edit': ROLES,
  'audit.read': ['owner'],
};

export function roleCan(role: Role | null, permission: Permission): boolean {
  return role !== null && PERMISSIONS[permission].includes(role);
}
