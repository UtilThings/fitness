/// <reference path="../../pb_data/types.d.ts" />

export const TENANT_COLLECTIONS = [
  "admins", "services", "plans", "class_templates", "class_sessions", "schedule_blocks", "coach_availability",
  "clients", "bookings", "memberships", "credit_movements", "receipt_sequences", "payments", "coaching_programs", "coaching_checkins",
  "message_templates", "message_logs", "audit_logs",
] as const;

export type TenantCollection = (typeof TENANT_COLLECTIONS)[number];

export const TENANT_REFERENCES: Partial<Record<TenantCollection, Record<string, TenantCollection>>> = {
  services: { default_coach: "admins" },
  plans: { service: "services" },
  class_templates: { service: "services", coach: "admins" },
  class_sessions: { template: "class_templates", service: "services", coach: "admins" },
  coach_availability: { coach: "admins" },
  bookings: { session: "class_sessions", client: "clients", marked_by: "admins", membership: "memberships" },
  memberships: { client: "clients", plan: "plans" },
  credit_movements: { membership: "memberships", booking: "bookings", created_by: "admins" },
  payments: { client: "clients", membership: "memberships", plan: "plans", recorded_by: "admins", voided_by: "admins" },
  coaching_programs: { client: "clients", coach: "admins", membership: "memberships" },
  coaching_checkins: { program: "coaching_programs", created_by: "admins" },
  message_logs: { client: "clients", session: "class_sessions" },
  audit_logs: { actor: "admins" },
};

export function resolveBusiness(auth?: core.Record | null): string {
  if (auth?.collection().name !== "admins" || !auth.getBool("active")) return "";
  return auth.getString("business");
}

export function tenantRecord(app: Pick<core.App, "findRecordsByFilter">, collection: TenantCollection, id: string, business: string) {
  if (!id || !business) return;
  return app.findRecordsByFilter(collection, "id = {:id} && business = {:business}", "", 1, 0, { id, business })[0];
}

export function getBusiness(app: Pick<core.App, "findRecordsByFilter">, id: string) {
  if (!id) return;
  return app.findRecordsByFilter("businesses", "id = {:id}", "", 1, 0, { id })[0];
}

export function activeBusinesses(app: Pick<core.App, "findRecordsByFilter">) {
  return app.findRecordsByFilter("businesses", "active = true", "id").filter((record): record is core.Record => !!record);
}

export function assertSameBusiness(record: Pick<core.Record, "getString">, related?: Pick<core.Record, "getString">) {
  const business = record.getString("business");
  return !!business && business === related?.getString("business");
}

export function validateTenantReferences(app: core.App, record: core.Record) {
  const references = TENANT_REFERENCES[record.collection().name as TenantCollection] ?? {};
  const business = record.getString("business");
  for (const [field, collection] of Object.entries(references)) {
    const id = record.getString(field);
    if (id && !tenantRecord(app, collection, id, business)) {
      throw new BadRequestError("Selecciona registros válidos del mismo negocio.");
    }
  }
}

export function prepareTenantCreate(e: core.RecordRequestEvent) {
  const record = e.record!;
  if (!e.hasSuperuserAuth()) record.set("business", resolveBusiness(e.auth));
  if (!record.getString("business")) throw new BadRequestError("Indica un negocio.");
  validateTenantReferences(e.app, record);
}

export function prepareTenantUpdate(e: core.RecordRequestEvent) {
  const record = e.record!;
  if (!assertSameBusiness(record, record.original())) {
    throw new BadRequestError("No se puede cambiar el negocio de un registro.");
  }
  validateTenantReferences(e.app, record);
}

export function getBusinessTimezone(app: Pick<core.App, "findRecordsByFilter">, businessId: string, event?: core.RequestEvent) {
  const key = "jq.business.timezone:" + businessId;
  const cached = event?.get(key);
  if (typeof cached === "string") return cached;
  const timezone = getBusiness(app, businessId)?.getString("timezone");
  if (!timezone) throw new BadRequestError("Indica un negocio con zona horaria.");
  event?.set(key, timezone);
  return timezone;
}
