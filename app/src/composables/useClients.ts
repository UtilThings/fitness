import { ClientResponseError } from 'pocketbase';
import {
  buildSearchFilter,
  compactPhone,
  type Client,
  type ClientStatus,
} from '@/lib/clients';
import type { Membership } from '@/lib/memberships';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';

export interface ClientWithMemberships extends Client {
  expand?: { memberships_via_client?: Membership[] };
}

export interface ClientListOptions {
  q?: string;
  status?: ClientStatus | null;
  page?: number;
  perPage?: number;
  activePlan?: string | null;
  activeMembership?: boolean;
  includeMemberships?: boolean;
}

export function useClients() {
  const collection = pb.collection<ClientWithMemberships>('clients');
  const options = { requestKey: null };

  async function request<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation;
    } catch (cause) {
      const error = parsePbError(cause);
      if (
        cause instanceof ClientResponseError &&
        cause.response.data?.email?.code === 'validation_not_unique'
      ) {
        error.fields.email = 'Ya existe un cliente con ese correo electrónico.';
      }
      throw error;
    }
  }

  function list({
    q = '',
    status,
    page = 1,
    perPage = 20,
    activePlan,
    activeMembership,
    includeMemberships,
  }: ClientListOptions = {}) {
    const filter = [
      buildSearchFilter(q),
      status && pb.filter('status = {:status}', { status }),
      activePlan &&
        pb.filter('memberships_via_client.plan ?= {:activePlan}', {
          activePlan,
        }),
      (activePlan || activeMembership === true) &&
        "memberships_via_client.status ?= 'active'",
      activeMembership === false && "memberships_via_client.status != 'active'",
    ]
      .filter(Boolean)
      .join(' && ');
    return request(
      collection.getList(page, perPage, {
        ...options,
        filter,
        sort: 'last_name,first_name,id',
        ...(includeMemberships
          ? { expand: 'memberships_via_client.plan.service' }
          : {}),
      }),
    );
  }

  function get(id: string) {
    return request(collection.getOne(id, options));
  }

  function create(data: Partial<Client>) {
    return request(collection.create(data, options));
  }

  function update(id: string, data: Partial<Client>) {
    return request(collection.update(id, data, options));
  }

  function setStatus(id: string, status: ClientStatus) {
    return update(id, { status });
  }

  function remove(id: string) {
    return request(collection.delete(id, options));
  }

  async function hasMatchingPhone(value: string, exclude = '') {
    const compact = compactPhone(value);
    const phone = /^\d{10}$/.test(compact)
      ? '+1' + compact
      : /^1\d{10}$/.test(compact)
        ? '+' + compact
        : compact;
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) return false;
    const filter = pb.filter('phone = {:phone} && id != {:exclude}', {
      phone,
      exclude,
    });
    const result = await request(
      collection.getList(1, 1, {
        ...options,
        filter,
        fields: 'id',
        skipTotal: true,
      }),
    );
    return result.items.length > 0;
  }

  return { list, get, create, update, setStatus, remove, hasMatchingPhone };
}
