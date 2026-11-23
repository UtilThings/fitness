import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import DataTable from 'primevue/datatable';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import AuditView from './AuditView.vue';

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
enableAutoUnmount(afterEach);

const entry = {
  id: 'audit-id',
  collection: 'bookings',
  action: 'update',
  created: '2026-11-23 18:00:00.000Z',
  actor: 'staff-id',
  expand: { actor: { name: 'Ana' } },
  record_id: 'booking-id',
  summary: 'Reserva actualizada',
  diff: { status: { from: 'waitlisted', to: 'booked' } },
};

beforeEach(() => {
  getList
    .mockReset()
    .mockResolvedValue({ items: [entry], totalItems: 26, totalPages: 2 });
  getFullList.mockReset().mockResolvedValue([{ id: 'staff-id', name: 'Ana' }]);
});

function render() {
  return mount(AuditView, {
    global: {
      plugins: [PrimeVue],
      stubs: {
        Select: {
          props: ['inputId', 'options', 'modelValue'],
          emits: ['update:modelValue'],
          template:
            '<select :id="inputId" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>',
        },
        Dialog: {
          props: ['visible'],
          template: '<aside v-if="visible"><slot /></aside>',
        },
      },
    },
  });
}

it('pagina, combina los filtros y permite abrir el detalle del diff', async () => {
  const wrapper = render();
  await flushPromises();
  expect(wrapper.text()).toContain('Reserva actualizada');
  wrapper.getComponent(DataTable).vm.$emit('page', { page: 1 });
  await flushPromises();
  expect(getList).toHaveBeenLastCalledWith(2, 25, expect.anything());
  await wrapper.get('#audit-collection').setValue('bookings');
  await wrapper.get('#audit-actor').setValue('staff-id');
  await wrapper.get('#audit-from').setValue('2026-11-23');
  await wrapper.get('#audit-to').setValue('2026-11-23');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(getList).toHaveBeenLastCalledWith(
    1,
    25,
    expect.objectContaining({
      filter:
        'collection = bookings && actor = staff-id && created >= 2026-11-23 05:00:00.000Z && created < 2026-11-24 05:00:00.000Z',
    }),
  );
  await wrapper
    .findAll('button')
    .find((node) => node.text() === 'Ver cambios')!
    .trigger('click');
  expect(wrapper.get('aside').text()).toContain('booking-id');
  expect(wrapper.findAll('aside pre').map((node) => node.text())).toEqual([
    'waitlisted',
    'booked',
  ]);
});

it('muestra el error de red y permite reintentar una consulta vacía', async () => {
  getList
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({ items: [], totalItems: 0, totalPages: 0 });
  const wrapper = render();
  await flushPromises();
  expect(wrapper.text()).toContain('Sin conexión con el servidor');
  await wrapper
    .findAll('button')
    .find((node) => node.text() === 'Reintentar')!
    .trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('No se encontraron registros.');
});
