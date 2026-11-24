import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import { expect, it, vi } from 'vitest';
import AdminLayout from './AdminLayout.vue';
import AuthLayout from './AuthLayout.vue';

const brand = ref<{ name: string } | null>(null);
const logoUrl = ref('');
vi.mock('@/composables/useBusiness', () => ({
  useBusiness: () => ({
    business: brand,
    logoUrl,
    loading: ref(false),
    error: ref(false),
  }),
}));
vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: ref(null),
    role: ref('owner'),
    avatarUrl: ref(''),
    logout: vi.fn(),
  }),
}));

async function routerFor(title: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' }, meta: { title } },
    ],
  });
  await router.push('/');
  return router;
}

it('updates the sidebar and title when the business changes', async () => {
  brand.value = { name: 'First Fitness' };
  logoUrl.value = 'https://pb.example.test/a.png';
  const wrapper = mount(AdminLayout, {
    shallow: true,
    global: {
      plugins: [await routerFor('Dashboard')],
      renderStubDefaultSlot: true,
    },
  });
  expect(wrapper.text()).toContain('First Fitness');
  expect(wrapper.get('img').attributes('src')).toContain('a.png');
  expect(document.title).toBe('Dashboard · First Fitness');
  brand.value = { name: 'Second Fitness' };
  logoUrl.value = 'https://pb.example.test/b.png';
  await nextTick();
  expect(wrapper.text()).toContain('Second Fitness');
  expect(wrapper.get('img').attributes('src')).toContain('b.png');
  expect(document.title).toBe('Dashboard · Second Fitness');
  wrapper.unmount();
});

it('keeps the login layout and title neutral', async () => {
  const wrapper = mount(AuthLayout, {
    global: { plugins: [await routerFor('Iniciar sesión')] },
  });
  expect(wrapper.text()).toContain('Admin');
  expect(wrapper.text()).not.toContain('Second Fitness');
  expect(wrapper.find('img').exists()).toBe(false);
  expect(document.title).toBe('Iniciar sesión · Admin');
  wrapper.unmount();
});
