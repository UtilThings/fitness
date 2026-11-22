import { flushPromises, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { beforeEach, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import type { ClassTemplate } from '@/lib/schedule-week';
import ClassTemplatesView from './ClassTemplatesView.vue';
import ScheduleBlocksView from './ScheduleBlocksView.vue';

const api = vi.hoisted(() => ({
  assignCoach: vi.fn(),
  loadTemplates: vi.fn(),
  loadBlocks: vi.fn(),
  countBlockSessions: vi.fn(),
  createBlock: vi.fn(),
  confirm: vi.fn(),
  createTemplate: vi.fn(),
}));
const isOwner = ref(true);
const route = reactive({ query: {} as { coach?: string } });
const templates = ref<ClassTemplate[]>([]);
const blocks = ref([
  {
    id: 'holiday',
    title: 'Thanksgiving',
    date_from: '2026-11-26',
    date_to: '2026-11-26',
  },
]);
vi.mock('vue-router', () => ({ useRoute: () => route }));
vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: api.confirm }),
}));
vi.mock('@/composables/useAuth', () => ({ useAuth: () => ({ isOwner }) }));
vi.mock('@/composables/useSchedule', () => ({
  useSchedule: () => ({
    ...api,
    templates,
    blocks,
    loading: ref(false),
    error: ref(null),
  }),
}));
vi.mock('@/composables/useNotify', () => ({
  useNotify: () => ({ success: vi.fn(), error: vi.fn() }),
}));
vi.mock('@/composables/useServices', () => ({
  useServices: () => ({
    items: ref([{ id: 'jump', name: 'Tropical Jump', active: true }]),
    coachOptions: ref([
      { label: 'Coach JQ', value: 'jq' },
      { label: 'Otro coach', value: 'other' },
    ]),
    load: vi.fn(),
    loadCoaches: vi.fn(),
    error: ref(null),
    coachesError: ref(null),
  }),
}));

const global = {
  plugins: [PrimeVue],
  stubs: {
    Dialog: {
      props: ['visible'],
      template: '<section v-if="visible"><slot /></section>',
    },
    Select: {
      props: ['options', 'modelValue', 'inputId'],
      emits: ['update:modelValue'],
      template: `<select :id="inputId" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)"><option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option></select>`,
    },
    DatePicker: {
      props: ['modelValue', 'inputId'],
      emits: ['update:modelValue'],
      template: `<input :id="inputId" type="date" @input="$emit('update:modelValue', new Date($event.target.value + 'T12:00:00'))" />`,
    },
  },
};

beforeEach(() => {
  vi.resetAllMocks();
  isOwner.value = true;
  route.query = {};
  api.assignCoach.mockImplementation(async (id: string, coach: string) => {
    templates.value = templates.value.map((item) =>
      item.id === id ? { ...item, coach } : item,
    );
    return { updated_sessions: 4 };
  });
  templates.value = [
    [1, '19:30'],
    [2, '09:00'],
    [2, '17:30'],
    [2, '19:00'],
    [3, '19:30'],
    [4, '09:00'],
    [4, '17:30'],
    [4, '19:00'],
    [6, '09:00'],
  ].map(([weekday, time], index) => ({
    id: 'template-' + index,
    collectionId: 'templates',
    collectionName: 'class_templates',
    weekday: Number(weekday),
    start_time: String(time),
    service: 'jump',
    coach: index === 0 ? 'jq' : '',
    duration_min: 60,
    capacity: 12,
    active: true,
  }));
});

it('groups nine templates by day and applies coach assignments with either setting', async () => {
  const wrapper = mount(ClassTemplatesView, { global });
  expect(api.loadTemplates).toHaveBeenCalledOnce();
  expect(wrapper.findAll('tbody tr').length).toBe(9 + 5);
  expect(wrapper.text()).toContain('Lunes');
  expect(wrapper.text()).toContain('Sábado');
  const select = wrapper.get(
    'select[aria-label="Coach de la plantilla Lunes 19:30"]',
  );
  await select.setValue('other');
  await flushPromises();
  expect(api.assignCoach).toHaveBeenLastCalledWith(
    'template-0',
    'other',
    false,
  );
  await wrapper.get('input[type="checkbox"]').setValue(true);
  await wrapper
    .get('select[aria-label="Coach de la plantilla Lunes 19:30"]')
    .setValue('jq');
  await flushPromises();
  expect(api.assignCoach).toHaveBeenLastCalledWith('template-0', 'jq', true);
  expect(api.loadTemplates).toHaveBeenCalledTimes(3);
  route.query = { coach: 'jq' };
  await flushPromises();
  expect(wrapper.findAll('tbody tr').length).toBe(2);
});

it('creates an active template through its form', async () => {
  const wrapper = mount(ClassTemplatesView, { global });
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Nueva plantilla')!
    .trigger('click');
  await wrapper.get('#template-service').setValue('jump');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.createTemplate).toHaveBeenCalledWith(
    expect.objectContaining({
      service: 'jump',
      weekday: 0,
      start_time: '09:00',
      active: true,
    }),
  );
});

it('previews the scheduled count before saving the selected civil dates', async () => {
  api.countBlockSessions.mockResolvedValue(3);
  const wrapper = mount(ScheduleBlocksView, { global });
  expect(api.loadBlocks).toHaveBeenCalledOnce();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Nuevo bloqueo')!
    .trigger('click');
  await wrapper.get('#block-title').setValue('Feriado');
  await wrapper.get('#block-from').setValue('2026-11-27');
  await wrapper.get('#block-to').setValue('2026-11-26');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('igual o posterior');
  expect(api.countBlockSessions).not.toHaveBeenCalled();
  await wrapper.get('#block-from').setValue('2026-11-26');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(api.countBlockSessions).toHaveBeenCalledWith(
    '2026-11-26',
    '2026-11-26',
  );
  expect(api.confirm).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'Se cancelarán 3 sesiones.' }),
  );
  expect(api.createBlock).not.toHaveBeenCalled();
  api.confirm.mock.calls[0]![0].accept();
  await flushPromises();
  expect(api.createBlock).toHaveBeenCalledWith({
    title: 'Feriado',
    date_from: '2026-11-26',
    date_to: '2026-11-26',
    reason: '',
  });
});

it('gives coaches read-only access to both views', () => {
  isOwner.value = false;
  const templateView = mount(ClassTemplatesView, { global });
  expect(templateView.text()).toContain('Lunes');
  expect(templateView.find('select').exists()).toBe(false);
  expect(templateView.text()).not.toContain('Nueva plantilla');
  const blockView = mount(ScheduleBlocksView, { global });
  expect(blockView.text()).toContain('Thanksgiving');
  expect(blockView.text()).not.toContain('Nuevo bloqueo');
  expect(blockView.text()).not.toContain('Eliminar');
});
