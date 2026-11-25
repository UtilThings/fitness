import { computed } from 'vue';
import { t, translateMessage } from '@/i18n';
import type { Client } from '@/lib/clients';
import type { Membership } from '@/lib/memberships';
import { roleCan } from '@/lib/permissions';
import type { Admin } from '@/types/pb';
import {
  programFlags,
  validateCheckin as checkCheckin,
  validateProgramInput as checkProgram,
  type ProgramAlert,
  type ProgramStatus,
} from '../../../api/src/lib/coaching';

export {
  PROGRAM_DURATIONS,
  PROGRAM_STATUSES,
  programFlags,
  type ProgramAlert,
  type ProgramStatus,
  type Trend,
} from '../../../api/src/lib/coaching';

export interface ProgramInput {
  client: string;
  coach: string;
  membership: string;
  status: ProgramStatus;
  starts_on: string;
  duration_weeks: number;
  goal: string;
  program_url: string;
  notes: string;
}

export interface CoachingProgram extends ProgramInput {
  id: string;
  renews_on: string;
  expand?: { client?: Client; coach?: Admin; membership?: Membership };
}

export interface CheckinInput {
  checked_at: string;
  adherence: number;
  notes: string;
}

export interface CoachingCheckin extends CheckinInput {
  id: string;
  program: string;
  created_by: string;
  created?: string;
  expand?: { created_by?: Admin };
}

export interface ProgramOverview extends CoachingProgram {
  flags: ReturnType<typeof programFlags>;
}

export const programStatuses = computed(
  () =>
    ({
      active: t('Active'),
      paused: t('Paused'),
      ended: t('Ended'),
    }) satisfies Record<ProgramStatus, string>,
);

export const programAlerts = computed(
  () =>
    ({
      renewal_soon: t('Renewal due soon'),
      renewal_overdue: t('Renewal overdue'),
      membership_expired: t('Membership expired'),
      checkin_due: t('Check-in due'),
      at_risk: t('At risk'),
      ending: t('Ending soon'),
    }) satisfies Record<ProgramAlert, string>,
);

export const renewalAlerts: readonly ProgramAlert[] = [
  'renewal_soon',
  'renewal_overdue',
  'membership_expired',
];

export function matchesProgramAlert(
  alerts: readonly ProgramAlert[],
  filter?: ProgramAlert | 'renewal',
) {
  if (!filter) return true;
  return filter === 'renewal'
    ? alerts.some((alert) => renewalAlerts.includes(alert))
    : alerts.includes(filter);
}

export function canManageProgram(
  user: Admin | null,
  program?: CoachingProgram,
) {
  return (
    user !== null &&
    user.active !== false &&
    roleCan(user.role, 'coaching.programs.manage') &&
    (user.role !== 'coach' || !program || user.id === program.coach)
  );
}

export function canRegisterCheckin(
  user: Admin | null,
  program: CoachingProgram,
) {
  return (
    program.status !== 'ended' &&
    user !== null &&
    user.active !== false &&
    roleCan(user.role, 'coaching.checkins.manage') &&
    (user.role !== 'coach' || user.id === program.coach)
  );
}

export function safeProgramUrl(url: string): string | undefined {
  if (!/^https?:\/\//i.test(url)) return undefined;
  try {
    return new URL(url).href;
  } catch {
    return undefined;
  }
}

function localizeValidation(errors: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [
      field,
      translateMessage(message),
    ]),
  );
}

export const validateCheckin: typeof checkCheckin = (...args) =>
  localizeValidation(checkCheckin(...args));

export const validateProgramInput: typeof checkProgram = (...args) =>
  localizeValidation(checkProgram(...args));
