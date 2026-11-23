import {
  getCurrentScope,
  onScopeDispose,
  ref,
  shallowRef,
  toValue,
  type MaybeRefOrGetter,
} from 'vue';
import { addLocalDays, todayLocal } from '@/lib/datetime';
import { parsePbError } from '@/lib/pb-errors';
import { pb } from '@/lib/pocketbase';
import type {
  GroupBy,
  ReportDates,
  ReportKind,
  ReportPreset,
  ReportResponse,
} from '@/types/reports';

const permissionMessage = 'No tienes permiso para ver este reporte';
let nextRequestId = 0;

function presetDates(preset: ReportPreset): ReportDates {
  const today = todayLocal();
  const month = today.slice(0, 7) + '-01';
  if (preset === 'this-month') {
    const nextMonth = addLocalDays(month, 32).slice(0, 7) + '-01';
    return { from: month, to: addLocalDays(nextMonth, -1) };
  }
  if (preset === 'last-month') {
    const to = addLocalDays(month, -1);
    return { from: to.slice(0, 7) + '-01', to };
  }
  return { from: addLocalDays(today, preset === '7d' ? -6 : -29), to: today };
}

export function useReports<K extends ReportKind>(kind: MaybeRefOrGetter<K>) {
  const preset = ref<ReportPreset | null>('30d');
  const range = ref(presetDates('30d'));
  const service = ref('');
  const groupBy = ref<GroupBy>('month');
  const data = shallowRef<ReportResponse<K> | null>(null);
  const loading = ref(false);
  const error = ref('');
  const requestKey = `admin-report-${++nextRequestId}`;
  let revision = 0;

  function setPreset(name: ReportPreset) {
    preset.value = name;
    range.value = presetDates(name);
  }

  function clear() {
    revision++;
    if (loading.value) pb.cancelRequest(requestKey);
    loading.value = false;
    data.value = null;
    error.value = '';
  }

  if (getCurrentScope()) onScopeDispose(clear);

  async function load() {
    const current = ++revision;
    const report = toValue(kind);
    const query = {
      ...range.value,
      ...(report !== 'retention' &&
        service.value && { service: service.value }),
      ...((report === 'retention' || report === 'revenue') && {
        group_by: groupBy.value,
      }),
    };
    data.value = null;
    error.value = '';
    loading.value = true;
    try {
      const response = await pb.send<ReportResponse<K>>(
        `/api/admin/reports/${report}`,
        { query, requestKey },
      );
      if (current === revision) data.value = response;
    } catch (cause) {
      if (current !== revision) return;
      const failure = parsePbError(cause);
      if (failure.aborted) return;
      if (failure.status === 403) error.value = permissionMessage;
      else if (failure.status === 400) error.value = failure.message;
      else error.value = 'No se pudo cargar el reporte.';
    } finally {
      if (current === revision) loading.value = false;
    }
  }

  return {
    range,
    preset,
    service,
    groupBy,
    data,
    loading,
    error,
    load,
    setPreset,
    clear,
  };
}
