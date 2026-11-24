import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import RolePermissions from '@/components/team/RolePermissions.vue';
import MemberForm from '@/components/team/MemberForm.vue';
import { pb } from '@/lib/pocketbase';
import TeamMemberView from './TeamMemberView.vue';

const mocks = vi.hoisted(() => ({
  can: vi.fn(),
  getMember: vi.fn(),
  updateMember: vi.fn(),
  success: vi.fn(),
}));
const route = reactive({ params: { id: 'coach' } });
const member = {
  id: 'coach',
  name: 'Ana Pérez',
  email: 'ana@example.test',
  avatar: 'avatar.png',
  collectionId: 'admins',
  collectionName: 'admins',
  role: 'coach',
  active: true,
  phone: '+57 300 123 4567',
  bio: 'Entrenamiento funcional',
};

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => route,
}));
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user: ref({ id: 'owner' }), can: mocks.can }),
}));
vi.mock('@/composables/useNotify', () => ({
  useNotify: () => ({ success: mocks.success, error: vi.fn() }),
}));
vi.mock('@/composables/useTeam', () => ({ useTeam: () => mocks }));

afterEach(() => vi.restoreAllMocks());

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(pb.authStore, 'token', 'get').mockReturnValue('team-member-session');
  vi.spyOn(pb.files, 'getToken').mockResolvedValue('team-member-file-token');
  route.params.id = member.id;
  mocks.can.mockReturnValue(true);
  mocks.getMember.mockResolvedValue(member);
});

function view() {
  return mount(TeamMemberView, {
    global: {
      plugins: [PrimeVue],
      stubs: { RouterLink: RouterLinkStub, teleport: true },
    },
  });
}

it('muestra los datos, el avatar, los permisos y la sección de horario', async () => {
  const wrapper = view();
  await flushPromises();
  expect(mocks.getMember).toHaveBeenCalledWith(member.id);
  for (const text of [
    member.name,
    member.email,
    member.phone,
    member.bio,
    'Activo',
    'Horario y clases',
    'Ver horario',
  ]) {
    expect(wrapper.text()).toContain(text);
  }
  const link = wrapper
    .findAllComponents(RouterLinkStub)
    .find((item) => item.text() === 'Ver horario');
  expect(link?.props('to')).toEqual({
    name: 'classes',
    query: { coach: member.id },
  });
  expect(wrapper.get('img').attributes('src')).toContain('avatar.png');
  expect(wrapper.getComponent(RolePermissions).props('highlight')).toBe(
    'coach',
  );
});

it('muestra un mensaje al cambiar a una ficha inexistente', async () => {
  const wrapper = view();
  await flushPromises();
  mocks.getMember.mockRejectedValue({
    status: 404,
    message: 'No se encontró el registro',
    fields: {},
  });
  route.params.id = 'missing';
  await flushPromises();
  expect(wrapper.text()).toContain('Integrante no encontrado');
  expect(wrapper.text()).not.toContain(member.name);
});

it('permite al owner editar el rol y los datos de otro integrante', async () => {
  mocks.updateMember.mockResolvedValue({ ...member, role: 'reception' });
  const wrapper = view();
  await flushPromises();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Editar')!
    .trigger('click');
  wrapper
    .getComponent(MemberForm)
    .vm.$emit('submit', { ...member, role: 'reception', password: '' });
  await flushPromises();
  expect(mocks.updateMember).toHaveBeenCalledWith(member.id, {
    name: member.name,
    role: 'reception',
    phone: member.phone,
    bio: member.bio,
  });
  expect(wrapper.getComponent(RolePermissions).props('highlight')).toBe(
    'reception',
  );
});

it('oculta la edición a coach y recepción', async () => {
  mocks.can.mockReturnValue(false);
  const wrapper = view();
  await flushPromises();
  expect(
    wrapper.findAll('button').some((button) => button.text() === 'Editar'),
  ).toBe(false);
  expect(wrapper.text()).not.toContain('Desactivar');
});
