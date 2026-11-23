import { addLocalDays, localToUtcIso } from '@/lib/datetime';
import { pb } from '@/lib/pocketbase';
import type { AuditLog } from '@/types/pb';

export const ACTION_LABELS: Record<AuditLog['action'], string> = {
  create: 'Creación',
  update: 'Edición',
  delete: 'Eliminación',
  custom: 'Acción',
};

export const COLLECTION_LABELS: Readonly<Record<string, string>> = {
  admins: 'Equipo',
  services: 'Servicios',
  plans: 'Planes',
  class_templates: 'Plantillas de clases',
  class_sessions: 'Sesiones de clase',
  schedule_blocks: 'Bloqueos de horario',
  clients: 'Clientes',
  bookings: 'Reservas',
};

export interface AuditFilters {
  collection?: string;
  actor?: string;
  from?: string;
  to?: string;
}

export function buildAuditFilter({
  collection,
  actor,
  from,
  to,
}: AuditFilters) {
  const clauses: string[] = [];
  const params: Record<string, string> = {};
  if (collection) {
    clauses.push('collection = {:collection}');
    params.collection = collection;
  }
  if (actor) {
    clauses.push('actor = {:actor}');
    params.actor = actor;
  }
  if (from) {
    clauses.push('created >= {:from}');
    params.from = localToUtcIso(from, '00:00').replace('T', ' ');
  }
  if (to) {
    // Validar también el día introducido antes de calcular su extremo exclusivo.
    localToUtcIso(to, '00:00');
    clauses.push('created < {:to}');
    params.to = localToUtcIso(addLocalDays(to, 1), '00:00').replace('T', ' ');
  }
  return clauses.length ? pb.filter(clauses.join(' && '), params) : '';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function displayValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function formatDiff(diff: unknown) {
  if (!isObject(diff)) return [];
  return Object.entries(diff).flatMap(([field, change]) =>
    isObject(change) && ('from' in change || 'to' in change)
      ? [
          {
            field,
            before: displayValue(change.from),
            after: displayValue(change.to),
          },
        ]
      : [],
  );
}
