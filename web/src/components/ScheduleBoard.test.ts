import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { PublicSession } from '@/lib/api';
import { LANG_EVENT } from '@/lib/i18n';
import ScheduleBoard from './ScheduleBoard.vue';

vi.mock('@/lib/env', () => ({
  env: {
    PUBLIC_API_URL: 'https://api.example.test',
    PUBLIC_API_TIMEOUT_MS: 4000,
  },
}));

beforeEach(() => vi.setSystemTime(new Date('2026-11-22T02:00:00Z')));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const group = { slug: 'group-strength', name: 'Group Strength' };
const jump = { slug: 'tropical-jump', name: 'Tropical Jump' };
const sessions: PublicSession[] = [
  {
    local_date: '2026-11-16',
    local_time: '19:30',
    service: jump,
    coach_name: 'Coach JQ',
    capacity: 12,
    spots_left: 0,
    status: 'full',
  },
  {
    local_date: '2026-11-17',
    local_time: '09:00',
    service: group,
    coach_name: 'Coach JQ',
    capacity: 6,
    spots_left: 2,
    status: 'almost',
  },
  {
    local_date: '2026-11-17',
    local_time: '17:30',
    service: group,
    coach_name: '',
    capacity: 6,
    spots_left: 5,
    status: 'available',
  },
];

function schedule(week: string, classes: PublicSession[], maxWeeks?: number) {
  const last = new Date(`${week}T00:00:00Z`);
  last.setUTCDate(last.getUTCDate() + 6);
  return Response.json(
    {
      version: 1,
      timezone: 'America/New_York',
      week_start: week,
      week_end: last.toISOString().slice(0, 10),
      sessions: classes,
    },
    {
      headers:
        maxWeeks === undefined
          ? {}
          : { 'X-Public-Schedule-Max-Weeks': String(maxWeeks) },
    },
  );
}

it('requests the Miramar week and renders real availability, filters and translations', async () => {
  const fetch = vi.fn(() => Promise.resolve(schedule('2026-11-15', sessions)));
  vi.stubGlobal('fetch', fetch);
  const wrapper = mount(ScheduleBoard);
  expect(wrapper.get('[role="status"]').text()).toBe('Loading classes…');
  await flushPromises();

  expect(fetch.mock.calls.at(0)).toEqual([
    'https://api.example.test/api/public/schedule?week=2026-11-15',
    { credentials: 'omit', signal: expect.any(AbortSignal) },
  ]);
  expect(wrapper.get('[aria-live="polite"]').text()).toBe('Nov 15 – Nov 21');
  expect(wrapper.findAll('.text-3xl').map((day) => day.text())).toEqual([
    'Mon',
    'Tue',
  ]);
  const [full, almost, available] = wrapper.findAll('.card-surface');
  expect(full.text()).toContain('0 / 12 spots left');
  expect(full.get('.text-destructive').text()).toBe('Full');
  expect(full.get('a').text()).toBe('Join waitlist');
  expect(full.get('a').attributes('href')).toBe('/contact');
  expect(almost.text()).toContain('2 / 6 spots left');
  expect(almost.get('.text-accent').text()).toBe('Almost full');
  expect(available.get('a').text()).toBe('Reserve');

  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: 'es' }));
  await wrapper.vm.$nextTick();
  expect(full.text()).toContain('Lista de espera');
  expect(almost.text()).toContain('Casi lleno');
  expect(available.text()).toContain('Disponible');
  expect(available.text()).toContain('5 / 6 cupos');
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Tropical Jump')!
    .trigger('click');
  expect(wrapper.findAll('.card-surface')).toHaveLength(1);
  wrapper.unmount();
});

it('aborts pending weeks and ignores a late result even if the transport resolves', async () => {
  const calls: {
    url: string;
    signal?: AbortSignal | null;
    resolve: (response: Response) => void;
  }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(
      (url: string, { signal }: RequestInit) =>
        new Promise<Response>((resolve) => {
          calls.push({ url, signal, resolve });
        }),
    ),
  );
  const wrapper = mount(ScheduleBoard);
  const previous = wrapper.get<HTMLButtonElement>(
    '[aria-label="Previous week"]',
  );
  const next = wrapper.get<HTMLButtonElement>('[aria-label="Next week"]');
  expect(previous.element.disabled).toBe(true);
  await next.trigger('click');
  expect(calls[0].signal?.aborted).toBe(true);
  expect(calls[1].url).toContain('week=2026-11-22');
  calls[1].resolve(schedule('2026-11-22', []));
  await flushPromises();
  expect(wrapper.text()).toContain('No classes to show this week.');
  calls[0].resolve(schedule('2026-11-15', sessions));
  await flushPromises();
  expect(wrapper.get('[aria-live="polite"]').text()).toBe('Nov 22 – Nov 28');
  expect(wrapper.findAll('.card-surface')).toHaveLength(0);
  for (let index = 0; index < 7; index += 1) await next.trigger('click');
  expect(next.element.disabled).toBe(true);
  expect(calls.at(-1)?.url).toContain('week=2027-01-10');
  wrapper.unmount();
  expect(calls.at(-1)?.signal?.aborted).toBe(true);
});

it('shows the bilingual fallback without seat counts and recovers through retry', async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('offline'))
    .mockResolvedValueOnce(schedule('2026-11-15', sessions));
  vi.stubGlobal('fetch', fetch);
  const wrapper = mount(ScheduleBoard);
  await flushPromises();
  const cards = wrapper.findAll('.card-surface');
  expect(cards).toHaveLength(9);
  expect(wrapper.text()).toContain('Showing the regular weekly schedule.');
  expect(
    cards.every((card) => card.text().includes('Check availability')),
  ).toBe(true);
  expect(wrapper.text()).not.toContain('spots left');
  expect(
    cards.every((card) => card.get('a').attributes('href') === '/contact'),
  ).toBe(true);
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: 'es' }));
  await wrapper.vm.$nextTick();
  expect(wrapper.text()).toContain('Consulta disponibilidad');
  expect(wrapper.text()).toContain('Mostramos el horario semanal habitual.');
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Reintentar')!
    .trigger('click');
  await flushPromises();
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(wrapper.findAll('.card-surface')).toHaveLength(3);
  expect(wrapper.text()).not.toContain('Consulta disponibilidad');
  wrapper.unmount();
});

it('uses the navigation limit configured on the API', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(schedule('2026-11-15', [], 0)),
  );
  const wrapper = mount(ScheduleBoard);
  await flushPromises();
  expect(
    wrapper.get<HTMLButtonElement>('[aria-label="Next week"]').element.disabled,
  ).toBe(true);
  wrapper.unmount();
});
