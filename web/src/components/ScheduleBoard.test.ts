import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LANG_EVENT } from '@/lib/i18n';
import ScheduleBoard from './ScheduleBoard.vue';

beforeEach(() => vi.setSystemTime(new Date(2026, 10, 19, 13)));
afterEach(() => vi.useRealTimers());

it('filters the expected days and displays the available classes', async () => {
  const wrapper = mount(ScheduleBoard);
  const days = () => wrapper.findAll('.text-3xl').map((day) => day.text());
  const filter = (label: string) =>
    wrapper.findAll('button').find((button) => button.text() === label)!;

  expect(wrapper.findAll('.card-surface')).toHaveLength(9);
  await filter('Tropical Jump').trigger('click');
  expect(days()).toEqual(['Mon', 'Wed', 'Sat']);
  expect(wrapper.findAll('.card-surface')).toHaveLength(3);
  await filter('Group Strength').trigger('click');
  expect(days()).toEqual(['Tue', 'Thu']);
  expect(wrapper.findAll('.card-surface')).toHaveLength(6);
  wrapper.unmount();
});

it('moves between weeks with the current week as the lower bound', async () => {
  const wrapper = mount(ScheduleBoard);
  const previous = wrapper.get<HTMLButtonElement>(
    '[aria-label="Previous week"]',
  );
  const next = wrapper.get('[aria-label="Next week"]');
  const range = wrapper.get('[aria-live="polite"]');

  expect(previous.element.disabled).toBe(true);
  expect(range.text()).toBe('Nov 15 – Nov 21');
  await next.trigger('click');
  expect(range.text()).toBe('Nov 22 – Nov 28');
  await previous.trigger('click');
  expect(range.text()).toBe('Nov 15 – Nov 21');
  expect(previous.element.disabled).toBe(true);
  wrapper.unmount();
});

it('styles availability, links to contact and translates every status', async () => {
  const wrapper = mount(ScheduleBoard);
  const next = wrapper.get('[aria-label="Next week"]');
  for (
    let week = 0;
    week < 8 && !wrapper.find('.btn-outline').exists();
    week += 1
  ) {
    await next.trigger('click');
  }
  const normal = wrapper.get('.card-surface:has(.btn-primary)');
  const full = wrapper.get('.card-surface:has(.btn-outline)');
  expect(full.get('.text-destructive').text()).toBe('Full');
  expect(full.get('p.mt-3').text()).toMatch(/^0 \/ \d+ spots left$/);
  expect(full.get('a').text()).toBe('Join waitlist');
  expect(normal.get('a').text()).toBe('Reserve');
  expect(
    wrapper
      .findAll('.card-surface a')
      .every((link) => link.attributes('href') === '/contact'),
  ).toBe(true);

  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: 'es' }));
  await wrapper.vm.$nextTick();
  expect(full.text()).toContain('Lleno');
  expect(full.text()).toContain('Lista de espera');
  expect(normal.text()).toContain('Reservar');
  expect(wrapper.text()).toContain('cupos');

  const alternateWeeks = [wrapper.text()];
  for (let week = 0; week < 4; week += 1) {
    await next.trigger('click');
    alternateWeeks.push(wrapper.text());
  }
  expect(alternateWeeks.join(' ')).toContain('Casi lleno');
  expect(alternateWeeks.join(' ')).toContain('Disponible');
  wrapper.unmount();
});
