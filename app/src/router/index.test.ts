import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ valid: false }));

vi.mock('@/composables/useAuth', async () => {
  const { computed } = await import('vue');
  return {
    useAuth: () => ({ isAuthenticated: computed(() => state.valid) }),
  };
});

import router, { safeRedirect } from '@/router';

describe('guard', () => {
  beforeEach(async () => {
    state.valid = false;
    await router.push('/login');
    await router.isReady();
  });

  it('sin sesión redirige a /login con redirect', async () => {
    await router.push('/');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/');
  });

  it('con sesión permite / y expulsa de /login', async () => {
    state.valid = true;
    await router.push('/');
    expect(router.currentRoute.value.name).toBe('dashboard');
    await router.push('/login');
    expect(router.currentRoute.value.name).toBe('dashboard');
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
