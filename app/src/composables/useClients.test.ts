import { ClientResponseError } from 'pocketbase';
import { beforeEach, expect, it, vi } from 'vitest';
import { useClients } from './useClients';

const mocks = vi.hoisted(() => ({
  getList: vi.fn(),
  getOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/pocketbase', async () => {
  const { default: PocketBase } = await import('pocketbase');
  const client = new PocketBase('http://localhost');
  return {
    pb: { collection: () => mocks, filter: client.filter.bind(client) },
  };
});

beforeEach(() => vi.resetAllMocks());

it('pagina y ordena los clientes, combinando la búsqueda y el estado', async () => {
  mocks.getList.mockResolvedValue({ items: [], totalItems: 0 });
  const clients = useClients();
  await clients.list({ q: 'ana', status: 'paused', page: 2, perPage: 10 });
  expect(mocks.getList).toHaveBeenCalledWith(2, 10, {
    sort: 'last_name,first_name,id',
    filter: expect.stringMatching(/first_name ~ "ana".*&& status = "paused"/),
    requestKey: null,
  });
});

it('reutiliza CRUD y traduce los errores por campo de la API', async () => {
  const clients = useClients();
  await clients.get('ana');
  expect(mocks.getOne).toHaveBeenCalledWith('ana', { requestKey: null });
  await clients.setStatus('ana', 'inactive');
  expect(mocks.update).toHaveBeenCalledWith(
    'ana',
    { status: 'inactive' },
    { requestKey: null },
  );
  await clients.remove('ana');
  expect(mocks.delete).toHaveBeenCalledWith('ana', { requestKey: null });
  mocks.create.mockRejectedValueOnce(
    new ClientResponseError({
      status: 400,
      response: {
        data: {
          email: { code: 'validation_not_unique', message: 'Duplicate' },
          phone: { message: 'Teléfono inválido' },
        },
      },
    }),
  );
  await expect(clients.create({ first_name: 'Ana' })).rejects.toMatchObject({
    status: 400,
    fields: {
      email: 'Ya existe un cliente con ese correo electrónico.',
      phone: 'Teléfono inválido',
    },
  });
});

it('consulta coincidencias exactas de teléfono y omite números inválidos', async () => {
  const clients = useClients();
  expect(await clients.hasMatchingPhone('123')).toBe(false);
  expect(mocks.getList).not.toHaveBeenCalled();
  mocks.getList.mockResolvedValue({ items: [{ id: 'otro' }] });
  expect(await clients.hasMatchingPhone('(305) 555-0100', 'ana')).toBe(true);
  expect(mocks.getList).toHaveBeenCalledWith(
    1,
    1,
    expect.objectContaining({
      filter: `phone = "+13055550100" && id != "ana"`,
      fields: 'id',
    }),
  );
});
