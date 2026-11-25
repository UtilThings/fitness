import { computed } from 'vue';
import { t } from '@/i18n';
import { formatMoney } from '@/lib/money';
import type { Admin, BaseRecord } from '@/types/pb';

export const kindLabel = computed(() => ({
  group: t('Group'),
  personal: t('Personal'),
  online: t('Online'),
}));

export const billingUnitLabel = computed(() => ({
  per_4_weeks: t('Every 4 weeks'),
  per_class: t('Per class'),
  first_visit: t('First visit'),
}));

export interface ServiceForm {
  name: string;
  slug: string;
  kind: keyof typeof kindLabel.value;
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
  billing_unit: keyof typeof billingUnitLabel.value;
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
  if (cents === 0) return t('Free');
  const price = formatMoney(cents);
  return cents % 100 === 0 ? price.slice(0, -3) : price;
}

export function policyLabel(hours: number): string {
  return hours === 0 ? t('No minimum') : t('{hours} h before', { hours });
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

const maxNameLength = 80;
const maxDescriptionLength = 500;
const maxNoteLength = 300;
const maxCancellationHours = 168;
const maxWeeklyFrequency = 7;

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
  if (!input.name.trim() || input.name.length > maxNameLength)
    errors.name = t('Enter a name of up to {max} characters.', {
      max: maxNameLength,
    });
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug))
    errors.slug = t(
      'Use lowercase letters, numbers, and hyphens between words.',
    );
  if (!Object.hasOwn(kindLabel.value, input.kind))
    errors.kind = t('Select a service type.');
  if (!validInteger(input.capacity, input.kind === 'online' ? 0 : 1))
    errors.capacity = t('Enter a valid whole number for capacity.');
  if (!validInteger(input.cancellation_hours, 0, maxCancellationHours))
    errors.cancellation_hours = t(
      'Enter a whole number of hours from {min} to {max}.',
      { min: 0, max: maxCancellationHours },
    );
  if (input.description.length > maxDescriptionLength)
    errors.description = t('Use up to {max} characters.', {
      max: maxDescriptionLength,
    });
  return errors;
}

export function validatePlanForm(
  input: PlanForm,
  service?: Pick<Service, 'active'>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim() || input.name.length > maxNameLength)
    errors.name = t('Enter a name of up to {max} characters.', {
      max: maxNameLength,
    });
  if (!input.service || !service) errors.service = t('Select a valid service.');
  if (service && input.active && !service.active)
    errors.active = t('The service is inactive.');
  if (
    input.is_first_class
      ? input.price_cents !== 0
      : !validInteger(input.price_cents, 1)
  ) {
    errors.price_cents = input.is_first_class
      ? t('The first class must be free.')
      : t('Enter a price greater than zero with up to two decimal places.');
  }
  if (
    !Object.hasOwn(billingUnitLabel.value, input.billing_unit) ||
    (input.is_first_class && input.billing_unit !== 'first_visit')
  )
    errors.billing_unit = t('Select a valid billing unit.');
  if (!validInteger(input.sessions, 0))
    errors.sessions = t('Enter a nonnegative whole number of sessions.');
  if (!validInteger(input.per_week, 0, maxWeeklyFrequency))
    errors.per_week = t('Enter a whole-number frequency from {min} to {max}.', {
      min: 0,
      max: maxWeeklyFrequency,
    });
  if (!validInteger(input.commitment_periods, 0))
    errors.commitment_periods = t(
      'Enter a nonnegative whole number of periods.',
    );
  if (input.note.length > maxNoteLength)
    errors.note = t('Use up to {max} characters.', { max: maxNoteLength });
  return errors;
}
