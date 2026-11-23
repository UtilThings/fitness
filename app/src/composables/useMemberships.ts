import { todayLocal } from '@/lib/datetime';
import type {
  CreditMovement,
  Membership,
  MembershipStatus,
} from '@/lib/memberships';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

export type { CreditMovement, Membership } from '@/lib/memberships';

export interface MembershipFilters {
  client?: string;
  plan?: string | null;
  status?: MembershipStatus | null;
  renewalPending?: boolean;
  page?: number;
  perPage?: number;
}

type Assignment = {
  client: string;
  plan: string;
  starts_on?: string;
  notes?: string;
};
type MembershipResult = {
  membership: Membership;
  movement: CreditMovement | null;
};
export interface BookingEligibility {
  allowed: boolean;
  code:
    | 'ok'
    | 'no_membership'
    | 'membership_not_active'
    | 'no_credits'
    | 'weekly_limit'
    | 'overridden';
  available: number | null;
}

const api = '/api/admin/memberships';
const options = { requestKey: null };
const listOptions = {
  ...options,
  expand: 'client,plan,plan.service',
  sort: '-current_period_end,id',
};

async function request<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (cause) {
    const error = parsePbError(cause);
    if (error.status === 401) error.message = 'Inicia sesión para continuar.';
    if (error.status >= 500)
      error.message = 'No se pudo completar la operación.';
    throw error;
  }
}

export function useMemberships() {
  const memberships = pb.collection<Membership>('memberships');
  const movements = pb.collection<CreditMovement>('credit_movements');

  function post(path: string, body: Record<string, unknown> = {}) {
    return request(
      pb.send<MembershipResult>(api + path, {
        ...options,
        method: 'POST',
        body,
      }),
    );
  }

  function list({
    client,
    plan,
    status,
    renewalPending,
    page = 1,
    perPage = 20,
  }: MembershipFilters = {}) {
    const filter = [
      client && pb.filter('client = {:client}', { client }),
      plan && pb.filter('plan = {:plan}', { plan }),
      status && pb.filter('status = {:status}', { status }),
      renewalPending &&
        pb.filter("status = 'active' && current_period_end < {:today}", {
          today: todayLocal(),
        }),
    ]
      .filter(Boolean)
      .join(' && ');
    return request(
      memberships.getList(page, perPage, { ...listOptions, filter }),
    );
  }

  return {
    list,
    listForClient(client: string) {
      return request(
        memberships.getFullList({
          ...listOptions,
          filter: pb.filter('client = {:client}', { client }),
        }),
      );
    },
    ledger(membership: string) {
      return request(
        movements.getFullList({
          ...options,
          sort: '-created,-id',
          expand: 'booking.session',
          filter: pb.filter('membership = {:membership}', { membership }),
        }),
      );
    },
    assign: (body: Assignment) => post('/assign', body),
    renew: (id: string, notes?: string) =>
      post('/' + encodeURIComponent(id) + '/renew', { notes }),
    pause: (id: string, note: string) =>
      post('/' + encodeURIComponent(id) + '/pause', { note }),
    resume: (id: string) => post('/' + encodeURIComponent(id) + '/resume'),
    cancel: (id: string, note: string) =>
      post('/' + encodeURIComponent(id) + '/cancel', { note }),
    adjust: (id: string, delta: number, note: string) =>
      post('/' + encodeURIComponent(id) + '/adjust', { delta, note }),
    eligibility(client: string, session: string) {
      return request(
        pb.send<BookingEligibility>(api + '/eligibility', {
          ...options,
          method: 'GET',
          query: { client, session },
        }),
      );
    },
  };
}
