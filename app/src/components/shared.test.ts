import { enableAutoUnmount, mount } from '@vue/test-utils';
import PrimeVue from 'primevue/config';
import { afterEach, expect, it, vi } from 'vitest';
import DataToolbar from './DataToolbar.vue';
import EmptyState from './EmptyState.vue';
import PageHeader from './PageHeader.vue';
import StatusTag from './StatusTag.vue';

enableAutoUnmount(afterEach);
afterEach(() => vi.useRealTimers());

const global = { plugins: [PrimeVue] };

it('renders the page title, description and actions', () => {
  const wrapper = mount(PageHeader, {
    props: { title: 'Equipo', description: 'Integrantes del gimnasio' },
    slots: { actions: '<button>Nuevo integrante</button>' },
  });
  expect(wrapper.get('h1').text()).toBe('Equipo');
  expect(wrapper.get('p').text()).toBe('Integrantes del gimnasio');
  expect(wrapper.get('button').text()).toBe('Nuevo integrante');
});

it('renders the empty-state icon, text and action', () => {
  const wrapper = mount(EmptyState, {
    props: {
      title: 'Sin registros',
      icon: 'pi pi-users',
      description: 'Agrega un integrante',
    },
    slots: { default: '<button>Agregar</button>' },
  });
  expect(wrapper.get('.pi-users').attributes('aria-hidden')).toBe('true');
  expect(wrapper.get('h2').text()).toBe('Sin registros');
  expect(wrapper.get('p').text()).toBe('Agrega un integrante');
  expect(wrapper.get('button').text()).toBe('Agregar');
});

it('gives mapped statuses a label and severity, with a fallback for unknown values', async () => {
  const wrapper = mount(StatusTag, {
    global,
    props: {
      value: 'active',
      map: { active: { label: 'Activo', severity: 'success' } },
    },
  });
  expect(wrapper.get('.p-tag-success').text()).toBe('Activo');
  await wrapper.setProps({ value: 'toString' });
  expect(wrapper.get('.p-tag-secondary').text()).toBe('toString');
});

it('updates the model immediately and emits one search 300ms after the last input', async () => {
  vi.useFakeTimers();
  const wrapper = mount(DataToolbar, {
    global,
    props: { placeholder: 'Buscar equipo', modelValue: 'Ana' },
    slots: {
      actions: '<button>Crear</button>',
      filters: '<label>Estado</label>',
    },
  });
  const input = wrapper.get('input');
  expect(input.element.value).toBe('Ana');
  expect(input.attributes('aria-label')).toBe('Buscar equipo');
  expect(wrapper.get('label').text()).toBe('Estado');
  expect(wrapper.get('button').text()).toBe('Crear');

  await input.setValue('Ju');
  vi.advanceTimersByTime(200);
  await input.setValue('Julia');
  await wrapper.setProps({ modelValue: 'Julia' });
  expect(wrapper.emitted('update:modelValue')).toEqual([['Ju'], ['Julia']]);
  vi.advanceTimersByTime(299);
  expect(wrapper.emitted('search')).toBeUndefined();
  vi.advanceTimersByTime(1);
  expect(wrapper.emitted('search')).toEqual([['Julia']]);
});

it('cancels a pending search after a model reset or unmount', async () => {
  vi.useFakeTimers();
  const wrapper = mount(DataToolbar, { global, props: { modelValue: 'Ana' } });
  const input = wrapper.get('input');
  await input.setValue('Julia');
  await wrapper.setProps({ modelValue: '' });
  vi.advanceTimersByTime(300);
  expect(input.element.value).toBe('');
  expect(wrapper.emitted('search')).toBeUndefined();

  await input.setValue('María');
  wrapper.unmount();
  vi.advanceTimersByTime(300);
  expect(vi.getTimerCount()).toBe(0);
  expect(wrapper.emitted('search')).toBeUndefined();
});
