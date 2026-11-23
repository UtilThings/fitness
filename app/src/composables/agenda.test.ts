import { beforeEach, expect, it, vi } from 'vitest';
import { useCoachAgenda } from './useCoachAgenda';
import { useCoachAvailability } from './useCoachAvailability';

const mock = vi.hoisted(() => ({
  collection: vi.fn(),
  availability: {
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  sessions: { getFullList: vi.fn(), create: vi.fn() },
  filter: vi.fn(),
  send: vi.fn(),
}));
vi.mock('@/lib/pocketbase', () => ({
  pb: { collection: mock.collection, filter: mock.filter, send: mock.send },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mock.collection.mockImplementation((name) =>
    name === 'class_sessions' ? mock.sessions : mock.availability,
  );
});

it('aplica el filtro de coach y persiste cada tramo de disponibilidad', async () => {
  const api = useCoachAvailability();
  const slot = {
    coach: 'jq',
    weekday: 0,
    start_time: '09:00',
    end_time: '12:00',
  };
  mock.filter.mockReturnValue('coach-filter');
  mock.availability.getFullList.mockResolvedValue([{ id: 'slot', ...slot }]);
  await expect(api.list('jq')).resolves.toEqual([{ id: 'slot', ...slot }]);
  expect(mock.filter).toHaveBeenCalledWith('coach = {:coach}', { coach: 'jq' });
  expect(mock.availability.getFullList).toHaveBeenCalledWith({
    sort: 'weekday,start_time,id',
    filter: 'coach-filter',
    requestKey: null,
  });
  await api.create(slot);
  await api.update('slot', slot);
  await api.remove('slot');
  expect(mock.availability.create).toHaveBeenCalledWith(slot, {
    requestKey: null,
  });
  expect(mock.availability.update).toHaveBeenCalledWith('slot', slot, {
    requestKey: null,
  });
  expect(mock.availability.delete).toHaveBeenCalledWith('slot', {
    requestKey: null,
  });
});

it('carga la agenda local y expande reservas y clientes', async () => {
  mock.sessions.getFullList.mockResolvedValue([{ id: 'session' }]);
  mock.availability.getFullList.mockResolvedValue([{ id: 'slot' }]);
  await expect(
    useCoachAgenda().list('jq', '2026-11-01', '2026-11-07'),
  ).resolves.toEqual({
    sessions: [{ id: 'session' }],
    slots: [{ id: 'slot' }],
  });
  expect(mock.filter).toHaveBeenCalledWith(
    'coach = {:coach} && starts_at >= {:from} && starts_at < {:to}',
    {
      coach: 'jq',
      from: '2026-11-01 04:00:00.000Z',
      to: '2026-11-08 05:00:00.000Z',
    },
  );
  expect(mock.sessions.getFullList).toHaveBeenCalledWith(
    expect.objectContaining({
      expand: 'service,coach,bookings_via_session.client',
    }),
  );
});
