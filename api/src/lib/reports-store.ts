/// <reference path="../../pb_data/types.d.ts" />

import { requireBookingStaff } from "./booking-store";
import { aggregateAttendance, aggregateOccupancy } from "./reports-attendance";
import { aggregateRetention, aggregateRevenue, type ReportPlan } from "./reports-finance";
import { parseRange, rangeDays, ReportRangeError, utcToLocalParts } from "./reports-range";
import { pocketBaseDate } from "./schedule-store";
import { getBusiness } from "./tenant";
import { addLocalDays } from "./tz";

type Kind = "occupancy" | "attendance" | "revenue" | "retention";

function records(app: core.App, collection: string, filter: string, params: dbx.Params & { business: string }) {
  // A limit of zero applies only the SQL filter, with no implicit page cap.
  return app.findRecordsByFilter(collection, `business = {:business} && (${filter})`, "", 0, 0, params)
    .filter((record): record is core.Record => !!record);
}

function expand(app: core.App, entries: core.Record[], fields: string[]) {
  if (Object.keys(app.expandRecords(entries, fields, null)).length) {
    throw new InternalServerError("No se pudieron cargar las relaciones del reporte.");
  }
}

function isoField(record: core.Record, field: string) {
  return record.getString(field).replace(" ", "T");
}

function loadReport(e: core.RequestEvent, kind: Kind) {
  requireBookingStaff(e);
  if (kind === "revenue" && e.auth?.getString("role") !== "owner") {
    throw new ForbiddenError("No tienes permiso para ver este reporte.");
  }

  const query = e.request.url.query();
  const business = e.auth!.getString("business");
  const settings = getBusiness(e.app, business)!;
  const timezone = settings.getString("timezone");
  const currency = settings.getString("currency");
  const range = parseRange(query.get("from"), query.get("to"), timezone);
  const groupBy = query.has("group_by") ? query.get("group_by") : "month";
  if (groupBy !== "day" && groupBy !== "week" && groupBy !== "month") {
    throw new ReportRangeError("La agrupación debe ser day, week o month.");
  }
  if ((kind === "revenue" || kind === "retention") && groupBy === "day" && rangeDays(range) > 92) {
    throw new ReportRangeError("La agrupación diaria admite hasta 92 días.");
  }

  const app = e.app;
  const service = kind !== "retention" && query.has("service") ? query.get("service") : undefined;
  const selected = service === undefined
    ? undefined
    : app.findRecordsByFilter("services", "business = {:business} && slug = {:slug}", "", 1, 0, { business, slug: service })[0];
  if (service !== undefined && !selected) throw new ReportRangeError("El servicio indicado no existe.");

  const start = pocketBaseDate(range.start_utc);
  const end = pocketBaseDate(range.end_utc);
  const dateFrom = range.from + " 00:00:00.000Z";
  const dateEnd = addLocalDays(range.to, 1) + " 00:00:00.000Z";
  const opts = { range, service, groupBy, timezone, currency } as const;

  if (kind === "occupancy" || kind === "attendance") {
    const params = selected ? { business, start, end, service: selected.id } : { business, start, end };
    const filter = (prefix: string) =>
      `${prefix}starts_at >= {:start} && ${prefix}starts_at < {:end} && ${prefix}status != 'cancelled'` +
      (selected ? ` && ${prefix}service = {:service}` : "");
    const entries = records(app, "class_sessions", filter(""), params);
    expand(app, entries, ["service", "coach"]);
    const sessions = entries.map((record) => {
      const relatedService = record.expandedOne("service");
      return {
        id: record.id, starts_at: isoField(record, "starts_at"), status: record.getString("status"),
        service: relatedService?.getString("slug") ?? "", name: relatedService?.getString("name") ?? "Sin servicio",
        coach_name: record.expandedOne("coach")?.getString("name") ?? "", capacity: record.getInt("capacity"),
      };
    });
    const bookings = sessions.length ? records(app, "bookings", filter("session."), params).map((record) => ({
      session: record.getString("session"), status: record.getString("status"),
    })) : [];
    return {
      range, currency,
      ...(kind === "occupancy" ? aggregateOccupancy(sessions, bookings, opts) : aggregateAttendance(sessions, bookings, { service, timezone })),
    };
  }

  if (kind === "revenue") {
    const entries = records(app, "payments",
      "(status = 'paid' && ((paid_at >= {:start} && paid_at < {:end}) || (paid_at >= {:dateFrom} && paid_at < {:dateEnd}))) || " +
      "((status = 'pending' || status = 'void') && due_on >= {:dateFrom} && due_on < {:dateEnd}) || " +
      "(status = 'void' && due_on = '' && voided_at >= {:start} && voided_at < {:end})",
      { business, start, end, dateFrom, dateEnd });
    expand(app, entries, ["plan.service"]);
    const services = new Map<string, { id: string; name: string; slug: string }>();
    const plans = new Map<string, ReportPlan>();
    const payments = entries.map((record) => {
      const plan = record.expandedOne("plan");
      if (plan) {
        plans.set(plan.id, planData(plan));
        const relatedService = plan.expandedOne("service");
        if (relatedService) {
          services.set(relatedService.id, {
            id: relatedService.id, name: relatedService.getString("name"), slug: relatedService.getString("slug"),
          });
        }
      }
      const paidAt = isoField(record, "paid_at");
      // The payments route stores a chosen civil date at UTC midnight.
      const paidOn = paidAt.endsWith("T00:00:00.000Z") ? paidAt.slice(0, 10) : undefined;
      const voidedAt = isoField(record, "voided_at");
      const reference_on = record.getString("due_on").slice(0, 10) || (voidedAt ? utcToLocalParts(voidedAt, timezone).date : "");
      return {
        plan: record.getString("plan"), status: record.getString("status"),
        paid_at: paidAt, paid_on: paidOn, currency: record.getString("currency"), amount_cents: record.getInt("amount_cents"), reference_on,
      };
    });
    return { range, currency, ...aggregateRevenue(payments, [...plans.values()], [...services.values()], opts) };
  }

  const entries = records(app, "memberships",
    "starts_on < {:dateEnd} && (status = 'active' || status = 'paused' || ended_on = '' || ended_on >= {:dateFrom})",
    { business, dateFrom, dateEnd });
  expand(app, entries, ["plan"]);
  const plans = new Map<string, ReportPlan>();
  const memberships = entries.map((record) => {
    const plan = record.expandedOne("plan");
    if (plan) plans.set(plan.id, planData(plan));
    return {
      plan: record.getString("plan"), status: record.getString("status"),
      starts_on: record.getString("starts_on").slice(0, 10), ended_on: record.getString("ended_on").slice(0, 10),
    };
  });
  return { range, currency, ...aggregateRetention(memberships, [...plans.values()], opts) };
}

function planData(plan: core.Record): ReportPlan {
  return { id: plan.id, name: plan.getString("name"), service: plan.getString("service") };
}

export function serveReport(e: core.RequestEvent, kind: Kind) {
  try {
    return e.json(200, loadReport(e, kind));
  } catch (error) {
    if (error instanceof ReportRangeError) throw new BadRequestError(error.message);
    throw error;
  }
}
