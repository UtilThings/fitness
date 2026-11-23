import { ref, shallowRef } from 'vue';
import { buildAuditFilter, type AuditFilters } from '@/lib/audit';
import { parsePbError, type PbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type { Admin, AuditLog } from '@/types/pb';

export const AUDIT_PAGE_SIZE = 25;

export function useAuditLogs() {
  const items = shallowRef<AuditLog[]>([]);
  const actors = shallowRef<Pick<Admin, 'id' | 'name' | 'email'>[]>([]);
  const page = ref(1);
  const totalPages = ref(0);
  const totalItems = ref(0);
  const filters = shallowRef<AuditFilters>({});
  const loading = ref(false);
  const error = shallowRef<PbError>();
  const actorsError = shallowRef<PbError>();
  let latest = 0;

  async function load(nextPage = page.value) {
    const request = ++latest;
    page.value = nextPage;
    loading.value = true;
    error.value = undefined;
    try {
      const result = await pb
        .collection<AuditLog>('audit_logs')
        .getList(nextPage, AUDIT_PAGE_SIZE, {
          sort: '-created,-id',
          expand: 'actor',
          filter: buildAuditFilter(filters.value),
          requestKey: null,
        });
      if (request !== latest) return;
      items.value = result.items;
      totalPages.value = result.totalPages;
      totalItems.value = result.totalItems;
    } catch (cause) {
      if (request !== latest) return;
      items.value = [];
      totalPages.value = 0;
      totalItems.value = 0;
      error.value =
        cause instanceof RangeError
          ? { message: 'Introduce fechas válidas.', fields: {}, status: 400 }
          : parsePbError(cause);
    } finally {
      if (request === latest) loading.value = false;
    }
  }

  function setFilters(next: AuditFilters) {
    filters.value = { ...next };
    return load(1);
  }

  async function loadActors() {
    actorsError.value = undefined;
    try {
      actors.value = await pb.collection<Admin>('admins').getFullList({
        fields: 'id,name,email',
        sort: 'name,id',
        requestKey: null,
      });
    } catch (cause) {
      actorsError.value = parsePbError(cause);
    }
  }

  return {
    items,
    actors,
    page,
    totalPages,
    totalItems,
    filters,
    loading,
    error,
    actorsError,
    load,
    setFilters,
    loadActors,
  };
}
