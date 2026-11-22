import { flushPromises, mount } from '@vue/test-utils';
import AutoComplete from 'primevue/autocomplete';
import PrimeVue from 'primevue/config';
import { expect, it, vi } from 'vitest';
import ClientForm from './ClientForm.vue';
import ClientPicker from './ClientPicker.vue';
import ClientStatusTag from './ClientStatusTag.vue';

const mocks = vi.hoisted(() => ({ list: vi.fn(), hasMatchingPhone: vi.fn() }));
vi.mock('@/composables/useClients', () => ({ useClients: () => mocks }));
const global = { plugins: [PrimeVue] };

it('muestra los errores junto a cada campo y avisa sobre teléfonos compartidos', async () => {
  mocks.hasMatchingPhone.mockResolvedValueOnce(true);
  const wrapper = mount(ClientForm, {
    global,
    props: {
      mode: 'create',
      modelValue: {
        first_name: 'Ana',
        last_name: 'García',
        email: '',
        phone: '+13055550100',
        joined_on: '',
        emergency_contact: '',
      },
      errors: { email: 'Correo inválido', phone: 'Revisa el número' },
    },
  });
  const field = wrapper.get('input[type=email]');
  expect(wrapper.get('#' + field.attributes('aria-describedby')).text()).toBe(
    'Correo inválido',
  );
  const phone = wrapper.get('input[type=tel]');
  expect(wrapper.get('#' + phone.attributes('aria-describedby')).text()).toBe(
    'Revisa el número',
  );
  await phone.trigger('blur');
  await flushPromises();
  expect(wrapper.text()).toContain('Otro cliente tiene este teléfono.');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.emitted('submit')).toHaveLength(1);
  await wrapper.setProps({ busy: true });
  await wrapper.get('form').trigger('submit');
  expect(wrapper.emitted('submit')).toHaveLength(1);
});

it('omite consultas cortas, muestra resultados y emite solo una selección', async () => {
  const ana = { id: 'ana', first_name: 'Ana', last_name: 'García' };
  mocks.list.mockResolvedValueOnce({ items: [ana] });
  const wrapper = mount(ClientPicker, { global });
  const input = wrapper.getComponent(AutoComplete);
  input.vm.$emit('complete', {
    originalEvent: new Event('input'),
    query: ' a ',
  });
  expect(mocks.list).not.toHaveBeenCalled();
  input.vm.$emit('complete', {
    originalEvent: new Event('input'),
    query: 'ana',
  });
  await flushPromises();
  expect(input.props('suggestions')).toEqual([ana]);
  expect(mocks.list).toHaveBeenCalledWith({
    q: 'ana',
    perPage: 10,
    status: undefined,
  });
  input.vm.$emit('option-select', {
    originalEvent: new Event('click'),
    value: ana,
  });
  expect(wrapper.emitted('update:modelValue')).toEqual([[ana]]);
});

it('muestra la etiqueta de pausa sin reutilizar la etiqueta de activo', () => {
  const wrapper = mount(ClientStatusTag, {
    global,
    props: { status: 'paused' },
  });
  expect(wrapper.text()).toBe('Pausado');
});

it('descarta resultados tardíos al borrar el texto del selector', async () => {
  let resolve!: (value: { items: unknown[] }) => void;
  const delayed = new Promise<{ items: unknown[] }>((done) => {
    resolve = done;
  });
  mocks.list.mockReturnValueOnce(delayed);
  const wrapper = mount(ClientPicker, { global });
  const input = wrapper.getComponent(AutoComplete);
  input.vm.$emit('complete', {
    originalEvent: new Event('input'),
    query: 'ana',
  });
  input.vm.$emit('update:modelValue', '');
  resolve({ items: [{ id: 'ana', first_name: 'Ana' }] });
  await flushPromises();
  expect(input.props('suggestions')).toEqual([]);
  expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  wrapper.unmount();
});
