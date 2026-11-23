import { beforeEach, expect, it, vi } from 'vitest';
import { useAuditLogs } from '@/composables/useAuditLogs';

const { getList, getFullList } = vi.hoisted(() => ({
  getList: vi.fn(),
  getFullList: vi.fn(),
}));
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: () => ({ getList, getFullList }),
    filter: (expression: string, params: Record<string, string>) =>
      expression.replace(/\{:(\w+)\}/g, (_, key: string) => params[key]),
  },
}));

beforeEach(() => {
  getList
    .mockReset()
    .mockResolvedValue({ items: [], totalItems: 77, totalPages: 4 });
  getFullList
    .mockReset()
    .mockResolvedValue([{ id: 'actor', name: 'Recepción' }]);
});

it('pagina y reinicia la página al cambiar filtros', async () => {
  const audit = useAuditLogs();
  await audit.load(3);
  expect(audit.page.value).toBe(3);
  expect(audit.totalPages.value).toBe(4);
  expect(getList).toHaveBeenCalledWith(
    3,
    25,
    expect.objectContaining({
      sort: '-created,-id',
      expand: 'actor',
      filter: '',
    }),
  );
  await audit.setFilters({ collection: 'bookings' });
  expect(audit.page.value).toBe(1);
  expect(getList).toHaveBeenLastCalledWith(
    1,
    25,
    expect.objectContaining({ filter: 'collection = bookings' }),
  );
  await audit.loadActors();
  expect(audit.actors.value).toEqual([{ id: 'actor', name: 'Recepción' }]);
});

it('descarta respuestas antiguas al cambiar de filtro', async () => {
  let resolveEarlier!: (result: object) => void;
  getList.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveEarlier = resolve;
      }),
  );
  const audit = useAuditLogs();
  const earlier = audit.load(2);
  await audit.setFilters({ actor: 'staff' });
  resolveEarlier({ items: [{ id: 'old' }], totalItems: 100, totalPages: 4 });
  await earlier;
  expect(audit.items.value).toEqual([]);
  expect(audit.totalItems.value).toBe(77);
  expect(audit.page.value).toBe(1);
});
