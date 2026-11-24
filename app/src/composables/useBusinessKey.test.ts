import { expect, it, vi } from 'vitest';
import { useBusinessKey } from './useBusinessKey';

const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@/lib/pocketbase', () => ({ pb: { send: mocks.send } }));

it('rotates through the authenticated endpoint', async () => {
  const key = {
    key: 'pk_test',
    prefix: 'test',
    rotated_at: '2026-11-24T00:00:00Z',
  };
  mocks.send.mockResolvedValue(key);
  expect(await useBusinessKey().rotate()).toEqual(key);
  expect(mocks.send).toHaveBeenCalledWith('/api/admin/business/public-key', {
    method: 'POST',
    requestKey: null,
  });
});
