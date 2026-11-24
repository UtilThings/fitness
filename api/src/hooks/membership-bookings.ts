/// <reference path="../../pb_data/types.d.ts" />

// Run after save inside the write transaction, so a failed ledger write rolls back the booking too.
function updateBookingLedger(e: core.RecordEvent) {
  const { reconcileBooking } =
    require(`${__hooks}/lib/membership-bookings`) as typeof import("../lib/membership-bookings");
  const app = e.app;
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      e.next();
      reconcileBooking(tx, e.record!);
    });
  } finally {
    e.app = app;
  }
}

onRecordCreate(updateBookingLedger, "bookings");
onRecordUpdate(updateBookingLedger, "bookings");

onRecordDelete((e) => {
  if (e.app.countRecords("credit_movements", $dbx.hashExp({ booking: e.record!.id }))) {
    throw new ForbiddenError("Corrige el estado de la reserva para conservar su historial de créditos.");
  }
  return e.next();
}, "bookings");

routerAdd("GET", "/api/admin/memberships/eligibility", (e) => {
  const { checkEligibility, membershipError, requireMembershipRole } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  const { tenantRecord } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  requireMembershipRole(e, ["owner", "reception", "coach"]);
  const query = e.request!.url!.query();
  const business = e.auth!.getString("business");
  const client = tenantRecord(e.app, "clients", query.get("client"), business);
  const sessionId = query.get("session");
  if (!sessionId && query.get("service") && query.get("starts_at")) {
    if (!client) throw membershipError(404, "not_found", "Cliente no encontrado.");
    const { privateSessionDraft } = require(`${__hooks}/lib/private-sessions`) as typeof import("../lib/private-sessions");
    const { hasPartnerMembership } = require(`${__hooks}/lib/scheduling-store`) as typeof import("../lib/scheduling-store");
    const draft = privateSessionDraft(e.app, { service: query.get("service"), starts_at: query.get("starts_at") }, business);
    return e.json(200, { ...checkEligibility(e.app, client.id, draft), partner: hasPartnerMembership(e.app, client.id, draft) });
  }
  const session = tenantRecord(e.app, "class_sessions", sessionId, business);
  if (!client || !session) throw membershipError(404, "not_found", "Cliente o sesión no encontrado.");
  return e.json(200, checkEligibility(e.app, client.id, session));
});
