import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, expect, it, vi } from 'vitest';
import { computed, ref } from 'vue';
import BusinessSettingsView from './BusinessSettingsView.vue';

const mocks = vi.hoisted(() => ({ update: vi.fn(), success: vi.fn() }));
const original = {
  id: 'business-a',
  name: 'Fitness A',
  city: 'Bogotá',
  phone: '555',
  email: '',
  logo: 'a.png',
  currency: 'COP',
  timezone: 'America/Bogota',
  receipt_prefix: 'BOG',
};
const business = ref(original);
vi.mock('@/composables/useBusiness', () => ({
  useBusiness: () => ({
    business,
    logoUrl: computed(
      () => business.value.logo && '/files/' + business.value.logo,
    ),
    updateBusiness: (value: typeof original) => (business.value = value),
  }),
}));
vi.mock('@/composables/useNotify', () => ({
  useNotify: () => ({ success: mocks.success, error: vi.fn() }),
}));
vi.mock('@/lib/pocketbase', () => ({
  pb: { collection: () => ({ update: mocks.update }) },
}));

beforeEach(() => {
  business.value = original;
  mocks.update.mockReset();
});

function setup() {
  return mount(BusinessSettingsView, { global: { plugins: [PrimeVue] } });
}

it('updates the brand and uploads or removes the logo without altering platform fields', async () => {
  mocks.update.mockResolvedValue({
    ...original,
    name: 'Updated fitness',
    logo: 'b.png',
  });
  const view = setup();
  expect(view.text()).toContain('COP');
  expect(view.text()).toContain('America/Bogota');
  expect(view.text()).toContain('BOG');
  expect(view.findAll('input')).toHaveLength(5);
  await view.get('#business-name').setValue('Updated fitness');
  const image = new File(['logo'], 'b.png', { type: 'image/png' });
  const logo = view.get<HTMLInputElement>('#business-logo');
  Object.defineProperty(logo.element, 'files', { value: [image] });
  await logo.trigger('change');
  expect(view.get('img').attributes('src')).toMatch(/^blob:/);
  await view.get('form').trigger('submit');
  await flushPromises();
  const data = mocks.update.mock.calls[0][1] as FormData;
  expect(data.get('name')).toBe('Updated fitness');
  expect((data.get('logo') as File).name).toBe('b.png');
  expect(data.has('currency')).toBe(false);
  expect(business.value.logo).toBe('b.png');
  const remove = view
    .findAll('button')
    .find((button) => button.text() === 'Quitar logo')!;
  await remove.trigger('click');
  expect(view.find('img').exists()).toBe(false);
  await view.get('form').trigger('submit');
  expect((mocks.update.mock.calls[1][1] as FormData).get('logo')).toBe('');
  view.unmount();
});

it.each([
  [
    new File(['text'], 'logo.txt', { type: 'text/plain' }),
    'Selecciona una imagen',
  ],
  [
    new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', {
      type: 'image/png',
    }),
    'no puede superar 2 MB',
  ],
])('rejects an invalid logo', async (file, message) => {
  const view = setup();
  const logo = view.get<HTMLInputElement>('#business-logo');
  Object.defineProperty(logo.element, 'files', { value: [file] });
  await logo.trigger('change');
  expect(view.get('[role="alert"]').text()).toContain(message);
  expect(mocks.update).not.toHaveBeenCalled();
  view.unmount();
});
