import { flushPromises, mount } from '@vue/test-utils';
import ConfirmationService from 'primevue/confirmationservice';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import { beforeEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import CheckinDialog from '@/components/coaching/CheckinDialog.vue';
import {
  programFlags,
  type CoachingCheckin,
  type ProgramOverview,
} from '@/lib/coaching';
import type { Client } from '@/lib/clients';
import type { Admin } from '@/types/pb';
import CoachingView from './CoachingView.vue';

const api = vi.hoisted(() => ({
  listPrograms: vi.fn(),
  listCoaches: vi.fn(),
  getProgram: vi.fn(),
}));
const user = ref<Admin | null>(null);
vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ user }) }));
vi.mock('@/composables/useCoaching', () => ({ useCoaching: () => api }));

const today = '2026-03-01';
function overview(
  id: string,
  coach: string,
  name: string,
  status: ProgramOverview['status'],
  history: CoachingCheckin[] = [],
  renews_on = '',
): ProgramOverview {
  const program = {
    id,
    client: id,
    coach,
    membership: id,
    status,
    starts_on: '2026-02-01',
    renews_on,
    duration_weeks: 12,
    goal: '',
    program_url: '',
    notes: '',
    expand: { client: { first_name: name, last_name: 'García' } as Client },
  };
  return { ...program, flags: programFlags(program, history, null, today) };
}

const low = {
  id: 'low',
  program: 'bea',
  checked_at: today,
  adherence: 2,
  notes: '',
  created_by: '',
};
const ana = overview('ana', 'andre', 'Ana', 'active', [], '2026-03-03');
const bea = overview('bea', 'lucia', 'Bea', 'active', [low]);
const clara = overview('clara', 'lucia', 'Clara', 'paused');

beforeEach(() => {
  vi.resetAllMocks();
  user.value = { id: 'owner', role: 'owner' } as Admin;
  api.listPrograms.mockResolvedValue([ana, bea, clara]);
  api.listCoaches.mockResolvedValue([
    { id: 'andre', name: 'André' },
    { id: 'lucia', name: 'Lucía' },
  ]);
  api.getProgram.mockResolvedValue({ program: ana, history: [] });
});

async function view() {
  const wrapper = mount(CoachingView, {
    global: {
      plugins: [PrimeVue, ConfirmationService],
      stubs: {
        Dialog: {
          props: ['visible', 'header'],
          template:
            '<section v-if="visible"><h2>{{ header }}</h2><slot /></section>',
        },
      },
    },
  });
  await flushPromises();
  return wrapper;
}

it('muestra el resumen, combina los filtros y busca por nombre sin tildes', async () => {
  const wrapper = await view();
  expect(wrapper.findAll('dl dd').map((entry) => entry.text())).toEqual([
    '2',
    '1',
    '1',
    '1',
  ]);
  const select = (label: string) =>
    wrapper
      .findAllComponents(Select)
      .find((item) => item.props('ariaLabel') === label)!;
  const clients = () =>
    wrapper.findAll('tbody button').map((item) => item.text());
  expect(clients()).toEqual(['Ana García', 'Bea García', 'Clara García']);
  select('Estado del programa').vm.$emit('update:modelValue', 'active');
  select('Coach').vm.$emit('update:modelValue', 'lucia');
  select('Alerta').vm.$emit('update:modelValue', 'at_risk');
  await flushPromises();
  expect(clients()).toEqual(['Bea García']);
  await wrapper
    .get('input[aria-label="Buscar cliente"]')
    .setValue('GARCIA bea');
  expect(clients()).toEqual(['Bea García']);
  await wrapper.get('input[aria-label="Buscar cliente"]').setValue('Clara');
  expect(clients()).toEqual([]);
});

it('restringe la selección inicial del coach y oculta el check-in a reception', async () => {
  user.value = { id: 'andre', role: 'coach' } as Admin;
  const wrapper = await view();
  expect(wrapper.findAll('tbody button').map((item) => item.text())).toEqual([
    'Ana García',
  ]);
  await wrapper.get('tbody button').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('Registrar check-in');
  user.value = { id: 'desk', role: 'reception' } as Admin;
  await flushPromises();
  expect(wrapper.text()).not.toContain('Registrar check-in');
  expect(wrapper.text()).toContain('Editar');
});

it('recarga el resumen y el historial después de guardar un check-in', async () => {
  const wrapper = await view();
  await wrapper.get('tbody button').trigger('click');
  await flushPromises();
  expect(wrapper.text()).toContain('Check-in pendiente');
  const register = wrapper
    .findAll('button')
    .find((button) => button.text() === 'Registrar check-in')!;
  await register.trigger('click');
  const checkin = {
    ...low,
    id: 'new',
    program: 'ana',
    adherence: 4,
    notes: 'Avanzó con el plan',
  };
  const updated = overview(
    'ana',
    'andre',
    'Ana',
    'active',
    [checkin],
    ana.renews_on,
  );
  api.listPrograms.mockResolvedValue([updated, bea, clara]);
  api.getProgram.mockResolvedValue({ program: updated, history: [checkin] });
  wrapper.getComponent(CheckinDialog).vm.$emit('update:visible', false);
  wrapper.getComponent(CheckinDialog).vm.$emit('saved');
  await flushPromises();
  expect(wrapper.text()).not.toContain('Check-in pendiente');
  expect(wrapper.text()).toContain('4 / 5');
  expect(wrapper.text()).toContain('Avanzó con el plan');
});
