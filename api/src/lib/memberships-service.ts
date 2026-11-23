/// <reference path="../../pb_data/types.d.ts" />

import { canUseFirstClass, creditsToGrant, isFirstVisit, type CreditReason } from "./credits";
import { isEarlyCancellation, extendByPause, nextPeriod, periodBounds, shouldExpire } from "./membership-cycles";
import { auditActor, getRecord, inScheduleTransaction, scheduleAudit } from "./schedule-store";
import { utcToLocal } from "./tz";

type Context = { actor: string; today: string };
type Body = Record<string, unknown>;
export type MembershipAction = "renew" | "pause" | "resume" | "cancel" | "adjust";
type MovementOptions = { actor?: string; booking?: string; note?: string };

export function membershipToday() {
  return utcToLocal(new Date().toISOString()).date;
}

export function membershipError(status: number, code: string, message: string) {
  return new ApiError(status, message, { code: new ValidationError(code, message) });
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
      membership: membership.id, booking, delta, reason, note, created_by: actor,
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

export function assign(app: core.App, body: Body, { actor, today }: Context) {
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
    const client = getRecord(tx, "clients", clientId);
    const plan = getRecord(tx, "plans", planId);
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
      client: clientId, plan: planId, status: "active", starts_on: start,
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
    const membership = getRecord(tx, "memberships", id);
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
