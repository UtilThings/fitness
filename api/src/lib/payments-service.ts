/// <reference path="../../pb_data/types.d.ts" />

import { chargeForPeriod } from "./payments-due";
import { formatReceipt, localYear, nextSequence } from "./receipt-number";
import { auditActor, inScheduleTransaction, scheduleAudit } from "./schedule-store";
import { utcToLocal } from "./tz";
import { tenantRecord } from "./tenant";
import { requireMembershipRole } from "./memberships-service";

type Body = Record<string, unknown>;
type Settlement = { business: string; method: unknown; paidAt?: unknown; recordedBy: string; note?: unknown };

export function requirePaymentRole(event: core.RequestEvent) {
  return requireMembershipRole(event, ["owner", "reception"]);
}

function textField(value: unknown) {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new BadRequestError("Ingresa un texto válido.");
  return value.trim();
}

function dateField(value: unknown) {
  const date = textField(value);
  if (date) {
    try {
      localYear(date);
    } catch {
      throw new BadRequestError("Indica una fecha válida en formato YYYY-MM-DD.");
    }
  }
  return date;
}

function methodField(value: unknown, required: boolean) {
  const method = textField(value);
  if ((!method && required) || (method && !["cash", "zelle", "card", "other"].includes(method))) {
    throw new BadRequestError("Selecciona un método de pago válido.");
  }
  return method;
}

export function issueReceipt(tx: core.App, year: number, business: string) {
  const [existing] = tx.findRecordsByFilter("receipt_sequences", "business = {:business} && year = {:year}", "", 1, 0, { business, year });
  const sequence = existing ?? new Record(tx.findCollectionByNameOrId("receipt_sequences"), { business, year });
  const next = nextSequence(sequence.getInt("last_seq"));
  const number = formatReceipt(year, next);
  sequence.set("last_seq", next);
  tx.save(sequence);
  return number;
}

function paidFields(tx: core.App, { method, paidAt, note, business }: Settlement) {
  const today = utcToLocal(new Date().toISOString()).date;
  const date = dateField(paidAt) || today;
  if (date > today) throw new BadRequestError("La fecha de pago no puede ser futura.");
  return {
    status: "paid", method: methodField(method, true), paid_at: date,
    ...(note !== undefined && { note: textField(note) }),
    receipt_number: issueReceipt(tx, localYear(date), business),
  };
}

function paymentRecord(tx: core.App, id: string, business: string) {
  const payment = tenantRecord(tx, "payments", id, business);
  if (!payment) throw new NotFoundError("Pago no encontrado.");
  return payment;
}

function paymentConflict(message: string) {
  return new ApiError(409, message);
}

export function createPayment(app: core.App, body: Body, recordedBy: string, business: string) {
  const { status, amount_cents } = body;
  if (status !== "paid" && status !== "pending") throw new BadRequestError("Selecciona un estado de pago válido.");
  if (typeof amount_cents !== "number" || !Number.isSafeInteger(amount_cents) || amount_cents <= 0) {
    throw new BadRequestError("Indica un monto positivo en centavos enteros.");
  }
  const client = textField(body.client);
  if (!client) throw new BadRequestError("Selecciona un cliente.");
  const membership = textField(body.membership);
  const plan = textField(body.plan);
  const due_on = dateField(body.due_on);
  const note = textField(body.note);
  if (status === "pending" && !due_on) throw new BadRequestError("Indica la fecha de vencimiento.");

  return inScheduleTransaction(app, tx => {
    const related = membership ? tenantRecord(tx, "memberships", membership, business) : null;
    if (!tenantRecord(tx, "clients", client, business)) throw new NotFoundError("Cliente no encontrado.");
    if ((plan && !tenantRecord(tx, "plans", plan, business)) || (membership && !related)) {
      throw new BadRequestError("Selecciona registros válidos del mismo negocio.");
    }
    if (related && (related.getString("client") !== client || (plan && related.getString("plan") !== plan))) {
      throw new BadRequestError("La membresía debe corresponder al cliente y al plan.");
    }
    if (membership && tx.findRecordsByFilter("payments",
      "membership = {:membership} && period_index = 0 && status != 'void'", "", 1, 0, { membership }).length) {
      throw paymentConflict("Ya existe un cobro manual para esta membresía.");
    }

    const payment = new Record(tx.findCollectionByNameOrId("payments"), {
      business, client, membership, plan: plan || related?.getString("plan") || "", amount_cents, status, due_on, note,
      method: methodField(body.method, status === "paid"), recorded_by: recordedBy,
    });
    if (status === "paid") payment.load(paidFields(tx, { method: body.method, paidAt: body.paid_at, recordedBy, business }));
    auditActor(payment, recordedBy);
    tx.save(payment);
    scheduleAudit(tx, "payments", payment.id, recordedBy, status === "paid" ? "Pago registrado" : "Cobro pendiente registrado", {});
    return payment;
  });
}

export function settlePayment(app: core.App, id: string, details: Settlement) {
  return inScheduleTransaction(app, tx => {
    const payment = paymentRecord(tx, id, details.business);
    if (payment.getString("status") !== "pending") throw paymentConflict("Solo se puede pagar un cobro pendiente.");
    payment.load(paidFields(tx, details));
    auditActor(payment, details.recordedBy);
    tx.save(payment);
    scheduleAudit(tx, "payments", id, details.recordedBy, "Cobro marcado como pagado", {});
    return payment;
  });
}

export function voidPayment(app: core.App, id: string, { reason, by, business }: { reason: unknown; by: string; business: string }) {
  return inScheduleTransaction(app, tx => {
    const payment = paymentRecord(tx, id, business);
    if (payment.getString("status") === "void") throw paymentConflict("El pago ya está anulado.");
    const why = textField(reason);
    if (!why) throw new BadRequestError("Indica el motivo de la anulación.");
    payment.load({
      status: "void", void_reason: why, voided_at: new Date().toISOString().replace("T", " "), voided_by: by,
    });
    auditActor(payment, by);
    tx.save(payment);
    scheduleAudit(tx, "payments", id, by, "Pago anulado", {});
    return payment;
  });
}

export function ensurePendingCharge(app: core.App, membership: core.Record) {
  const membershipId = membership.id;
  const planId = membership.getString("plan");
  const status = membership.getString("status");
  const periods_paid = membership.getInt("periods_paid");
  if (status === "cancelled" || periods_paid < 1) return;

  inScheduleTransaction(app, tx => {
    const plan = tx.findRecordById("plans", planId);
    const charge = chargeForPeriod({
      price_cents: plan.getInt("price_cents"),
      billing_unit: plan.getString("billing_unit"),
      is_first_class: plan.getBool("is_first_class"),
    }, {
      status, periods_paid, current_period_start: membership.getString("current_period_start").slice(0, 10),
    });
    if (!charge) return;

    const [existing] = tx.findRecordsByFilter("payments",
      "membership = {:membershipId} && period_index = {:index} && status != 'void'",
      "", 1, 0, { membershipId, index: charge.period_index });
    if (existing) return;

    const actor = membership.getString("@pbInternalAuditActor");
    if (!actor) return; // Legacy records and system updates can have no staff actor.

    const payment = new Record(tx.findCollectionByNameOrId("payments"), {
      ...charge, business: membership.getString("business"), client: membership.getString("client"), membership: membershipId,
      plan: planId, recorded_by: actor, status: "pending",
    });
    auditActor(payment, actor);
    try {
      tx.save(payment);
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed: payments.membership, payments.period_index")) return;
      throw error;
    }
    scheduleAudit(tx, "payments", payment.id, actor, "Cobro por ciclo generado", { period_index: charge.period_index });
  });
}
