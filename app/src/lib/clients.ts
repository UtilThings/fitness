import { computed } from 'vue';
import { t } from '@/i18n';
import type { Locale } from '@/lib/messages';
import { pb } from '@/lib/pocketbase';
import type { BaseRecord } from '@/types/pb';

export const CLIENT_STATUSES = ['active', 'paused', 'inactive'] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_STATUS = computed(
  () =>
    ({
      active: { label: t('Active'), severity: 'success' },
      paused: { label: t('Paused'), severity: 'warn' },
      inactive: { label: t('Inactive'), severity: 'secondary' },
    }) as const,
);

export interface Client extends Pick<
  BaseRecord,
  'id' | 'collectionId' | 'collectionName'
> {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  locale?: Locale;
  goals: string;
  notes: string;
  assessment: unknown;
  free_class_used: boolean;
  joined_on: string;
  emergency_contact: string;
}

export type ClientDetails = Pick<
  Client,
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone'
  | 'joined_on'
  | 'locale'
  | 'emergency_contact'
>;

export function fullName({
  first_name,
  last_name,
}: Pick<Client, 'first_name' | 'last_name'>) {
  return [first_name, last_name].filter(Boolean).join(' ');
}

export function formatPhone(phone: string) {
  return phone.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3');
}

export function compactPhone(value: string) {
  return value.replace(/[\s().-]/g, '');
}

export function buildSearchFilter(query: string) {
  // A sequence of formatted phone parts represents one contiguous substring.
  const tokens =
    query
      .trim()
      .match(
        /\+?[\d().-]*\d[\d().-]*(?:\s+[\d().-]*\d[\d().-]*)*(?=\s|$)|\S+/g,
      ) ?? [];
  if (!tokens.length) return '';

  const params: Record<string, string> = {};
  const clauses = tokens.map((token, index) => {
    const term = 'term' + index;
    const phone = 'phone' + index;
    const compact = compactPhone(token);
    params[term] = token;
    params[phone] = /^\+?\d+$/.test(compact) ? compact : token;
    return `(first_name ~ {:${term}} || last_name ~ {:${term}} || email ~ {:${term}} || phone ~ {:${phone}})`;
  });

  return pb.filter(clauses.join(' && '), params);
}
