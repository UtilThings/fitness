import type { Role } from '@/types/pb';
import AdminLayout from '@/layouts/AdminLayout.vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ valid: false, role: null as Role | null }));

vi.mock('@/composables/useAuth', async () => {
  const { computed } = await import('vue');
  return {
    useAuth: () => ({
      isAuthenticated: computed(() => state.valid),
      role: computed(() => state.role),
    }),
  };
});

import router, { safeRedirect } from '@/router';

router.addRoute({
  path: '/owner-only',
  component: { template: '<RouterView />' },
  meta: { roles: ['owner'] },
  children: [
    {
      path: 'details',
      name: 'owner-details',
      component: { template: '<div />' },
      meta: { roles: ['owner', 'coach'] },
    },
  ],
});

describe('guard', () => {
  beforeEach(async () => {
    state.valid = false;
    state.role = null;
    await router.push('/login');
    await router.isReady();
  });

  it('sin sesión redirige a /login con redirect', async () => {
    await router.push('/');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/');
  });

  it.each([
    '/clients?q=ana',
    '/clients/ana',
    '/team',
    '/team/coach',
    '/settings/profile',
    '/services',
    '/classes?coach=jq',
    '/classes/templates',
    '/classes/blocks',
    '/plans?service=jump',
  ])('protege %s y conserva la ruta al iniciar sesión', async (path) => {
    await router.push(path);
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe(path);
  });

  it.each(['owner', 'coach', 'reception'] as const)(
    'permite consultar equipo, ficha y perfil con el rol %s',
    async (role) => {
      state.valid = true;
      state.role = role;
      for (const [path, name, title] of [
        ['/clients', 'clients', 'Clientes'],
        ['/clients/ana', 'client-detail', 'Cliente'],
        ['/team', 'team', 'Equipo'],
        ['/services', 'services', 'Servicios'],
        ['/plans', 'plans', 'Planes'],
        ['/classes/templates', 'classes-templates', 'Plantillas de clases'],
        ['/classes/blocks', 'classes-blocks', 'Bloqueos de horario'],
        ['/team/coach', 'team-member', 'Ficha del equipo'],
        ['/settings/profile', 'profile', 'Mi perfil'],
      ] as const) {
        await router.push(path);
        expect(router.currentRoute.value.name).toBe(name);
        expect(router.currentRoute.value.meta.title).toBe(title);
        expect(router.currentRoute.value.matched[0].components?.default).toBe(
          AdminLayout,
        );
      }
    },
  );

  it('con sesión permite / y expulsa de /login', async () => {
    state.valid = true;
    await router.push('/');
    expect(router.currentRoute.value.name).toBe('dashboard');
    await router.push('/login');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it.each(['coach', null] as const)(
    'redirige el rol %s a la vista 403 dentro del layout',
    async (role) => {
      state.valid = true;
      state.role = role;
      await router.push('/owner-only/details');
      expect(router.currentRoute.value.fullPath).toBe('/forbidden');
      expect(router.currentRoute.value.meta.title).toBe('Sin permiso');
      expect(router.currentRoute.value.matched[0].components?.default).toBe(
        AdminLayout,
      );
    },
  );

  it('permite al owner entrar a la ruta restringida', async () => {
    state.valid = true;
    state.role = 'owner';
    await router.push('/owner-only/details');
    expect(router.currentRoute.value.name).toBe('owner-details');
  });

  it('solicita iniciar sesión antes de comprobar los roles', async () => {
    await router.push('/owner-only/details?tab=1');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe(
      '/owner-only/details?tab=1',
    );
  });

  it('ruta desconocida muestra not-found', async () => {
    await router.push('/no-existe');
    expect(router.currentRoute.value.name).toBe('not-found');
  });
});

describe('safeRedirect', () => {
  it('acepta rutas internas', () => {
    expect(safeRedirect('/perfil?x=1')).toBe('/perfil?x=1');
  });

  it('rechaza destinos externos o vacíos', () => {
    expect(safeRedirect('//evil.com')).toBe('/');
    expect(safeRedirect('https://evil.com')).toBe('/');
    expect(safeRedirect('/\\evil.com')).toBe('/');
    expect(safeRedirect(undefined)).toBe('/');
    expect(safeRedirect(null)).toBe('/');
  });
});

describe('layouts', () => {
  it('forgot-password es pública', async () => {
    state.valid = false;
    await router.push('/forgot-password');
    expect(router.currentRoute.value.name).toBe('forgot-password');
  });

  it('con sesión, forgot-password redirige al dashboard', async () => {
    await router.push('/no-existe');
    state.valid = true;
    await router.push('/forgot-password');
    expect(router.currentRoute.value.name).toBe('dashboard');
  });
});
