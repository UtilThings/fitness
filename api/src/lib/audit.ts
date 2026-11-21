import { IGNORED_FIELDS, SENSITIVE_FIELDS } from "./audit-config";

type AuditRecord = Record<string, unknown>;
type Action = "create" | "update" | "delete" | "custom";
type Change = { from?: unknown; to?: unknown };

type EntryInput = {
  action: Action;
  collection: string;
  recordId: string;
  actorId?: string;
  before?: AuditRecord;
  after?: AuditRecord;
};

function normalizeField(field: string): string {
  return field.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const sensitiveFields = SENSITIVE_FIELDS.map(normalizeField);

function isSensitive(field: string): boolean {
  const normalized = normalizeField(field);
  return sensitiveFields.includes(normalized) || normalized.includes("password");
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }
  if (value !== null && typeof value === "object") {
    return redact(value as AuditRecord);
  }
  return value;
}

export function redact(record: AuditRecord): AuditRecord {
  return Object.fromEntries(
    Object.keys(record).sort()
      .filter((field) => !isSensitive(field))
      .map((field) => [field, redactValue(record[field])]),
  );
}

export function computeDiff(before?: AuditRecord, after?: AuditRecord): Record<string, Change> {
  const previous = redact(before ?? {});
  const current = redact(after ?? {});
  const fields = new Set([...Object.keys(previous), ...Object.keys(current)]);
  const changes: [string, Change][] = [];

  for (const field of fields) {
    if (IGNORED_FIELDS.includes(field)) {
      continue;
    }

    const change: Change = {};
    if (Object.prototype.hasOwnProperty.call(previous, field)) {
      change.from = previous[field];
    }
    if (Object.prototype.hasOwnProperty.call(current, field)) {
      change.to = current[field];
    }
    if (JSON.stringify(change.from) !== JSON.stringify(change.to)) {
      changes.push([field, change]);
    }
  }

  return Object.fromEntries(changes);
}

export function buildSummary(action: Action, collection: string, record: AuditRecord): string {
  for (const field of ["name", "title", "email", "id"]) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) {
      return `${action} ${collection}: ${value.trim()}`;
    }
  }
  return `${action} ${collection}`;
}

export function buildEntry({ action, collection, recordId, actorId, before, after }: EntryInput) {
  const diff = computeDiff(action === "create" ? undefined : before, action === "delete" ? undefined : after);
  if (action === "update" && Object.keys(diff).length === 0) {
    return null;
  }

  return {
    actor: actorId ?? "",
    action,
    collection,
    record_id: recordId,
    summary: buildSummary(action, collection, { id: recordId, ...(action === "delete" ? before : after ?? before) }),
    diff,
  };
}
