/// <reference path="../../pb_data/types.d.ts" />

routerAdd("GET", "/api/admin/sessions/{id}/availability", (e) => {
  const { requireBookingStaff } = require(`${__hooks}/lib/booking-store`) as typeof import("../lib/booking-store");
  const { singleSessionAvailability } =
    require(`${__hooks}/lib/booking-availability`) as typeof import("../lib/booking-availability");
  const { tenantRecord } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  requireBookingStaff(e);
  const session = tenantRecord(e.app, "class_sessions", e.request.pathValue("id"), e.auth!.getString("business"));
  if (!session) throw new NotFoundError("Sesión no encontrada.");
  return e.json(200, singleSessionAvailability(e.app, session));
}, $apis.requireAuth("admins"));

routerAdd("GET", "/api/admin/sessions/availability", (e) => {
  const { requireBookingStaff } = require(`${__hooks}/lib/booking-store`) as typeof import("../lib/booking-store");
  const { rangeAvailability } =
    require(`${__hooks}/lib/booking-availability`) as typeof import("../lib/booking-availability");
  requireBookingStaff(e);
  const query = e.request.url.query();
  return e.json(200, rangeAvailability(e.app, query.get("from"), query.get("to"), e.auth!.getString("business")));
}, $apis.requireAuth("admins"));
