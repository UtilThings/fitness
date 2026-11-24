import { pb } from '@/lib/pocketbase';

type RotatedKey = { key: string; prefix: string; rotated_at: string };

export function useBusinessKey() {
  function rotate() {
    return pb.send<RotatedKey>('/api/admin/business/public-key', {
      method: 'POST',
      requestKey: null,
    });
  }

  return { rotate };
}
