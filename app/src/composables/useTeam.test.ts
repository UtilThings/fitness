import { ClientResponseError } from 'pocketbase';
import { beforeEach, expect, it, vi } from 'vitest';
import { useTeam } from './useTeam';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  getList: vi.fn(),
  getFullList: vi.fn(),
  filter: vi.fn(),
}));

vi.mock('@/lib/pocketbase', () => ({
  pb: { collection: () => mocks, filter: mocks.filter },
}));

const member = { id: 'coach', name: 'Ana', role: 'coach', active: true };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getList.mockResolvedValue({
    page: 1,
    perPage: 20,
    totalItems: 1,
    items: [member],
  });
  mocks.create.mockResolvedValue(member);
  mocks.update.mockResolvedValue(member);
});

it('envía la contraseña inicial y su confirmación al crear', async () => {
  const data = {
    name: 'Ana',
    email: 'ana@example.test',
    role: 'coach' as const,
    phone: '300',
    bio: '',
    password: 'Temporal123',
  };
  await expect(useTeam().createMember(data)).resolves.toEqual(member);
  expect(mocks.create).toHaveBeenCalledWith(
    {
      ...data,
      passwordConfirm: data.password,
      emailVisibility: true,
      active: true,
    },
    { requestKey: null },
  );
});

it('devuelve un 409 como opción de desactivar y conserva la lista', async () => {
  const team = useTeam();
  await team.load();
  mocks.delete.mockRejectedValue(new ClientResponseError({ status: 409 }));
  await expect(team.deleteOrDeactivate(member)).resolves.toEqual({
    deactivated: false,
    needsDeactivate: true,
  });
  expect(team.items.value).toEqual([member]);
  expect(mocks.getList).toHaveBeenCalledTimes(1);
  expect(mocks.update).not.toHaveBeenCalled();
  mocks.delete.mockRejectedValue(new ClientResponseError({ status: 403 }));
  await expect(team.deleteOrDeactivate(member)).rejects.toMatchObject({
    status: 403,
  });
});

it('carga coaches activos ordenados mediante un filtro parametrizado y refresca al cambiar el estado', async () => {
  mocks.filter.mockReturnValue('filtro-coaches');
  mocks.getFullList.mockResolvedValueOnce([member]).mockResolvedValueOnce([]);
  const team = useTeam();
  await team.loadCoaches();
  expect(mocks.filter).toHaveBeenCalledWith(
    'active = {:active} && (role = {:coach} || role = {:owner})',
    { active: true, coach: 'coach', owner: 'owner' },
  );
  expect(mocks.getFullList).toHaveBeenCalledWith(
    expect.objectContaining({ sort: 'name', filter: 'filtro-coaches' }),
  );
  expect(team.coaches.value).toEqual([member]);
  await team.setActive(member.id, false);
  expect(mocks.update).toHaveBeenCalledWith(
    member.id,
    { active: false },
    { requestKey: null },
  );
  expect(team.coaches.value).toEqual([]);
});

it('envía el avatar como FormData y permite cambiar el rol', async () => {
  const team = useTeam();
  const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
  await team.uploadAvatar(member.id, file);
  const [[id, data]] = mocks.update.mock.calls;
  expect(id).toBe(member.id);
  expect(data.get('avatar')).toEqual(file);
  await team.setRole(member.id, 'owner');
  expect(mocks.update).toHaveBeenLastCalledWith(
    member.id,
    { role: 'owner' },
    { requestKey: null },
  );
});
