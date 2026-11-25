import { tl, translateKey } from '@/i18n';
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

const permissionKeys: Record<Permission, string> = {
  'team.read': tl('View the team'),
  'team.manage': tl('Manage the team'),
  'profile.edit': tl('Edit your own profile'),
  'audit.read': tl('View the audit log'),
  'catalog.manage': tl('Manage the catalog'),
  'memberships.manage': tl('Manage memberships'),
  'payments.manage': tl('Manage payments'),
  'coaching.programs.manage': tl('Manage coaching programs'),
  'coaching.checkins.manage': tl('Record coaching check-ins'),
};

export function permissionLabel(permission: Permission) {
  return translateKey(permissionKeys[permission]);
}
