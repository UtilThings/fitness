import { describe, expect, it } from 'vitest';
import { adminNav, visibleNav } from '@/layouts/admin-nav';
import router from '@/router';

describe('adminNav', () => {
  const items = adminNav.flatMap((group) => group.items);

  it('mantiene los cinco grupos acordados, sin badges', () => {
    expect(
      adminNav.map(({ label, items }) => [label, items.map(({ to }) => to)]),
    ).toEqual([
      ['Análisis', ['/', '/reports']],
      [
        'Operaciones',
        [
          '/clients',
          '/communications',
          '/coaching',
          '/classes',
          '/agenda',
          '/classes/templates',
          '/classes/blocks',
          '/bookings',
        ],
      ],
      ['Catálogo', ['/plans']],
      [
        'Ajustes',
        [
          '/services',
          '/audit',
          '/team',
          '/settings/business',
          '/settings/integration',
          '/settings/profile',
        ],
      ],
      ['Facturación', ['/memberships', '/payments']],
    ]);
    expect(items.every((item) => !('badge' in item))).toBe(true);
  });

  it('usa rutas internas y únicas', () => {
    const routes = items.map((item) => item.to);
    routes.forEach((to) => expect(to).toMatch(/^\/(?!\/)/));
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('solo habilita entradas que corresponden a rutas registradas', () => {
    const paths = router.getRoutes().map(({ path }) => path);
    const enabled = items.filter(({ placeholder }) => !placeholder);
    expect(enabled.map(({ to }) => to)).toEqual(
      expect.arrayContaining([
        '/',
        '/reports',
        '/clients',
        '/communications',
        '/coaching',
        '/team',
        '/settings/profile',
        '/services',
        '/plans',
        '/classes',
        '/agenda',
        '/classes/templates',
        '/classes/blocks',
        '/memberships',
        '/payments',
      ]),
    );
    enabled.forEach(({ to }) => expect(paths).toContain(to));
  });

  it.each(['owner', 'coach', 'reception'] as const)(
    'habilita Reportes para %s',
    (role) => {
      const analysis = visibleNav(role).find(
        ({ label }) => label === 'Análisis',
      );
      expect(analysis?.items).toContainEqual({
        label: 'Reportes',
        icon: 'pi pi-chart-bar',
        to: '/reports',
      });
    },
  );

  it('filtra pagos para coach y permite verlos a owner y reception', () => {
    const paths = (groups: ReturnType<typeof visibleNav>) =>
      groups.flatMap(({ items }) => items.map(({ to }) => to));
    expect(paths(visibleNav('coach'))).not.toContain('/payments');
    expect(paths(visibleNav('owner'))).toContain('/payments');
    expect(paths(visibleNav('reception'))).toContain('/payments');
  });

  it('muestra auditoría solo al owner', () => {
    const paths = (role: Parameters<typeof visibleNav>[0]) =>
      visibleNav(role).flatMap(({ items }) => items.map(({ to }) => to));
    expect(paths('owner')).toContain('/settings/business');
    expect(paths('owner')).toContain('/settings/integration');
    expect(paths('coach')).not.toContain('/settings/business');
    expect(paths('coach')).not.toContain('/settings/integration');
    expect(paths('reception')).not.toContain('/settings/business');
    expect(paths('reception')).not.toContain('/settings/integration');
    expect(paths('owner')).toContain('/audit');
    expect(paths('coach')).not.toContain('/audit');
    expect(paths('reception')).not.toContain('/audit');
    expect(paths(null)).not.toContain('/audit');
  });

  it('descarta un grupo cuando todas sus entradas requieren owner', () => {
    adminNav.push({
      label: 'Solo owner',
      items: [
        {
          label: 'Prueba',
          to: '/prueba',
          icon: 'pi pi-lock',
          roles: ['owner'],
        },
      ],
    });
    try {
      expect(
        visibleNav('owner').some(({ label }) => label === 'Solo owner'),
      ).toBe(true);
      expect(
        visibleNav('coach').some(({ label }) => label === 'Solo owner'),
      ).toBe(false);
      expect(visibleNav(null).some(({ label }) => label === 'Solo owner')).toBe(
        false,
      );
    } finally {
      adminNav.pop();
    }
  });
});
