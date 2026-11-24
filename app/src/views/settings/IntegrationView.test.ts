import { flushPromises, mount } from '@vue/test-utils';
import { ClientResponseError } from 'pocketbase';
import PrimeVue from 'primevue/config';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import IntegrationView from './IntegrationView.vue';

const mocks = vi.hoisted(() => ({
  rotate: vi.fn(),
  require: vi.fn(),
  update: vi.fn(),
}));
const record = {
  id: 'a',
  public_key_prefix: 'oldkey01',
  public_key_rotated_at: '',
  allowed_origins: ['https://first.test'],
};
const business = ref(record);
vi.mock('@/composables/useBusiness', () => ({
  useBusiness: () => ({
    business,
    updateBusiness: (value: typeof record) => (business.value = value),
  }),
}));
vi.mock('@/composables/useBusinessKey', () => ({
  useBusinessKey: () => ({ rotate: mocks.rotate }),
}));
vi.mock('@/composables/useNotify', () => ({
  useNotify: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/lib/pocketbase', () => ({
  pb: { collection: () => ({ update: mocks.update }) },
}));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: mocks.require }),
}));

beforeEach(() => {
  business.value = record;
  vi.clearAllMocks();
});

function setup() {
  return mount(IntegrationView, {
    global: { plugins: [PrimeVue], stubs: { teleport: true } },
  });
}
function button(view: ReturnType<typeof setup>, text: string) {
  return view.findAll('button').find((button) => button.text() === text)!;
}

it('reveals the key after confirmation and removes it when the dialog closes', async () => {
  const key = 'pk_newkey01_00000000000000000000000000000000';
  mocks.rotate.mockResolvedValue({
    key,
    prefix: 'newkey01',
    rotated_at: '2026-11-24T00:00:00Z',
  });
  const view = setup();
  await button(view, 'Rotar clave').trigger('click');
  expect(mocks.rotate).not.toHaveBeenCalled();
  const confirmation = mocks.require.mock.calls[0][0];
  expect(confirmation.message).toContain('dejará de funcionar');
  await confirmation.accept();
  await flushPromises();
  expect(view.get<HTMLInputElement>('#integration-key').element.value).toBe(
    key,
  );
  expect(business.value.public_key_prefix).toBe('newkey01');
  expect(JSON.stringify(business.value)).not.toContain(key);
  expect(window.localStorage.getItem(key)).toBeNull();
  const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  try {
    await button(view, 'Copiar').trigger('click');
    expect(copy).toHaveBeenCalledWith(key);
  } finally {
    copy.mockRestore();
  }
  await button(view, 'Cerrar').trigger('click');
  expect(view.find('#integration-key').exists()).toBe(false);
  expect(view.html()).not.toContain(key);
  view.unmount();
});

it.each([
  ['https://*.example.test', 'sin ruta ni comodines'],
  ['example.test', 'HTTP o HTTPS'],
  ['https://a.test\nhttps://a.test', 'no pueden repetirse'],
])('rejects invalid origins before saving', async (input, error) => {
  const view = setup();
  await view.get('#integration-origins').setValue(input);
  await view.get('form').trigger('submit');
  expect(view.get('[role="alert"]').text()).toContain(error);
  expect(mocks.update).not.toHaveBeenCalled();
  view.unmount();
});

it('saves canonical origins and shows validation returned by the server', async () => {
  mocks.update.mockRejectedValueOnce(
    new ClientResponseError({
      status: 400,
      response: {
        message: 'Error',
        data: { allowed_origins: { message: 'Origen rechazado' } },
      },
    }),
  );
  const view = setup();
  await view
    .get('#integration-origins')
    .setValue(' https://second.test\nhttp://localhost:4321');
  await view.get('form').trigger('submit');
  await flushPromises();
  expect(mocks.update).toHaveBeenCalledWith(
    'a',
    { allowed_origins: ['https://second.test', 'http://localhost:4321'] },
    { requestKey: null },
  );
  expect(view.get('[role="alert"]').text()).toContain('Origen rechazado');
  view.unmount();
});
