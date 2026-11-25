import { computed } from 'vue';
import { t } from '@/i18n';
import type { Plan } from '@/lib/catalog';
import type { Client } from '@/lib/clients';
import { addLocalDays, todayLocal } from '@/lib/datetime';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type { BaseRecord } from '@/types/pb';

export const paymentMethods = computed(() => ({
  cash: t('Cash'),
  zelle: t('Zelle'),
  card: t('Card'),
  other: t('Other'),
}));
export const paymentStatuses = computed(() => ({
  pending: t('Pending'),
  paid: t('Paid'),
  void: t('Voided'),
}));

export type PaymentMethod = keyof typeof paymentMethods.value;
export type PaymentStatus = keyof typeof paymentStatuses.value;
export interface Payment extends Omit<BaseRecord, 'created'> {
  currency?: string;
  client: string;
  membership: string;
  plan: string;
  amount_cents: number;
  method: PaymentMethod | '';
  status: PaymentStatus;
  paid_at: string;
  due_on: string;
  receipt_number: string;
  note: string;
  recorded_by: string;
  period_index: number;
  voided_at: string;
  voided_by: string;
  void_reason: string;
  expand?: { client?: Client; plan?: Plan };
}

export interface PaymentFilters {
  client?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  from?: string;
  through?: string;
  overdue?: boolean;
  page?: number;
  perPage?: number;
}

type Settlement = { method: PaymentMethod; paid_at?: string; note?: string };
type CreatePayment = {
  client: string;
  amount_cents: number;
  status: 'paid' | 'pending';
  method?: PaymentMethod;
  paid_at?: string;
  due_on?: string;
  membership?: string;
  plan?: string;
  note?: string;
};

const api = '/api/admin/payments';
const options = { requestKey: null };
const related = { ...options, expand: 'client,plan' };
const sort = '-paid_at,due_on,-id';

export function isOverdue(
  payment: Pick<Payment, 'status' | 'due_on'>,
  today = todayLocal(),
) {
  return (
    payment.status === 'pending' &&
    !!payment.due_on &&
    payment.due_on.slice(0, 10) < today
  );
}

export async function paymentRequest<T>(operation: Promise<T>): Promise<T> {
  try {
    return await operation;
  } catch (cause) {
    const error = parsePbError(cause);
    if (error.status === 401) error.message = t('Sign in to continue.');
    if (
      error.status >= 500 ||
      /^(Something went wrong|Failed to |Invalid request|An error occurred)/i.test(
        error.message,
      )
    ) {
      error.message = t('Could not complete the payment operation.');
    }
    throw error;
  }
}

export function usePayments() {
  const payments = pb.collection<Payment>('payments');
  const post = (
    path: string,
    body: CreatePayment | Settlement | { reason: string },
  ) =>
    paymentRequest(
      pb.send<Payment>(api + path, { ...options, method: 'POST', body }),
    );

  function list({
    client,
    method,
    status,
    from,
    through,
    overdue,
    page = 1,
    perPage = 20,
  }: PaymentFilters = {}) {
    const filter = [
      client && pb.filter('client = {:client}', { client }),
      method && pb.filter('method = {:method}', { method }),
      status && pb.filter('status = {:status}', { status }),
      from &&
        pb.filter(
          "(paid_at >= {:from} || (paid_at = '' && due_on >= {:from}))",
          { from },
        ),
      through &&
        pb.filter(
          "((paid_at != '' && paid_at < {:end}) || (paid_at = '' && due_on != '' && due_on < {:end}))",
          {
            end: addLocalDays(through, 1),
          },
        ),
      overdue &&
        pb.filter("status = 'pending' && due_on != '' && due_on < {:today}", {
          today: todayLocal(),
        }),
    ]
      .filter(Boolean)
      .join(' && ');
    return paymentRequest(
      payments.getList(page, perPage, { ...related, sort, filter }),
    );
  }

  return {
    list,
    listForClient: (client: string) =>
      paymentRequest(
        payments.getFullList({
          ...related,
          sort,
          filter: pb.filter('client = {:client}', { client }),
        }),
      ),
    get: (id: string) => paymentRequest(payments.getOne(id, related)),
    create: (body: CreatePayment) => post('', body),
    pay: (id: string, body: Settlement) =>
      post('/' + encodeURIComponent(id) + '/pay', body),
    void: (id: string, reason: string) =>
      post('/' + encodeURIComponent(id) + '/void', { reason }),
  };
}
