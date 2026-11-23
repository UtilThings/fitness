import { ClientResponseError } from 'pocketbase';
import { beforeEach, expect, it, vi } from 'vitest';
import { useMemberships } from './useMemberships';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  getList: vi.fn(),
  getFullList: vi.fn(),
  collection: vi.fn(),
}));

vi.mock('@/lib/pocketbase', async () => {
  const { default: PocketBase } = await import('pocketbase');
  const client = new PocketBase('http://localhost');
  return {
    pb: {
      send: mocks.send,
      collection: mocks.collection,
      filter: client.filter.bind(client),
    },
  };
});
vi.mock('@/lib/datetime', async (original) => ({
  ...(await original<typeof import('@/lib/datetime')>()),
  todayLocal: () => '2026-11-23',
}));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.collection.mockReturnValue(mocks);
});

it('envía cada acción de gestión y la preconsulta con el contrato de PocketBase', async () => {
  const api = useMemberships();
  await api.assign({ client: 'c', plan: 'p', starts_on: '2026-11-23' });
  await api.renew('m', 'Renovación');
  await api.pause('m', 'Viaje');
  await api.resume('m');
  await api.cancel('m', 'Solicitud');
  await api.adjust('m', -2, 'Corrección');
  await api.eligibility('c', 's');
  const base = '/api/admin/memberships';
  expect(mocks.send.mock.calls).toEqual([
    [
      base + '/assign',
      {
        method: 'POST',
        body: { client: 'c', plan: 'p', starts_on: '2026-11-23' },
        requestKey: null,
      },
    ],
    [
      base + '/m/renew',
      { method: 'POST', body: { notes: 'Renovación' }, requestKey: null },
    ],
    [
      base + '/m/pause',
      { method: 'POST', body: { note: 'Viaje' }, requestKey: null },
    ],
    [base + '/m/resume', { method: 'POST', body: {}, requestKey: null }],
    [
      base + '/m/cancel',
      { method: 'POST', body: { note: 'Solicitud' }, requestKey: null },
    ],
    [
      base + '/m/adjust',
      {
        method: 'POST',
        body: { delta: -2, note: 'Corrección' },
        requestKey: null,
      },
    ],
    [
      base + '/eligibility',
      { method: 'GET', query: { client: 'c', session: 's' }, requestKey: null },
    ],
  ]);
});

it('combina el plan con la renovación pendiente y consulta historial ordenado por fecha', async () => {
  const api = useMemberships();
  await api.list({ page: 2, plan: 'pack', renewalPending: true });
  expect(mocks.getList).toHaveBeenCalledWith(
    2,
    20,
    expect.objectContaining({
      filter: `plan = "pack" && status = 'active' && current_period_end < "2026-11-23"`,
    }),
  );
  await api.listForClient('c');
  await api.ledger('m');
  expect(mocks.getFullList).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ filter: 'client = "c"' }),
  );
  expect(mocks.getFullList).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      filter: 'membership = "m"',
      sort: '-created,-id',
    }),
  );
});

it('conserva el código de dominio y devuelve un mensaje en español', async () => {
  mocks.send.mockRejectedValue(
    new ClientResponseError({
      status: 409,
      response: {
        message: 'El cliente ya tiene este plan activo.',
        data: { code: { code: 'duplicate_plan' } },
      },
    }),
  );
  await expect(
    useMemberships().assign({ client: 'c', plan: 'p' }),
  ).rejects.toMatchObject({
    status: 409,
    code: 'duplicate_plan',
    message: 'El cliente ya tiene este plan activo.',
  });
});
