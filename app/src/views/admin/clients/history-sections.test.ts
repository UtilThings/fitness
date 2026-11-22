import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import ClientBookings from '@/components/bookings/ClientBookings.vue';
import ClientHistoryTab from '@/components/clients/ClientHistoryTab.vue';
import { historySections } from './history-sections';

it('reserva claves únicas para reservas, membresías y pagos', () => {
  const keys = historySections.map(({ key }) => key);
  expect(keys).toEqual(['bookings', 'memberships', 'payments']);
  expect(new Set(keys).size).toBe(keys.length);
});

it('monta Reservas con el identificador del cliente y conserva las secciones pendientes', () => {
  const wrapper = mount(ClientHistoryTab, {
    props: { clientId: 'ana' },
    global: { stubs: { ClientBookings: true } },
  });
  const sections = wrapper.findAll('section');
  expect(sections.map((section) => section.get('h2').text())).toEqual([
    'Reservas',
    'Membresías',
    'Pagos',
  ]);
  expect(wrapper.findComponent(ClientBookings).props('clientId')).toBe('ana');
  expect(wrapper.text()).not.toContain('Disponible con la feature 011');
  for (const feature of ['013', '014']) {
    expect(wrapper.text()).toContain('Disponible con la feature ' + feature);
  }
});
