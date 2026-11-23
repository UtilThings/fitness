import PocketBase, { ClientResponseError } from 'pocketbase';
import { expect, it, vi } from 'vitest';
import { usePayments } from './usePayments';

const { getList, getFullList, send, filter } = vi.hoisted(() => ({
  getList: vi.fn(),
  getFullList: vi.fn(),
  send: vi.fn(),
  filter: vi.fn(),
}));

vi.mock('@/lib/pocketbase', () => ({
  pb: { collection: () => ({ getList, getFullList }), filter, send },
}));

it('combina y enlaza todos los filtros de manera segura', async () => {
  const sdk = new PocketBase();
  filter.mockImplementation(sdk.filter.bind(sdk));
  getList.mockResolvedValue({ items: [] });
  await usePayments().list({
    client: 'c"1',
    method: 'zelle',
    status: 'pending',
    overdue: true,
    from: '2026-11-01',
    through: '2026-11-20',
    page: 2,
    perPage: 10,
  });
  const [page, size, options] = getList.mock.lastCall!;
  expect([page, size]).toEqual([2, 10]);
  expect(options.expand).toBe('client,plan');
  expect(options.filter).toContain('client = "c\\"1"');
  expect(options.filter).toContain('method = "zelle"');
  expect(options.filter).toContain('status = "pending"');
  expect(options.filter).toContain('paid_at >= "2026-11-01"');
  expect(options.filter).toContain('due_on < "2026-11-21"');
  expect(options.filter).toContain(
    "status = 'pending' && due_on != '' && due_on < ",
  );
});

it('envía solo mutaciones personalizadas y conserva los mensajes del API', async () => {
  send
    .mockResolvedValueOnce({ receipt_number: 'JQ-2026-000001' })
    .mockRejectedValueOnce(
      new ClientResponseError({
        status: 409,
        response: { message: 'El pago ya está anulado.' },
      }),
    );
  const api = usePayments();
  await expect(api.pay('p/one', { method: 'cash' })).resolves.toEqual({
    receipt_number: 'JQ-2026-000001',
  });
  expect(send).toHaveBeenLastCalledWith(
    '/api/admin/payments/p%2Fone/pay',
    expect.objectContaining({
      method: 'POST',
      body: { method: 'cash' },
    }),
  );
  await expect(api.void('p', 'Duplicado')).rejects.toMatchObject({
    message: 'El pago ya está anulado.',
  });
  expect(send).toHaveBeenLastCalledWith(
    '/api/admin/payments/p/void',
    expect.objectContaining({
      method: 'POST',
      body: { reason: 'Duplicado' },
    }),
  );
});
