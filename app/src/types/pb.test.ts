import { expect, it } from 'vitest';
import { ROLES } from '@/types/pb';

it('defines the roles supported by the admins collection', () => {
  expect(ROLES).toEqual(['owner', 'coach', 'reception']);
});
