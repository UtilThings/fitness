import { flushPromises, mount } from '@vue/test-utils';
import { ClientResponseError } from 'pocketbase';
import PrimeVue from 'primevue/config';
import { beforeEach, expect, it, vi } from 'vitest';
import { useAuth } from '@/composables/useAuth';
import ProfileView from './ProfileView.vue';

const mocks = vi.hoisted(() => {
  const member = {
    id: 'coach',
    email: 'ana@example.test',
    name: 'Ana',
    phone: '',
    bio: '',
    role: 'coach',
    active: true,
    avatar: '',
  };
  const authStore = {
    record: member,
    isValid: true,
    token: 'old-token',
    onChange: vi.fn(),
    clear: vi.fn(),
  };
  return {
    member,
    authStore,
    update: vi.fn(),
    authWithPassword: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    replace: vi.fn(),
  };
});

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@/lib/pocketbase', () => ({
  pb: { authStore: mocks.authStore, collection: () => mocks },
}));
vi.mock('@/composables/useNotify', () => ({
  useNotify: () => ({
    success: mocks.success,
    error: mocks.error,
    info: mocks.info,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authStore.token = 'old-token';
  mocks.update.mockResolvedValue(mocks.member);
  mocks.authWithPassword.mockImplementation(async () => {
    mocks.authStore.token = 'new-token';
  });
});

function view() {
  return mount(ProfileView, { global: { plugins: [PrimeVue] } });
}

it('solo envía los campos de perfil permitidos', async () => {
  const wrapper = view();
  await wrapper.get('#profile-name').setValue('Ana Pérez');
  await wrapper.get('#profile-phone').setValue('+57 300 123 4567');
  await wrapper.get('#profile-bio').setValue('Coach');
  await wrapper.get('form[aria-label="Datos personales"]').trigger('submit');
  await flushPromises();
  expect(mocks.update).toHaveBeenCalledWith(
    mocks.member.id,
    {
      name: 'Ana Pérez',
      phone: '+57 300 123 4567',
      bio: 'Coach',
    },
    { requestKey: null },
  );
});

it('cambia la contraseña y renueva la sesión con la nueva', async () => {
  const wrapper = view();
  await wrapper.get('#profile-oldPassword').setValue('Anterior123');
  await wrapper.get('#profile-password').setValue('NuevaClave123');
  await wrapper.get('#profile-passwordConfirm').setValue('NuevaClave123');
  await wrapper.get('form[aria-label="Cambiar contraseña"]').trigger('submit');
  await flushPromises();
  expect(mocks.update).toHaveBeenCalledWith(
    mocks.member.id,
    {
      oldPassword: 'Anterior123',
      password: 'NuevaClave123',
      passwordConfirm: 'NuevaClave123',
    },
    { requestKey: null },
  );
  expect(mocks.authWithPassword).toHaveBeenCalledWith(
    mocks.member.email,
    'NuevaClave123',
    { expand: 'business' },
  );
  expect(mocks.authWithPassword).toHaveBeenCalledAfter(mocks.update);
  expect(mocks.authStore.token).toBe('new-token');
  expect(useAuth().isAuthenticated.value).toBe(true);
  expect(wrapper.get<HTMLInputElement>('#profile-password').element.value).toBe(
    '',
  );
  expect(mocks.success).toHaveBeenCalledWith('Contraseña actualizada');
  expect(mocks.replace).not.toHaveBeenCalled();
});

it('muestra una contraseña actual incorrecta junto al campo', async () => {
  mocks.update.mockRejectedValueOnce(
    new ClientResponseError({
      status: 400,
      response: { data: { oldPassword: { message: "Values don't match." } } },
    }),
  );
  const wrapper = view();
  await wrapper.get('#profile-oldPassword').setValue('incorrecta');
  await wrapper.get('#profile-password').setValue('NuevaClave123');
  await wrapper.get('#profile-passwordConfirm').setValue('NuevaClave123');
  await wrapper.get('form[aria-label="Cambiar contraseña"]').trigger('submit');
  await flushPromises();
  expect(wrapper.get('#profile-oldPassword-error').text()).toBe(
    'La contraseña actual es incorrecta',
  );
  expect(mocks.authWithPassword).not.toHaveBeenCalled();
});
