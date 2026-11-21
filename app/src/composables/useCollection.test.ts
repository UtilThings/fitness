import PocketBase, { ClientResponseError, type ListResult } from 'pocketbase';
import { beforeEach, expect, it, vi } from 'vitest';
import { useCollection } from './useCollection';

type Member = { id: string; name: string };
const member = { id: 'one', name: 'Ana' };
const sdk = new PocketBase('http://localhost');
const mocks = vi.hoisted(() => ({
  getList: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  filter: vi.fn(),
}));

vi.mock('@/lib/pocketbase', () => ({
  pb: { collection: () => mocks, filter: mocks.filter },
}));

function list(page = 1, perPage = 20, items = [member]): ListResult<Member> {
  return {
    page,
    perPage,
    totalItems: 50,
    totalPages: Math.ceil(50 / perPage),
    items,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getList.mockImplementation((page, perPage) =>
    Promise.resolve(list(page, perPage)),
  );
  mocks.filter.mockImplementation((expression, params) =>
    sdk.filter(expression, params),
  );
});

it('loads and exposes paging, sorting and list options', async () => {
  const collection = useCollection<Member>('members', {
    perPage: 10,
    sort: '-created',
    fields: 'id,name',
    expand: 'coach',
  });
  await collection.load();
  expect(collection.items.value).toEqual([member]);
  expect(collection.page.value).toBe(1);
  expect(collection.perPage.value).toBe(10);
  expect(collection.total.value).toBe(50);
  expect(mocks.getList).toHaveBeenLastCalledWith(
    1,
    10,
    expect.objectContaining({
      sort: '-created',
      fields: 'id,name',
      expand: 'coach',
    }),
  );

  await collection.setPage(3);
  expect(collection.page.value).toBe(3);
  expect(mocks.getList).toHaveBeenLastCalledWith(
    3,
    10,
    expect.objectContaining({ sort: '-created' }),
  );
  await collection.setSort('name');
  expect(collection.page.value).toBe(1);
  expect(collection.sort.value).toBe('name');
  expect(mocks.getList).toHaveBeenLastCalledWith(
    1,
    10,
    expect.objectContaining({ sort: 'name' }),
  );
});

it('binds quoted searches, base filters and reactive clauses separately', async () => {
  const collection = useCollection<Member>('members', {
    baseFilter: { expression: 'active = {:value}', params: { value: true } },
  });
  collection.filters.value.push({
    expression: 'role = {:value}',
    params: { value: 'coach' },
  });
  await collection.setPage(2);
  const term = `O'Neil "Junior"`;
  await collection.search(term, ['name', 'email']);
  expect(mocks.filter).toHaveBeenCalledWith(
    'name ~ {:term} || email ~ {:term}',
    { term },
  );
  const escaped = sdk.filter('name ~ {:term} || email ~ {:term}', { term });
  expect(escaped).toContain(JSON.stringify(term));
  expect(mocks.getList).toHaveBeenLastCalledWith(
    1,
    20,
    expect.objectContaining({
      filter: `(active = true) && (role = "coach") && (${escaped})`,
    }),
  );
  await collection.search('', ['name', 'email']);
  expect(mocks.getList).toHaveBeenLastCalledWith(
    1,
    20,
    expect.objectContaining({
      filter: '(active = true) && (role = "coach")',
    }),
  );
});

it('translates failed writes and failed lists', async () => {
  const collection = useCollection<Member>('members');
  mocks.create.mockRejectedValue(
    new ClientResponseError({
      status: 400,
      response: {
        message: 'Revisa el formulario',
        data: { name: { message: 'Es requerido' }, unexpected: {} },
      },
    }),
  );
  await expect(collection.create({ name: '' })).rejects.toEqual({
    status: 400,
    message: 'Revisa el formulario',
    fields: { name: 'Es requerido' },
  });
  expect(mocks.getList).not.toHaveBeenCalled();

  mocks.getList.mockRejectedValue(new ClientResponseError({ status: 403 }));
  await collection.load();
  expect(collection.error.value).toEqual({
    status: 403,
    message: 'No tienes permiso',
    fields: {},
  });
  expect(collection.loading.value).toBe(false);
});

it('refreshes after each write and returns the SDK result', async () => {
  const collection = useCollection<Member>('members');
  const updated = { ...member, name: 'Julia' };
  const form = new FormData();
  form.set('name', updated.name);
  mocks.create.mockResolvedValue(member);
  mocks.update.mockResolvedValue(updated);
  mocks.delete.mockResolvedValue(true);
  await expect(collection.create({ name: member.name })).resolves.toEqual(
    member,
  );
  await expect(collection.update(member.id, form)).resolves.toEqual(updated);
  mocks.getList.mockResolvedValue({ ...list(1, 20, []), totalItems: 0 });
  await expect(collection.remove(member.id)).resolves.toBe(true);
  expect(mocks.update).toHaveBeenCalledWith(member.id, form, {
    requestKey: null,
  });
  expect(mocks.delete).toHaveBeenCalledWith(member.id, { requestKey: null });
  expect(mocks.getList).toHaveBeenCalledTimes(3);
  expect(collection.items.value).toEqual([]);
  expect(collection.total.value).toBe(0);
});

it('ignores stale responses and canceled reads, using a key scoped to each instance', async () => {
  const collection = useCollection<Member>('members');
  const other = useCollection<Member>('members');
  let finishPrevious!: (result: ListResult<Member>) => void;
  let finishCurrent!: (result: ListResult<Member>) => void;
  const previous = new Promise<ListResult<Member>>((resolve) => {
    finishPrevious = resolve;
  });
  const current = new Promise<ListResult<Member>>((resolve) => {
    finishCurrent = resolve;
  });
  mocks.getList.mockReturnValueOnce(previous).mockReturnValueOnce(current);
  const obsoleteLoad = collection.load();
  const latestLoad = collection.setPage(2);
  expect(collection.loading.value).toBe(true);
  finishCurrent(list(2));
  await latestLoad;
  finishPrevious(list(1, 20, []));
  await obsoleteLoad;
  expect(collection.page.value).toBe(2);
  expect(collection.items.value).toEqual([member]);

  mocks.getList.mockRejectedValueOnce(
    new ClientResponseError({ isAbort: true }),
  );
  await collection.load();
  expect(collection.error.value).toBeNull();
  expect(collection.loading.value).toBe(false);
  await other.load();
  const keys = mocks.getList.mock.calls.map(
    ([, , { requestKey }]) => requestKey,
  );
  expect(keys.slice(0, 3)).toEqual([keys[0], keys[0], keys[0]]);
  expect(keys[3]).not.toBe(keys[0]);
});
