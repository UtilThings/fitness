import { flushPromises } from '@vue/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { Admin, Business } from '@/types/pb';

const mocks = vi.hoisted(() => ({ getOne: vi.fn(), authRefresh: vi.fn() }));
const user = ref<Admin | null>(null);
const isAuthenticated = ref(true);
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({ user, isAuthenticated }),
}));
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: () => ({
      getOne: mocks.getOne,
      authRefresh: mocks.authRefresh,
    }),
    files: {
      getURL: (record: Business, name: string) => `files/${record.id}/${name}`,
    },
  },
}));

import { useBusiness } from './useBusiness';
import { formatMoney } from '@/lib/money';
import { localParts } from '@/lib/datetime';

const a = {
  id: 'a',
  name: 'New York Fitness',
  logo: 'a.png',
  currency: 'USD',
  timezone: 'America/New_York',
} as Business;
const b = {
  id: 'b',
  name: 'Bogotá Fitness',
  logo: 'b.png',
  currency: 'COP',
  timezone: 'America/Bogota',
} as Business;
const admin = (business: Business, expand = true) =>
  ({
    business: business.id,
    expand: expand ? { business } : undefined,
  }) as Admin;

afterEach(() => {
  user.value = null;
  mocks.getOne.mockReset();
});

it('switches the brand, logo, date and currency with the session and clears them on sign-out', () => {
  const { business, logoUrl } = useBusiness();
  const instant = '2026-06-02T04:30:00Z';
  user.value = admin(a);
  expect(business.value?.name).toBe(a.name);
  expect(logoUrl.value).toBe('files/a/a.png');
  expect(localParts(instant).date).toBe('2026-06-02');
  expect(formatMoney(1250)).toBe('$12.50');
  user.value = admin(b);
  expect(business.value?.name).toBe(b.name);
  expect(logoUrl.value).toBe('files/b/b.png');
  expect(localParts(instant).date).toBe('2026-06-01');
  expect(formatMoney(1250)).toContain('COP');
  user.value = null;
  expect(business.value).toBeNull();
  expect(logoUrl.value).toBeUndefined();
});

it('ignores a business response from an earlier session', async () => {
  let resolve!: (record: Business) => void;
  mocks.getOne.mockReturnValue(
    new Promise<Business>((done) => {
      resolve = done;
    }),
  );
  const { business, loading, updateBusiness } = useBusiness();
  user.value = admin(a, false);
  expect(loading.value).toBe(true);
  user.value = admin(b);
  resolve(a);
  await flushPromises();
  expect(business.value?.id).toBe('b');
  updateBusiness({ ...a, name: 'Other' });
  expect(business.value?.name).toBe(b.name);
});
