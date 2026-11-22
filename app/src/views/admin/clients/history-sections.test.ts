import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import ClientHistoryTab from '@/components/clients/ClientHistoryTab.vue';
import { historySections } from './history-sections';

it('reserva claves únicas para reservas, membresías y pagos', () => {
  const keys = historySections.map(({ key }) => key);
  expect(keys).toEqual(['bookings', 'memberships', 'payments']);
  expect(new Set(keys).size).toBe(keys.length);
});

it('muestra cada módulo pendiente sin montar un componente de historial', () => {
  const wrapper = mount(ClientHistoryTab, { props: { clientId: 'ana' } });
  const sections = wrapper.findAll('section');
  expect(sections.map((section) => section.get('h2').text())).toEqual([
    'Reservas',
    'Membresías',
    'Pagos',
  ]);
  expect(sections.map((section) => section.get('p').text())).toEqual(
    ['011', '013', '014'].map(
      (feature) => 'Disponible con la feature ' + feature,
    ),
  );
  expect(
    historySections.every(
      ({ available, component }) => !available && component === null,
    ),
  ).toBe(true);
});
