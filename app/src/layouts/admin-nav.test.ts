import { describe, expect, it } from 'vitest';
import { adminNav } from '@/layouts/admin-nav';

describe('adminNav', () => {
  const items = adminNav.flatMap((g) => g.items);

  it('todo grupo tiene entradas', () => {
    adminNav.forEach((g) => expect(g.items.length).toBeGreaterThan(0));
  });

  it('las rutas son internas y únicas', () => {
    const tos = items.map((i) => i.to);
    tos.forEach((to) => expect(to).toMatch(/^\/(?!\/)/));
    expect(new Set(tos).size).toBe(tos.length);
  });

  it('incluye el dashboard en /', () => {
    expect(items.some((i) => i.to === '/')).toBe(true);
  });
});
