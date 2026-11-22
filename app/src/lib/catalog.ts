import { formatUsd } from '@/lib/money';
import type { Admin, BaseRecord } from '@/types/pb';

export const kindLabel = {
  group: 'Grupal',
  personal: 'Personal',
  online: 'En línea',
};

export const billingUnitLabel = {
  per_4_weeks: 'Cada 4 semanas',
  per_class: 'Por clase',
  first_visit: 'Primera visita',
};

export interface ServiceForm {
  name: string;
  slug: string;
  kind: keyof typeof kindLabel;
  description: string;
  capacity: number | null;
  cancellation_hours: number | null;
  default_coach: string;
}

export interface Service
  extends BaseRecord, Omit<ServiceForm, 'capacity' | 'cancellation_hours'> {
  capacity: number;
  cancellation_hours: number;
  active: boolean;
  sort: number;
  expand?: { default_coach?: Admin };
}

export interface PlanForm {
  service: string;
  name: string;
  price_cents: number | null;
  billing_unit: keyof typeof billingUnitLabel;
  sessions: number | null;
  per_week: number | null;
  commitment_periods: number | null;
  is_first_class: boolean;
  partner: boolean;
  note: string;
  active: boolean;
}

export interface Plan
  extends
    BaseRecord,
    Omit<
      PlanForm,
      'price_cents' | 'sessions' | 'per_week' | 'commitment_periods'
    > {
  price_cents: number;
  sessions: number;
  per_week: number;
  commitment_periods: number;
  sort: number;
  expand?: { service?: Service };
}

export type Direction = 'up' | 'down';

export function formatCents(cents: number): string {
  if (cents === 0) return 'Gratis';
  const price = formatUsd(cents);
  return cents % 100 === 0 ? price.slice(0, -3) : price;
}

export function policyLabel(hours: number): string {
  return hours === 0 ? 'Sin mínimo' : `${hours} h antes`;
}

export function serviceSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Mark}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function reorder<T extends { id: string; sort: number }>(
  items: readonly T[],
  id: string,
  direction: Direction,
) {
  const from = items.findIndex((item) => item.id === id);
  const to = from + (direction === 'up' ? -1 : 1);
  if (from < 0 || to < 0 || to >= items.length) return [];
  const ordered = [...items];
  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  return ordered.flatMap((item, sort) =>
    item.sort === sort ? [] : [{ id: item.id, sort }],
  );
}

const validInteger = (
  value: number | null,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
) =>
  value !== null && Number.isSafeInteger(value) && value >= min && value <= max;

export function validateServiceForm(
  input: ServiceForm,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim() || input.name.length > 80)
    errors.name = 'Escribe un nombre de hasta 80 caracteres.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug))
    errors.slug = 'Usa minúsculas, números y guiones entre palabras.';
  if (!Object.hasOwn(kindLabel, input.kind))
    errors.kind = 'Selecciona un tipo de servicio.';
  if (!validInteger(input.capacity, input.kind === 'online' ? 0 : 1))
    errors.capacity = 'Indica un cupo entero válido.';
  if (!validInteger(input.cancellation_hours, 0, 168))
    errors.cancellation_hours =
      'Indica un número entero de horas entre 0 y 168.';
  if (input.description.length > 500)
    errors.description = 'Usa hasta 500 caracteres.';
  return errors;
}

export function validatePlanForm(
  input: PlanForm,
  service?: Pick<Service, 'active'>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim() || input.name.length > 80)
    errors.name = 'Escribe un nombre de hasta 80 caracteres.';
  if (!input.service || !service)
    errors.service = 'Selecciona un servicio válido.';
  if (service && input.active && !service.active)
    errors.active = 'El servicio está inactivo.';
  if (
    input.is_first_class
      ? input.price_cents !== 0
      : !validInteger(input.price_cents, 1)
  ) {
    errors.price_cents = input.is_first_class
      ? 'La primera clase debe ser gratis.'
      : 'Indica un precio mayor que cero con hasta dos decimales.';
  }
  if (
    !Object.hasOwn(billingUnitLabel, input.billing_unit) ||
    (input.is_first_class && input.billing_unit !== 'first_visit')
  )
    errors.billing_unit = 'Selecciona una unidad de cobro válida.';
  if (!validInteger(input.sessions, 0))
    errors.sessions = 'Indica un número entero de sesiones no negativo.';
  if (!validInteger(input.per_week, 0, 7))
    errors.per_week = 'Indica una frecuencia entera entre 0 y 7.';
  if (!validInteger(input.commitment_periods, 0))
    errors.commitment_periods =
      'Indica un número entero de periodos no negativo.';
  if (input.note.length > 300) errors.note = 'Usa hasta 300 caracteres.';
  return errors;
}
