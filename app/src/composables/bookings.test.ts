import { ClientResponseError } from 'pocketbase';
import { beforeEach, expect, it, vi } from 'vitest';
import { useBookings } from './useBookings';
import { useSessionAvailability } from './useSessionAvailability';

const mock = vi.hoisted(() => ({
  getFullList: vi.fn(),
  getList: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  send: vi.fn(),
  filter: vi.fn(),
}));
vi.mock('@/lib/pocketbase', () => ({
  pb: { ...mock, collection: () => mock },
}));
beforeEach(() => vi.resetAllMocks());

it('filters and expands the bookings by session and client', async () => {
  mock.filter.mockReturnValue('bound-filter');
  mock.getFullList.mockResolvedValue([]);
  const bookings = useBookings();
  await bookings.listBySession('class');
  expect(mock.filter).toHaveBeenLastCalledWith('session = {:session}', {
    session: 'class',
  });
  expect(mock.getFullList).toHaveBeenLastCalledWith(
    expect.objectContaining({ expand: 'client', filter: 'bound-filter' }),
  );
  await bookings.listByClient('client');
  expect(mock.filter).toHaveBeenLastCalledWith('client = {:client}', {
    client: 'client',
  });
  expect(mock.getFullList).toHaveBeenLastCalledWith(
    expect.objectContaining({
      expand: 'session,session.service',
      filter: 'bound-filter',
    }),
  );
});

it('sends the class option, notes and attendance status, and maps field errors', async () => {
  const bookings = useBookings();
  await bookings.create({
    session: 'class',
    client: 'client',
    useFreeClass: true,
  });
  expect(mock.create).toHaveBeenCalledWith(
    { session: 'class', client: 'client', use_free_class: true },
    { requestKey: null },
  );
  await bookings.cancel('booking', { overrideNote: 'Emergencia' });
  expect(mock.update).toHaveBeenLastCalledWith(
    'booking',
    { status: 'cancelled', override_note: 'Emergencia' },
    { requestKey: null },
  );
  mock.update.mockRejectedValue(
    new ClientResponseError({
      status: 400,
      response: {
        message: 'Excepción',
        data: { override_note: { message: 'Indica el motivo' } },
      },
    }),
  );
  await expect(
    bookings.markAttendance('booking', 'attended'),
  ).rejects.toMatchObject({ fields: { override_note: 'Indica el motivo' } });
  expect(mock.update).toHaveBeenLastCalledWith(
    'booking',
    { status: 'attended', override_note: undefined },
    { requestKey: null },
  );
});

it('requests the single and range availability routes and maps a failed range', async () => {
  const availability = useSessionAvailability();
  const payload = { session: 'class', spots_left: 1 };
  mock.send.mockResolvedValueOnce(payload).mockResolvedValueOnce([payload]);
  expect(await availability.get('class')).toEqual(payload);
  expect(mock.send).toHaveBeenLastCalledWith(
    '/api/admin/sessions/class/availability',
    expect.objectContaining({ method: 'GET' }),
  );
  const range = { from: '2026-11-22', to: '2026-11-23' };
  expect(await availability.list(range)).toEqual([payload]);
  expect(mock.send).toHaveBeenLastCalledWith(
    '/api/admin/sessions/availability',
    expect.objectContaining({ query: range }),
  );
  mock.send.mockRejectedValueOnce(new ClientResponseError({ status: 403 }));
  await expect(availability.list(range)).rejects.toMatchObject({ status: 403 });
});
