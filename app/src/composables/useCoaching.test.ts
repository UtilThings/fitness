import { beforeEach, expect, it, vi } from 'vitest';
import { programFlags, type CoachingProgram } from '@/lib/coaching';
import { useCoaching } from './useCoaching';

const mocks = vi.hoisted(() => ({
  programs: {
    getFullList: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  checkins: { getFullList: vi.fn(), create: vi.fn() },
  memberships: { getFullList: vi.fn() },
}));

vi.mock('@/lib/pocketbase', async () => {
  const { default: PocketBase } = await import('pocketbase');
  const client = new PocketBase('http://localhost');
  return {
    pb: {
      filter: client.filter.bind(client),
      collection: (name: string) =>
        name === 'coaching_programs'
          ? mocks.programs
          : name === 'memberships'
            ? mocks.memberships
            : mocks.checkins,
    },
  };
});
vi.mock('@/lib/datetime', () => ({ todayLocal: () => '2026-03-01' }));

const program: CoachingProgram = {
  id: 'remote',
  client: 'ana',
  coach: 'coach1',
  membership: 'membership1',
  status: 'active',
  starts_on: '2026-01-05 00:00:00.000Z',
  renews_on: '2026-03-07 00:00:00.000Z',
  duration_weeks: 12,
  goal: '',
  notes: '',
  program_url: '',
};
const checkin = {
  program: 'remote',
  checked_at: '2026-02-20 00:00:00.000Z',
  adherence: 2,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.programs.getFullList.mockResolvedValue([program]);
  mocks.programs.getOne.mockResolvedValue(program);
  mocks.checkins.getFullList.mockResolvedValue([checkin]);
});

it('combina filtros del servidor y calcula alertas con la lógica compartida', async () => {
  const api = useCoaching();
  const [row] = await api.listPrograms({
    status: 'active',
    coach: 'coach1',
    search: 'Ana García',
    alert: 'renewal',
  });
  expect(mocks.programs.getFullList).toHaveBeenCalledWith(
    expect.objectContaining({
      filter:
        'coach = "coach1" && status = "active" && (client.first_name ~ "Ana" || client.last_name ~ "Ana") && (client.first_name ~ "García" || client.last_name ~ "García")',
    }),
  );
  expect(mocks.checkins.getFullList).toHaveBeenCalledWith(
    expect.objectContaining({ filter: 'program = "remote"' }),
  );
  expect(row?.flags).toEqual(
    programFlags(
      { ...program, starts_on: '2026-01-05', renews_on: '2026-03-07' },
      [{ checked_at: '2026-02-20', adherence: 2 }],
      undefined,
      '2026-03-01',
    ),
  );
  expect(row?.flags.alerts).toEqual(['renewal_soon', 'checkin_due', 'at_risk']);
  expect(await api.listPrograms({ alert: 'membership_expired' })).toEqual([]);
  expect((await api.getProgram('remote')).history).toEqual([checkin]);
});

it('restringe las membresías disponibles a planes online activos y registra check-ins', async () => {
  const api = useCoaching();
  await api.listOnlineMemberships({ client: 'ana' });
  expect(mocks.memberships.getFullList).toHaveBeenCalledWith(
    expect.objectContaining({
      filter: `plan.service.kind = 'online' && status = 'active' && client = "ana"`,
    }),
  );
  await api.createCheckin('remote', {
    checked_at: '2026-03-01',
    adherence: 5,
    notes: 'Seguimiento',
  });
  expect(mocks.checkins.create).toHaveBeenCalledWith(
    {
      program: 'remote',
      checked_at: '2026-03-01',
      adherence: 5,
      notes: 'Seguimiento',
    },
    { requestKey: null },
  );
});
