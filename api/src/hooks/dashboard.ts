/// <reference path="../../pb_data/types.d.ts" />

routerAdd("GET", "/api/admin/dashboard", (e) => {
  const {
    attentionEndUtc, buildAttention, buildCounts, localDayBoundsUtc, summarizeSessions,
  } = require(`${__hooks}/lib/dashboard`) as typeof import("../lib/dashboard");
  const { bookingData, requireBookingStaff } =
    require(`${__hooks}/lib/booking-store`) as typeof import("../lib/booking-store");
  const { pocketBaseDate } =
    require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");

  if (!e.auth) throw new UnauthorizedError("Sign in is required.");
  requireBookingStaff(e);
  const { getBusinessTimezone } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  const business = e.auth.getString("business");
  const timezone = getBusinessTimezone(e.app, business, e);
  const query = e.request.url.query();
  const rawDays = query.has("days") ? query.get("days") : "7";
  if (!/^(?:[1-9]|1[0-4])$/.test(rawDays)) {
    throw new BadRequestError("Enter a window of 1 to 14 days.");
  }

  const days = Number(rawDays);
  const now = new Date();
  const today = localDayBoundsUtc(now, timezone);
  const params = {
    business,
    start: pocketBaseDate(today.startUtc),
    end: pocketBaseDate(today.endUtc),
    now: pocketBaseDate(now.toISOString()),
    attentionEnd: pocketBaseDate(attentionEndUtc(now, days)),
  };
  const inScope = (prefix: string) =>
    `business = {:business} && ((${prefix}starts_at >= {:start} && ${prefix}starts_at < {:end} && (${prefix}status = 'scheduled' || ${prefix}status = 'completed'))` +
    ` || (${prefix}status = 'scheduled' && ${prefix}starts_at >= {:now} && ${prefix}starts_at < {:attentionEnd}))`;

  const records = e.app.findRecordsByFilter("class_sessions", inScope(""), "starts_at,id", 0, 0, params);
  const errors = e.app.expandRecords(records, ["service", "coach"], null);
  if (Object.keys(errors).length) throw new InternalServerError("Could not load the related class records.");

  const sessions = records.flatMap((record) => {
    if (!record) return [];
    const service = record.expandedOne("service");
    if (!service) throw new InternalServerError("The class has no associated service.");
    const coach = record.expandedOne("coach");
    return [{
      id: record.id,
      service: { id: service.id, name: service.getString("name"), kind: service.getString("kind") },
      starts_at: record.getString("starts_at"),
      duration_min: record.getInt("duration_min"),
      coach: coach ? { id: coach.id, name: coach.getString("name") } : null,
      capacity: record.getInt("capacity"),
      status: record.getString("status"),
    }];
  });
  const bookings = sessions.length
    ? e.app.findRecordsByFilter("bookings",
      inScope("session.") + " && (status = 'booked' || status = 'attended' || status = 'no_show' || status = 'waitlisted')",
      "", 0, 0, params).flatMap((record) =>
      record ? [{ ...bookingData(record), session: record.getString("session") }] : [])
    : [];
  const activeClients = e.app.countRecords("clients", $dbx.hashExp({ business, status: "active" }));
  const todaySessions = sessions.filter((session) => session.starts_at >= params.start && session.starts_at < params.end);
  const attention = buildAttention(sessions, bookings, now, days);

  return e.json(200, {
    generated_at: now.toISOString(),
    timezone,
    today: { date: today.date, start_utc: today.startUtc, end_utc: today.endUtc },
    counts: buildCounts({ activeClients, todaySessions, todayBookings: bookings, attention }),
    sessions_today: summarizeSessions(todaySessions, bookings),
    attention,
    upcoming_payments: null,
  });
}, $apis.requireAuth("admins"));
