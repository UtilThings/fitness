import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { expect, it, vi } from 'vitest';
import type { Payment } from '@/composables/usePayments';
import PaymentStatusTag from './PaymentStatusTag.vue';
import VoidPaymentDialog from './VoidPaymentDialog.vue';

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('@/lib/pocketbase', () => ({
  pb: { collection: () => ({}), send },
}));

const global = {
  plugins: [PrimeVue],
  stubs: {
    Dialog: {
      props: ['visible'],
      template: '<section v-if="visible"><slot /></section>',
    },
  },
};

it.each([
  ['pending', '2026-11-20', 'Vencido'],
  ['pending', '2026-11-21', 'Pendiente'],
  ['paid', '2026-11-20', 'Pagado'],
  ['void', '2026-11-20', 'Anulado'],
] as const)('muestra %s y vencimiento %s', (status, due_on, label) => {
  const view = mount(PaymentStatusTag, {
    props: { payment: { status, due_on }, today: '2026-11-21' },
    global,
  });
  expect(view.text()).toBe(label);
  view.unmount();
});

it('exige motivo y muestra un aviso en español ante un fallo', async () => {
  const view = mount(VoidPaymentDialog, {
    props: { payment: { id: 'p' } as Payment, modelValue: true },
    global,
  });
  await view.get('textarea').setValue('   ');
  await view.get('form').trigger('submit');
  expect(view.text()).toContain('Indica el motivo de la anulación.');
  expect(send).not.toHaveBeenCalled();

  send.mockRejectedValueOnce(new Error('offline'));
  await view.get('textarea').setValue(' Duplicado ');
  await view.get('form').trigger('submit');
  await flushPromises();
  expect(view.text()).toContain('Sin conexión con el servidor');
  expect(send).toHaveBeenCalledWith(
    '/api/admin/payments/p/void',
    expect.objectContaining({
      body: { reason: 'Duplicado' },
    }),
  );
  expect(view.emitted('saved')).toBeUndefined();
  view.unmount();
});
