import type { Booking } from '@/lib/bookings';
import type { Plan } from '@/lib/catalog';
import type { Client } from '@/lib/clients';
import { formatDate, localToUtcIso, todayLocal } from '@/lib/datetime';
import type { BaseRecord } from '@/types/pb';

export const membershipStatusLabels = {
  active: 'Activa',
  paused: 'Pausada',
  expired: 'Vencida',
  cancelled: 'Cancelada',
  renewal_pending: 'Renovación pendiente',
} as const;
export type MembershipState = keyof typeof membershipStatusLabels;
export type MembershipStatus = Exclude<MembershipState, 'renewal_pending'>;

export interface Membership extends Omit<BaseRecord, 'created'> {
  client: string;
  plan: string;
  status: MembershipStatus;
  starts_on: string;
  current_period_start: string;
  current_period_end: string;
  periods_paid: number;
  commitment_periods_total: number;
  credits_balance: number;
  auto_renew: boolean;
  paused_at: string;
  ended_on: string;
  notes: string;
  expand?: { client?: Client; plan?: Plan };
}

export interface CreditMovement extends BaseRecord {
  membership: string;
  booking: string;
  delta: number;
  reason: 'grant' | 'attend' | 'late_cancel' | 'adjust' | 'expire';
  note: string;
  created_by: string;
  expand?: { booking?: Booking };
}

export function membershipState(
  membership: Pick<Membership, 'status' | 'current_period_end'>,
  today = todayLocal(),
): MembershipState {
  return membership.status === 'active' &&
    membership.current_period_end.slice(0, 10) < today
    ? 'renewal_pending'
    : membership.status;
}

export function formatMembershipDate(value: string): string {
  return formatDate(localToUtcIso(value.slice(0, 10), '12:00'));
}

export function membershipBalanceLabel(membership: Membership): string {
  const plan = membership.expand?.plan;
  return membership.credits_balance === 0 &&
    plan?.billing_unit === 'per_4_weeks' &&
    plan.sessions === 0
    ? 'Ilimitado'
    : String(membership.credits_balance);
}
