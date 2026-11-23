import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type {
  CreditMovement,
  Membership,
  MembershipStatus,
} from '@/lib/memberships';
import AssignPlanDialog from './AssignPlanDialog.vue';
import CreditAdjustDialog from './CreditAdjustDialog.vue';
import CreditLedger from './CreditLedger.vue';
import CreditOverrideDialog from './CreditOverrideDialog.vue';
import MembershipActions from './MembershipActions.vue';
import MembershipStatusTag from './MembershipStatusTag.vue';

const api = vi.hoisted(() => ({
  assign: vi.fn(),
  adjust: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
}));
vi.mock('@/composables/useMemberships', () => ({ useMemberships: () => api }));
vi.mock('@/composables/usePlans', () => ({
  usePlans: () => ({
    load: vi.fn(),
    loading: ref(false),
    error: ref(null),
    items: ref([
      {
        id: 'pack',
        name: 'Plan de prueba',
        active: true,
        commitment_periods: 4,
        is_first_class: true,
      },
      { id: 'inactive', name: 'Plan archivado', active: false },
    ]),
  }),
}));

const membership: Membership = {
  id: 'm',
  collectionId: 'memberships',
  collectionName: 'memberships',
  client: 'c',
  plan: 'p',
  status: 'active',
  starts_on: '2026-11-01',
  current_period_start: '2026-11-01',
  current_period_end: '2026-11-28',
  periods_paid: 1,
  commitment_periods_total: 0,
  credits_balance: -1,
  auto_renew: false,
  paused_at: '',
  ended_on: '',
  notes: '',
};
const global = {
  plugins: [PrimeVue],
  stubs: {
    Dialog: {
      props: ['visible'],
      template: '<section v-if="visible"><slot /></section>',
    },
    Menu: {
      props: ['model'],
      template:
        '<button v-for="item in model" :key="item.label" @click="item.command()">{{ item.label }}</button>',
    },
    Select: {
      props: ['options', 'modelValue'],
      emits: ['update:modelValue'],
      template:
        '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option value=""></option><option v-for="row in options" :key="row.id" :value="row.id">{{ row.label }}</option></select>',
    },
    InputNumber: {
      emits: ['update:modelValue'],
      template:
        '<input type="number" @input="$emit(\'update:modelValue\', Number($event.target.value))">',
    },
  },
};

beforeEach(() => vi.clearAllMocks());

it.each([
  ['active', '2026-11-28', 'Activa'],
  ['active', '2026-11-29', 'Renovación pendiente'],
  ['paused', '2026-11-29', 'Pausada'],
  ['cancelled', '2026-11-29', 'Cancelada'],
  ['expired', '2026-11-29', 'Vencida'],
] as const)(
  'muestra %s el %s como %s',
  (status: MembershipStatus, today, label) => {
    const wrapper = mount(MembershipStatusTag, {
      props: { membership: { ...membership, status }, today },
      global,
    });
    expect(wrapper.text()).toBe(label);
    wrapper.unmount();
  },
);

it('muestra planes activos y el error en español al asignar', async () => {
  const wrapper = mount(AssignPlanDialog, {
    props: { client: 'c', modelValue: true },
    global,
  });
  expect(wrapper.text()).not.toContain('Plan archivado');
  await wrapper.get('select').setValue('pack');
  expect(wrapper.text()).toContain('16 semanas');
  expect(wrapper.text()).toContain('Primera clase');
  api.assign.mockRejectedValueOnce({
    message: 'El cliente ya tiene este plan activo.',
  });
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.text()).toContain('El cliente ya tiene este plan activo.');
  wrapper.unmount();
});

it('exige nota de ajuste y exige un monto entero que no sea cero', async () => {
  const wrapper = mount(CreditAdjustDialog, {
    props: { membership, modelValue: true },
    global,
  });
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('Indica el motivo del ajuste.');
  await wrapper.get('textarea').setValue(' Corrección ');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('Indica un número entero');
  expect(api.adjust).not.toHaveBeenCalled();
  await wrapper.get('input[type=number]').setValue('-2');
  api.adjust.mockResolvedValueOnce({ membership });
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.adjust).toHaveBeenCalledWith('m', -2, 'Corrección');
  wrapper.unmount();
});

it.each([
  ['Pausar', 'pause'],
  ['Cancelar membresía', 'cancel'],
] as const)('exige nota para %s', async (label, action) => {
  const wrapper = mount(MembershipActions, { props: { membership }, global });
  await wrapper
    .findAll('button')
    .find((button) => button.text() === label)!
    .trigger('click');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('Indica el motivo de la acción.');
  expect(api[action]).not.toHaveBeenCalled();
  await wrapper.get('textarea').setValue(' Solicitud ');
  api[action].mockResolvedValueOnce({ membership });
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api[action]).toHaveBeenCalledWith('m', 'Solicitud');
  wrapper.unmount();
});

it('exige una nota en la excepción de créditos', async () => {
  const wrapper = mount(CreditOverrideDialog, {
    props: { modelValue: true, message: 'No hay créditos.' },
    global,
  });
  await wrapper.get('textarea').setValue('   ');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.emitted('confirmed')).toBeUndefined();
  expect(wrapper.text()).toContain('Indica el motivo de la excepción.');
  await wrapper.get('textarea').setValue(' Aprobado ');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.emitted('confirmed')).toEqual([['Aprobado']]);
  wrapper.unmount();
});

it('ordena el historial descendente y destaca el saldo negativo', () => {
  const base: CreditMovement = {
    id: 'old',
    collectionId: 'ledger',
    collectionName: 'credit_movements',
    membership: 'm',
    booking: '',
    delta: 2,
    reason: 'grant',
    note: 'Anterior',
    created: '2026-11-21T18:00:00Z',
    created_by: '',
  };
  const wrapper = mount(CreditLedger, {
    props: {
      membership,
      movements: [
        base,
        {
          ...base,
          id: 'new',
          created: '2026-11-22T18:00:00Z',
          note: 'Reciente',
          booking: 'reserva',
        },
      ],
    },
    global,
  });
  expect(wrapper.text().indexOf('Reciente')).toBeLessThan(
    wrapper.text().indexOf('Anterior'),
  );
  expect(wrapper.get('.text-red-600').text()).toContain('-1');
  expect(wrapper.text()).toContain('reserva');
  wrapper.unmount();
});
