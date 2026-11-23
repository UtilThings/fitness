import { describe, expect, it, vi } from 'vitest';
import { buildAuditFilter, formatDiff } from '@/lib/audit';
import { pb } from '@/lib/pocketbase';

describe('buildAuditFilter', () => {
  it('omite los filtros vacíos y admite un solo filtro', () => {
    expect(buildAuditFilter({})).toBe('');
    expect(buildAuditFilter({ collection: 'bookings' })).toBe(
      'collection = "bookings"',
    );
  });

  it('envía los valores como parámetros y aplica los límites de un día de 23 horas', () => {
    const spy = vi.spyOn(pb, 'filter');
    try {
      const actor = 'staff" || id != "';
      const built = buildAuditFilter({
        collection: 'bookings',
        actor,
        from: '2026-03-08',
        to: '2026-03-08',
      });
      expect(spy).toHaveBeenCalledWith(
        'collection = {:collection} && actor = {:actor} && created >= {:from} && created < {:to}',
        {
          collection: 'bookings',
          actor,
          from: '2026-03-08 05:00:00.000Z',
          to: '2026-03-09 04:00:00.000Z',
        },
      );
      expect(built).toContain(String.raw`actor = "staff\" || id != \""`);
    } finally {
      spy.mockRestore();
    }
  });

  it('acepta límites por separado y rechaza fechas inválidas', () => {
    expect(buildAuditFilter({ to: '2026-11-01' })).toBe(
      'created < "2026-11-02 05:00:00.000Z"',
    );
    expect(() => buildAuditFilter({ to: '2026-02-30' })).toThrow(RangeError);
  });
});

describe('formatDiff', () => {
  it('conserva valores añadidos, cambiados y eliminados', () => {
    const notes = 'Texto largo '.repeat(100);
    expect(
      formatDiff({
        added: { to: notes },
        changed: { from: null, to: { value: false } },
        removed: { from: '' },
      }),
    ).toEqual([
      { field: 'added', before: undefined, after: notes },
      { field: 'changed', before: 'null', after: '{\n  "value": false\n}' },
      { field: 'removed', before: '', after: undefined },
    ]);
  });

  it('tolera diffs vacíos y filas antiguas sin pares de cambios', () => {
    expect(formatDiff(null)).toEqual([]);
    expect(formatDiff({ status: 'booked', notes: null })).toEqual([]);
  });
});
