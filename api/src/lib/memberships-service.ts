/// <reference path="../../pb_data/types.d.ts" />

import { canUseFirstClass, checkBookingEligibility, creditsToGrant, isFirstVisit, localWeekKey,
  requiresCredit, type CreditReason, type Eligibility } from "./credits";
import { addDays, isEarlyCancellation, extendByPause, nextPeriod, periodBounds, shouldExpire } from "./membership-cycles";
import { auditActor, inScheduleTransaction, pocketBaseDate, scheduleAudit } from "./schedule-store";
import { tenantRecord } from "./tenant";
import { startOfLocalDay, utcToLocal } from "./tz";

type Context = { business: string; actor: string; today: string };
type Body = Record<string, unknown>;
export type MembershipAction = "renew" | "pause" | "resume" | "cancel" | "adjust";
type MovementOptions = { actor?: string; booking?: string; note?: string };

export function membershipToday() {
  return utcToLocal(new Date().toISOString()).date;
}

export function membershipError(status: number, code: string, message: string, clientId?: string) {
  return new ApiError(status, message, {
    code: new ValidationError(code, message),
    ...(clientId && { client: new ValidationError(clientId, "Identificador del cliente afectado.") }),
  });
}

export function requireMembershipRole(event: core.RequestEvent, roles: readonly string[]) {
  const actor = event.auth;
  if (actor?.collection().name !== "admins" || !actor.getBool("active") || !roles.includes(actor.getString("role"))) {
    throw membershipError(403, "forbidden", "Tu rol no permite esta operación.");
  }
  return actor.id;
}

export function membershipDate(record: core.Record, field: string) {
  return record.getString(field).slice(0, 10);
}

export function planData(plan: core.Record) {
  return {
    billing_unit: plan.getString("billing_unit"), sessions: plan.getInt("sessions"),
    per_week: plan.getInt("per_week"), is_first_class: plan.getBool("is_first_class"),
  };
}

function requiredText(value: unknown, field: string, message: string) {
  if (typeof value !== "string" || !value.trim()) throw membershipError(400, field, message);
  return value.trim();
}

function optionalNotes(value: unknown) {
  return value === undefined || value === "" ? "" : requiredText(value, "notes", "Indica observaciones válidas.");
}

function appendNotes(record: core.Record, note: string) {
  if (note) record.set("notes", [record.getString("notes"), note].filter(Boolean).join("\n"));
}

function saveMembership(app: core.App, record: core.Record, actor = "") {
  auditActor(record, actor);
  app.save(record);
}

export function recordMovement(app: core.App, membership: core.Record, delta: number, reason: CreditReason, {
  actor = "", booking = "", note = "",
}: MovementOptions = {}) {
  if (!Number.isInteger(delta) || delta === 0 || (reason === "adjust" && !note.trim())) {
    throw membershipError(400, "invalid_movement", "Indica un ajuste entero distinto de cero y su motivo.");
  }
  return inScheduleTransaction(app, (tx) => {
    const movement = new Record(tx.findCollectionByNameOrId("credit_movements"), {
      business: membership.getString("business"), membership: membership.id, booking, delta, reason, note, created_by: actor,
    });
    auditActor(movement, actor);
    tx.save(movement);
    membership.set("credits_balance", membership.getInt("credits_balance") + delta);
    saveMembership(tx, membership, actor);
    return movement;
  });
}

function liveDuplicate(app: core.App, client: string, plan: string, id = "") {
  return app.findRecordsByFilter("memberships",
    "client = {:client} && plan = {:plan} && id != {:id} && (status = 'active' || status = 'paused')",
    "", 1, 0, { client, plan, id }).length > 0;
}

export function expirePeriodCredits(app: core.App, membership: core.Record, actor = "") {
  const balance = membership.getInt("credits_balance");
  if (balance <= 0) return null;
  const note = "Cierre del periodo " + membership.getInt("periods_paid");
  const expired = app.findRecordsByFilter("credit_movements",
    "membership = {:membership} && reason = 'expire' && note = {:note}", "", 1, 0,
    { membership: membership.id, note });
  return expired.length ? null : recordMovement(app, membership, -balance, "expire", { actor, note });
}

function grant(app: core.App, membership: core.Record, plan: core.Record, actor: string) {
  const amount = creditsToGrant(planData(plan));
  return amount ? recordMovement(app, membership, amount, "grant", { actor }) : null;
}

export function assign(app: core.App, body: Body, { business, actor, today }: Context) {
  const clientId = requiredText(body.client, "client", "Selecciona un cliente.");
  const planId = requiredText(body.plan, "plan", "Selecciona un plan.");
  const notes = optionalNotes(body.notes);
  const start = body.starts_on === undefined ? today : requiredText(body.starts_on, "starts_on", "Indica una fecha de inicio.");
  let bounds;
  try {
    bounds = periodBounds(start, 1);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bounds.end)) throw new RangeError();
  } catch {
    throw membershipError(400, "starts_on", "Indica una fecha válida en formato YYYY-MM-DD.");
  }
  return inScheduleTransaction(app, (tx) => {
    const client = tenantRecord(tx, "clients", clientId, business);
    const plan = tenantRecord(tx, "plans", planId, business);
    if (!client || !plan) throw membershipError(404, "not_found", "Cliente o plan no encontrado.");
    if (!plan.getBool("active")) throw membershipError(409, "inactive_plan", "El plan está inactivo.");
    if (liveDuplicate(tx, clientId, planId)) throw membershipError(409, "duplicate_plan", "El cliente ya tiene este plan activo o pausado.");
    if (isFirstVisit(planData(plan))) {
      const priorPlans = tx.findRecordsByFilter("memberships", "client = {:client}", "", 0, 0, { client: clientId })
        .flatMap((record) => record ? [planData(tx.findRecordById("plans", record.getString("plan")))] : []);
      if (!canUseFirstClass({ free_class_used: client.getBool("free_class_used") }, priorPlans)) {
        throw membershipError(409, "first_class_used", "El cliente ya tiene o utilizó un plan de primera clase.");
      }
    }
    const membership = new Record(tx.findCollectionByNameOrId("memberships"), {
      business, client: clientId, plan: planId, status: "active", starts_on: start,
      current_period_start: bounds.start, current_period_end: bounds.end, periods_paid: 1,
      commitment_periods_total: plan.getInt("commitment_periods"), notes,
    });
    saveMembership(tx, membership, actor);
    const movement = grant(tx, membership, plan, actor);
    scheduleAudit(tx, "memberships", membership.id, actor, "Plan asignado", {});
    return { membership, movement };
  });
}

function requireStatus(membership: core.Record, ...allowed: string[]) {
  if (!allowed.includes(membership.getString("status"))) {
    throw membershipError(409, "invalid_status", "El estado de la membresía no permite esta acción.");
  }
}

function renew(app: core.App, membership: core.Record, body: Body, { actor, today }: Context) {
  requireStatus(membership, "active", "expired");
  const plan = app.findRecordById("plans", membership.getString("plan"));
  if (isFirstVisit(planData(plan))) throw membershipError(409, "first_visit", "La primera clase no se puede renovar.");
  if (liveDuplicate(app, membership.getString("client"), plan.id, membership.id)) {
    throw membershipError(409, "duplicate_plan", "El cliente ya tiene este plan activo o pausado.");
  }
  const status = membership.getString("status");
  const end = membershipDate(membership, "current_period_end");
  const bounds = status === "expired" || shouldExpire({ status, current_period_end: end }, today)
    ? periodBounds(today, 1) : nextPeriod(end);
  appendNotes(membership, optionalNotes(body.notes));
  expirePeriodCredits(app, membership, actor);
  // An adjustment or correction may have restored credits after the daily expiry.
  const remaining = membership.getInt("credits_balance");
  if (remaining > 0) recordMovement(app, membership, -remaining, "expire", { actor, note: "Cierre por renovación" });
  membership.load({
    status: "active", current_period_start: bounds.start, current_period_end: bounds.end,
    periods_paid: membership.getInt("periods_paid") + 1, ended_on: "", paused_at: "",
  });
  saveMembership(app, membership, actor);
  return { movement: grant(app, membership, plan, actor), summary: "Membresía renovada" };
}

function pause(app: core.App, membership: core.Record, body: Body, { today }: Context) {
  requireStatus(membership, "active");
  appendNotes(membership, requiredText(body.note, "note", "Indica el motivo de la pausa."));
  membership.load({ status: "paused", paused_at: today });
  return { summary: "Membresía pausada" };
}

function resume(app: core.App, membership: core.Record, _body: Body, { today }: Context) {
  requireStatus(membership, "paused");
  const end = extendByPause(membershipDate(membership, "current_period_end"), membershipDate(membership, "paused_at"), today);
  membership.load({ status: "active", current_period_end: end, paused_at: "" });
  return { summary: "Membresía reanudada" };
}

function cancel(app: core.App, membership: core.Record, body: Body, { actor, today }: Context) {
  requireStatus(membership, "active", "paused", "expired");
  const note = requiredText(body.note, "note", "Indica el motivo de la cancelación.");
  const early = isEarlyCancellation({
    starts_on: membershipDate(membership, "starts_on"),
    commitment_periods_total: membership.getInt("commitment_periods_total"),
  }, today);
  const summary = early ? "Cancelación anticipada de membresía" : "Membresía cancelada";
  appendNotes(membership, early ? summary + ": " + note : note);
  membership.load({ status: "cancelled", ended_on: today, paused_at: "" });
  const balance = membership.getInt("credits_balance");
  const movement = balance > 0 ? recordMovement(app, membership, -balance, "expire", { actor, note }) : null;
  return { movement, summary };
}

function adjust(app: core.App, membership: core.Record, body: Body, { actor }: Context) {
  const note = requiredText(body.note, "note", "Indica el motivo del ajuste.");
  if (typeof body.delta !== "number" || !Number.isSafeInteger(body.delta) || body.delta === 0) {
    throw membershipError(400, "delta", "Indica un número entero distinto de cero.");
  }
  return { movement: recordMovement(app, membership, body.delta, "adjust", { actor, note }), summary: "Créditos ajustados" };
}

const actions = { renew, pause, resume, cancel, adjust };

export function manageMembership(app: core.App, id: string, action: MembershipAction, body: Body, context: Context) {
  return inScheduleTransaction(app, (tx) => {
    const membership = tenantRecord(tx, "memberships", id, context.business);
    if (!membership) throw membershipError(404, "not_found", "Membresía no encontrada.");
    const result = actions[action](tx, membership, body, context);
    const movement = "movement" in result ? result.movement : null;
    if (action === "pause" || action === "resume" || (action === "cancel" && !movement)) {
      saveMembership(tx, membership, context.actor);
    }
    scheduleAudit(tx, "memberships", id, context.actor, result.summary, {});
    return { membership, movement };
  });
}

export type BookingEligibilityOptions = { now?: number; bookingId?: string; override?: boolean; firstVisit?: boolean };
type Selection = Eligibility & { membership?: core.Record; freeClass?: boolean };

export function sessionDate(session: core.Record) {
  return utcToLocal(session.getString("starts_at").replace(" ", "T")).date;
}

export function chargeable(app: core.App, session: core.Record) {
  const service = app.findRecordById("services", session.getString("service"));
  return requiresCredit({ kind: session.getString("kind") || "regular" }, { kind: service.getString("kind") });
}

export function matchingMemberships(app: core.App, client: string, service: string) {
  return app.findRecordsByFilter("memberships", "client = {:client} && plan.service = {:service}",
    "current_period_end,id", 0, 0, { client, service }).flatMap((record) => record ? [{
      record, plan: planData(app.findRecordById("plans", record.getString("plan"))),
    }] : []);
}

export function covers(membership: core.Record, date: string) {
  return membershipDate(membership, "current_period_start") <= date &&
    membershipDate(membership, "current_period_end") >= date;
}

function commitments(app: core.App, client: string, session: core.Record, membership: core.Record,
  date: string, options: BookingEligibilityOptions) {
  const week = localWeekKey(date);
  const weekEnd = addDays(week, 7);
  const periodStart = membershipDate(membership, "current_period_start");
  const periodEnd = membershipDate(membership, "current_period_end");
  const from = periodStart < week ? periodStart : week;
  const to = periodEnd >= weekEnd ? addDays(periodEnd, 1) : weekEnd;
  const now = options.now ?? Date.now();
  const bookings = app.findRecordsByFilter("bookings",
    "client = {:client} && id != {:id} && session.service = {:service} && session.kind != 'special'" +
    " && session.starts_at >= {:from} && session.starts_at < {:to}" +
    " && (membership = {:membership} || (membership = '' && override_note = ''))" +
    " && status != 'cancelled'", "", 0, 0, {
    client, id: options.bookingId ?? "", service: session.getString("service"),
    from: pocketBaseDate(startOfLocalDay(from)), to: pocketBaseDate(startOfLocalDay(to)),
    membership: membership.id,
  });
  let committedBookings = 0;
  let weekBookings = 0;
  for (const booking of bookings) {
    if (!booking) continue;
    const related = app.findRecordById("class_sessions", booking.getString("session"));
    const startsAt = Date.parse(related.getString("starts_at").replace(" ", "T"));
    const localDate = sessionDate(related);
    if (localDate >= week && localDate < weekEnd) weekBookings++;
    if (booking.getString("status") === "booked" && startsAt > now && localDate >= periodStart && localDate <= periodEnd) {
      committedBookings++;
    }
  }
  return { committedBookings, weekBookings };
}

export function selectBookingMembership(app: core.App, clientId: string, session: core.Record, options: BookingEligibilityOptions = {}): Selection {
  if (!chargeable(app, session)) return { allowed: true, code: "ok", available: null };
  const client = app.findRecordById("clients", clientId);
  const date = sessionDate(session);
  const matching = matchingMemberships(app, clientId, session.getString("service"))
    .filter(({ plan }) => !options.firstVisit || isFirstVisit(plan));
  let rejected: Selection | undefined;
  for (const { record, plan } of matching) {
    if (record.getString("status") !== "active" || !covers(record, date)) continue;
    const freeClass = isFirstVisit(plan);
    if (freeClass && client.getBool("free_class_used")) continue;
    const attempt = {
      ...checkBookingEligibility({
        membership: { status: "active", credits_balance: record.getInt("credits_balance") },
        plan, ...commitments(app, clientId, session, record, date, options),
      }),
      membership: record, freeClass,
    };
    if (attempt.allowed) return attempt;
    rejected ??= attempt;
  }

  // An override can still debit an active plan for this service when the date is outside its period.
  const fallback = matching.find(({ record, plan }) => record.getString("status") === "active" && !isFirstVisit(plan));
  const result = rejected ?? {
    allowed: false, code: matching.length ? "membership_not_active" as const : "no_membership" as const,
    available: 0, membership: fallback?.record,
  };
  return options.override ? { ...result, allowed: true, code: "overridden" } : result;
}

export function checkEligibility(app: core.App, clientId: string, session: core.Record, options: BookingEligibilityOptions = {}): Eligibility {
  const { allowed, code, available } = selectBookingMembership(app, clientId, session, options);
  return { allowed, code, available };
}


export function runDaily(app: Pick<core.App, "runInTransaction">, business: string, today: string, actor = "") {
  return inScheduleTransaction(app, (tx) => {
    let expiredCredits = 0;
    let expiredMemberships = 0;
    const due = tx.findRecordsByFilter("memberships",
      "business = {:business} && status = 'active' && current_period_end < {:today}", "current_period_end,id", 0, 0, { business, today });
    for (const membership of due) {
      if (!membership) continue;
      const movement = expirePeriodCredits(tx, membership, actor);
      const credits = movement ? -movement.getInt("delta") : 0;
      const expire = shouldExpire({
        status: membership.getString("status"), current_period_end: membershipDate(membership, "current_period_end"),
      }, today);
      if (expire) {
        membership.load({ status: "expired", ended_on: today });
        saveMembership(tx, membership, actor);
        expiredMemberships++;
      }
      expiredCredits += credits;
      if (expire || credits) {
        scheduleAudit(tx, "memberships", membership.id, actor,
          expire ? "Membresía vencida al terminar la gracia" : "Créditos vencidos al cierre del periodo",
          { expiredCredits: credits, expiredMemberships: Number(expire) });
      }
    }
    return { expiredCredits, expiredMemberships };
  });
}
