import { ClientResponseError } from 'pocketbase';
import { afterEach, expect, it, vi } from 'vitest';
import { useSchedule } from './useSchedule';

const pb = vi.hoisted(() => ({
  collection: vi.fn(),
  filter: vi.fn(),
  send: vi.fn(),
  getFullList: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/pocketbase', () => ({ pb }));

afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

it('uses a half-open local week in UTC and expands its relations', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-10T16:00:00Z'));
  pb.collection.mockReturnValue(pb);
  pb.filter.mockReturnValue('utc filter');
  pb.getFullList.mockResolvedValue([{ id: 'session' }]);
  const schedule = useSchedule();
  await schedule.loadWeek(-1);
  expect(pb.filter).toHaveBeenCalledWith(
    'starts_at >= {:from} && starts_at < {:to}',
    {
      from: '2026-11-01 04:00:00.000Z',
      to: '2026-11-08 05:00:00.000Z',
    },
  );
  expect(pb.getFullList).toHaveBeenCalledWith(
    expect.objectContaining({
      filter: 'utc filter',
      expand: 'service,coach',
    }),
  );
  expect(schedule.sessions.value).toEqual([{ id: 'session' }]);
  expect(schedule.loading.value).toBe(false);
});

it('maps route validation errors to fields and writes the contract body', async () => {
  pb.collection.mockReturnValue(pb);
  pb.send.mockRejectedValue(
    new ClientResponseError({
      status: 400,
      response: {
        message: 'Revisa el motivo',
        data: { reason: { message: 'Es obligatorio' } },
      },
    }),
  );
  await expect(useSchedule().cancelSession('slot', '')).rejects.toMatchObject({
    fields: { reason: 'Es obligatorio' },
  });
  expect(pb.send).toHaveBeenCalledWith('/api/admin/sessions/slot/cancel', {
    method: 'POST',
    requestKey: null,
    body: { reason: '' },
  });
});
