import { expect, it } from 'vitest';
import { roleCan, type Permission } from './permissions';
import type { Role } from '@/types/pb';

const permissions: Permission[] = [
  'team.read',
  'team.manage',
  'profile.edit',
  'audit.read',
];

it.each<[Role | null, boolean[]]>([
  ['owner', [true, true, true, true]],
  ['coach', [true, false, true, false]],
  ['reception', [true, false, true, false]],
  [null, [false, false, false, false]],
])('applies the matrix for %s', (role, expected) => {
  expect(permissions.map((permission) => roleCan(role, permission))).toEqual(
    expected,
  );
});
