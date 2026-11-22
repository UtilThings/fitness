/// <reference path="../../pb_data/types.d.ts" />

routerAdd("GET", "/api/admin/sessions/{id}/availability", (e) => {
  const { requireBookingStaff } = require(`${__hooks}/lib/booking-store`) as typeof import("../lib/booking-store");
  const { singleSessionAvailability } =
    require(`${__hooks}/lib/booking-availability`) as typeof import("../lib/booking-availability");
  const { getRecord } = require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  requireBookingStaff(e);
  const session = getRecord(e.app, "class_sessions", e.request.pathValue("id"));
  if (!session) throw new NotFoundError("Sesión no encontrada.");
  return e.json(200, singleSessionAvailability(e.app, session));
}, $apis.requireAuth("admins"));

routerAdd("GET", "/api/admin/sessions/availability", (e) => {
  const { requireBookingStaff } = require(`${__hooks}/lib/booking-store`) as typeof import("../lib/booking-store");
  const { rangeAvailability } =
    require(`${__hooks}/lib/booking-availability`) as typeof import("../lib/booking-availability");
  requireBookingStaff(e);
  const query = e.request.url.query();
  return e.json(200, rangeAvailability(e.app, query.get("from"), query.get("to")));
}, $apis.requireAuth("admins"));
