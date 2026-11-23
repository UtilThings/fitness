import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import type { Payment } from '@/composables/usePayments';
import PaymentsView from './PaymentsView.vue';
import ReceiptView from './ReceiptView.vue';

const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  send: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: () => ({ getList: api.list, getOne: api.get }),
    filter: (expression: string, params: Record<string, string>) =>
      expression.replace(/\{:(\w+)\}/g, (_, key) =>
        JSON.stringify(params[key]),
      ),
    send: api.send,
  },
}));
vi.mock('@/composables/useNotify', () => ({
  useNotify: () => ({ success: api.success }),
}));

const pending = {
  id: 'p',
  client: 'ana',
  amount_cents: 1250,
  due_on: '2026-01-01',
  status: 'pending',
  receipt_number: '',
  paid_at: '',
  method: '',
} as Payment;
const paid: Payment = {
  ...pending,
  status: 'paid',
  method: 'zelle',
  paid_at: '2026-11-21',
  receipt_number: 'JQ-2026-000042',
};

async function render(path: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/payments', name: 'payments', component: PaymentsView },
      { path: '/receipts/:id', name: 'receipt', component: ReceiptView },
      {
        path: '/clients/:id',
        name: 'client-detail',
        component: { template: '<p />' },
      },
    ],
  });
  await router.push(path);
  const view = mount(
    { template: '<RouterView />' },
    {
      global: {
        plugins: [router, PrimeVue],
        stubs: {
          ClientPicker: {
            emits: ['update:modelValue'],
            template:
              "<button @click=\"$emit('update:modelValue', {id: 'ana'})\">Ana</button>",
          },
          Select: {
            props: ['options', 'modelValue', 'inputId'],
            emits: ['update:modelValue'],
            template:
              '<select :id="inputId" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""></option><option v-for="item in options" :key="item.value" :value="item.value">{{ item.label }}</option></select>',
          },
          PaymentFormDialog: {
            props: ['payment', 'modelValue'],
            emits: ['saved'],
            template:
              "<button v-if=\"modelValue && payment\" @click=\"$emit('saved', {...payment, status: 'paid', receipt_number: 'JQ-2026-000042'})\">Confirmar pago</button>",
          },
        },
      },
    },
  );
  await flushPromises();
  return { view, router };
}

it('combina filtros y actualiza el recibo al marcar pagado desde una fila', async () => {
  api.send.mockResolvedValue(undefined);
  api.list.mockResolvedValue({
    items: [pending],
    totalPages: 1,
    totalItems: 1,
  });
  const { view } = await render('/payments');
  await view.get('select').setValue('pending');
  await view.findAll('select')[1].setValue('zelle');
  await view.findAll('input[type=date]')[0].setValue('2026-01-01');
  await view.findAll('input[type=date]')[1].setValue('2026-01-31');
  await view.get('input[type=checkbox]').setValue(true);
  await view
    .findAll('button')
    .find((button) => button.text() === 'Ana')!
    .trigger('click');
  await flushPromises();
  const { filter } = api.list.mock.lastCall![2];
  expect(filter).toContain('client = "ana"');
  expect(filter).toContain('method = "zelle"');
  expect(filter).toContain('status = "pending"');
  expect(filter).toContain('due_on < "2026-02-01"');
  expect(filter).toContain("status = 'pending' && due_on != '' && due_on <");

  expect(view.find('a[href="/receipts/p"]').exists()).toBe(false);
  await view
    .findAll('button')
    .find((button) => button.text() === 'Marcar pagado')!
    .trigger('click');
  api.list.mockResolvedValueOnce({
    items: [paid],
    totalPages: 1,
    totalItems: 1,
  });
  await view
    .findAll('button')
    .find((button) => button.text() === 'Confirmar pago')!
    .trigger('click');
  await flushPromises();
  expect(api.success).toHaveBeenCalledWith('Pago registrado · JQ-2026-000042');
  expect(view.get('a[href="/receipts/p"]').text()).toBe(paid.receipt_number);
  view.unmount();
});

it('carga el recibo anulado e impide imprimir o ver uno pendiente', async () => {
  api.get
    .mockResolvedValueOnce({ ...paid, status: 'void' })
    .mockResolvedValueOnce(pending);
  const { view, router } = await render('/receipts/a');
  const print = vi.fn();
  vi.stubGlobal('print', print);
  expect(view.get('article').text()).toContain('JQ-2026-000042');
  expect(view.get('article').text()).toContain('$12.50');
  expect(view.get('article').text()).toContain('ANULADO');
  expect(view.get('article').find('button').exists()).toBe(false);
  await view.get('nav button').trigger('click');
  expect(print).toHaveBeenCalledOnce();

  await router.push('/receipts/p');
  await flushPromises();
  expect(view.text()).toContain('Este cobro aún no tiene recibo.');
  expect(view.find('article').exists()).toBe(false);
  expect(view.find('nav button').exists()).toBe(false);
  view.unmount();
  vi.unstubAllGlobals();
});
