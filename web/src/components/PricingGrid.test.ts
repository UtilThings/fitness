import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { jumpPlans } from '@/lib/data';
import PricingGrid from './PricingGrid.vue';

vi.mock('@/lib/env', () => ({
  env: {
    PUBLIC_API_URL: 'https://api.example.test',
    PUBLIC_BUSINESS_KEY: 'pk_fixture1_12345678901234567890123456789012',
    PUBLIC_API_TIMEOUT_MS: 500,
  },
}));

afterEach(() => vi.unstubAllGlobals());

const catalog = {
  version: 2,
  business: {
    name: 'Kent Fitness',
    city: 'New York, NY',
    logo_url: '',
    currency: 'COP',
    timezone: 'America/New_York',
  },
  currency: 'COP',
  services: [
    {
      slug: 'tropical-jump',
      name: 'Tropical Jump',
      kind: 'group',
      weekly_times: [],
      plans: [
        {
          name: 'Single Class',
          price_cents: 2250,
          billing_unit: 'per_class',
          sessions: 1,
          per_week: 0,
          commitment_periods: 0,
          is_first_class: false,
          partner: false,
          note: '',
        },
      ],
    },
  ],
};

const props = {
  group: 'jumpPlans' as const,
  plans: jumpPlans,
  to: '/schedule',
  cta: 'Book now',
  featuredIndex: 1,
};

it('renders the initial build plans while revalidating and uses updated cents', async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi.fn<typeof globalThis.fetch>(
    () =>
      new Promise<Response>((done) => {
        resolve = done;
      }),
  );
  vi.stubGlobal('fetch', fetch);
  const wrapper = mount(PricingGrid, {
    props,
    slots: { default: '<p>Weekly classes</p>' },
  });
  expect(wrapper.get('.card-surface').text()).toContain('$15');
  const featured = wrapper.get('.card-surface.border-primary');
  expect(featured.text()).toContain('Most popular');
  expect(featured.text()).toContain('Free');
  expect(featured.get('a').attributes('href')).toBe('/schedule');
  await wrapper.vm.$nextTick();
  expect(wrapper.get('[role="status"]').text()).toBe('Updating…');
  resolve(Response.json(catalog));
  await flushPromises();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0]?.[1]).toMatchObject({
    headers: {
      'X-Business-Key': 'pk_fixture1_12345678901234567890123456789012',
    },
  });
  expect(wrapper.get('.card-surface').text()).toContain('COP');
  expect(wrapper.get('.card-surface').text()).toContain('22.50');
  expect(wrapper.text()).toContain('Weekly classes');
  expect(wrapper.get('[role="status"]').text()).toBe('');
  wrapper.unmount();
});

it('retains the build plans when the public API is unavailable', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
  );
  const wrapper = mount(PricingGrid, { props });
  await flushPromises();
  expect(
    wrapper.findAll('.card-surface').map((card) => card.get('h3').text()),
  ).toEqual(['Single Class', 'First Class']);
  expect(fetch).toHaveBeenCalledTimes(1);
  wrapper.unmount();
});
