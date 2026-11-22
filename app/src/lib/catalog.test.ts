import { describe, expect, it } from 'vitest';
import {
  formatCents,
  policyLabel,
  reorder,
  serviceSlug,
  validatePlanForm,
  validateServiceForm,
  type PlanForm,
} from '@/lib/catalog';

describe('utilidades del catálogo', () => {
  it('formatea precios en centavos, política y slug', () => {
    expect([0, 80000, 108000, 128000, 144725].map(formatCents)).toEqual([
      'Gratis',
      '$800',
      '$1,080',
      '$1,280',
      '$1,447.25',
    ]);
    expect(policyLabel(24)).toBe('24 h antes');
    expect(serviceSlug(' ¡Entrenamiento 1 a 1! ')).toBe('entrenamiento-1-a-1');
  });

  it('respeta los extremos e intercambia vecinos con sort repetido', () => {
    const items = [
      { id: 'a', sort: 0 },
      { id: 'b', sort: 0 },
      { id: 'c', sort: 4 },
    ];
    expect(reorder(items, 'a', 'up')).toEqual([]);
    expect(reorder(items, 'c', 'down')).toEqual([]);
    expect(reorder(items, 'missing', 'down')).toEqual([]);
    expect(reorder(items, 'b', 'up')).toEqual([
      { id: 'a', sort: 1 },
      { id: 'c', sort: 2 },
    ]);
    expect(items.map((item) => item.sort)).toEqual([0, 0, 4]);
  });

  it('valida el precio, la primera visita y el estado del servicio', () => {
    const trial: PlanForm = {
      name: 'Prueba',
      service: 'jump',
      price_cents: 0,
      billing_unit: 'first_visit',
      sessions: 1,
      per_week: 0,
      commitment_periods: 0,
      is_first_class: true,
      partner: false,
      note: '',
      active: true,
    };
    expect(validatePlanForm(trial, { active: true })).toEqual({});
    expect(validatePlanForm(trial, { active: false })).toHaveProperty('active');
    expect(
      validatePlanForm({ ...trial, is_first_class: false }, { active: true }),
    ).toHaveProperty('price_cents');
    expect(
      validatePlanForm(
        { ...trial, billing_unit: 'per_class' },
        { active: true },
      ),
    ).toHaveProperty('billing_unit');
  });

  it('valida el cupo y las horas de cancelación', () => {
    const online = {
      name: 'En línea',
      slug: 'en-linea',
      kind: 'online' as const,
      description: '',
      capacity: 0,
      cancellation_hours: 0,
      default_coach: '',
    };
    expect(validateServiceForm(online)).toEqual({});
    expect(
      validateServiceForm({
        ...online,
        kind: 'personal',
        cancellation_hours: 169,
      }),
    ).toEqual({
      capacity: expect.any(String),
      cancellation_hours: expect.any(String),
    });
  });
});
