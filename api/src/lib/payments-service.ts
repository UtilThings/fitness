/// <reference path="../../pb_data/types.d.ts" />

import { chargeForPeriod } from "./payments-due";
import { formatReceipt, localYear, nextSequence } from "./receipt-number";
import { auditActor, inScheduleTransaction, scheduleAudit } from "./schedule-store";
import { utcToLocal } from "./tz";
import { getBusiness, getBusinessTimezone, tenantRecord } from "./tenant";
import { requireMembershipRole } from "./memberships-service";

type Body = Record<string, unknown>;
type Settlement = { business: string; method: unknown; paidAt?: unknown; recordedBy: string; note?: unknown };

export function requirePaymentRole(event: core.RequestEvent) {
  return requireMembershipRole(event, ["owner", "reception"]);
}

function textField(value: unknown) {
  if (value === undefined) return "";
  if (typeof value !== "string") throw new BadRequestError("Enter valid text.");
  return value.trim();
}

function dateField(value: unknown) {
  const date = textField(value);
  if (date) {
    try {
      localYear(date);
    } catch {
      throw new BadRequestError("Enter a valid date in YYYY-MM-DD format.");
    }
  }
  return date;
}

function methodField(value: unknown, required: boolean) {
  const method = textField(value);
  if ((!method && required) || (method && !["cash", "zelle", "card", "other"].includes(method))) {
    throw new BadRequestError("Select a valid payment method.");
  }
  return method;
}

export function issueReceipt(tx: core.App, year: number, business: string, prefix: string) {
  const [existing] = tx.findRecordsByFilter("receipt_sequences", "business = {:business} && year = {:year}", "", 1, 0, { business, year });
  const sequence = existing ?? new Record(tx.findCollectionByNameOrId("receipt_sequences"), { business, year });
  const next = nextSequence(sequence.getInt("last_seq"));
  const number = formatReceipt(prefix, year, next);
  sequence.set("last_seq", next);
  tx.save(sequence);
  return number;
}

function paidFields(tx: core.App, { method, paidAt, note, business }: Settlement) {
  const today = utcToLocal(new Date().toISOString(), getBusinessTimezone(tx, business)).date;
  const date = dateField(paidAt) || today;
  if (date > today) throw new BadRequestError("The payment date cannot be in the future.");
  return {
    status: "paid", method: methodField(method, true), paid_at: date,
    ...(note !== undefined && { note: textField(note) }),
    receipt_number: issueReceipt(tx, localYear(date), business, getBusiness(tx, business)!.getString("receipt_prefix")),
  };
}

function paymentRecord(tx: core.App, id: string, business: string) {
  const payment = tenantRecord(tx, "payments", id, business);
  if (!payment) throw new NotFoundError("Payment not found.");
  return payment;
}

function paymentConflict(message: string) {
  return new ApiError(409, message);
}

export function createPayment(app: core.App, body: Body, recordedBy: string, business: string) {
  const { status, amount_cents } = body;
  if (status !== "paid" && status !== "pending") throw new BadRequestError("Select a valid payment status.");
  if (typeof amount_cents !== "number" || !Number.isSafeInteger(amount_cents) || amount_cents <= 0) {
    throw new BadRequestError("Enter a positive amount in whole cents.");
  }
  const client = textField(body.client);
  if (!client) throw new BadRequestError("Select a client.");
  const membership = textField(body.membership);
  const plan = textField(body.plan);
  const due_on = dateField(body.due_on);
  const note = textField(body.note);
  if (status === "pending" && !due_on) throw new BadRequestError("Enter the due date.");

  return inScheduleTransaction(app, tx => {
    const related = membership ? tenantRecord(tx, "memberships", membership, business) : null;
    if (!tenantRecord(tx, "clients", client, business)) throw new NotFoundError("Client not found.");
    if ((plan && !tenantRecord(tx, "plans", plan, business)) || (membership && !related)) {
      throw new BadRequestError("Select valid records from the same business.");
    }
    if (related && (related.getString("client") !== client || (plan && related.getString("plan") !== plan))) {
      throw new BadRequestError("The membership must belong to the client and plan.");
    }
    if (membership && tx.findRecordsByFilter("payments",
      "membership = {:membership} && period_index = 0 && status != 'void'", "", 1, 0, { membership }).length) {
      throw paymentConflict("A manual charge already exists for this membership.");
    }

    const payment = new Record(tx.findCollectionByNameOrId("payments"), {
      business, currency: getBusiness(tx, business)!.getString("currency"), client, membership, plan: plan || related?.getString("plan") || "", amount_cents, status, due_on, note,
      method: methodField(body.method, status === "paid"), recorded_by: recordedBy,
    });
    if (status === "paid") payment.load(paidFields(tx, { method: body.method, paidAt: body.paid_at, recordedBy, business }));
    auditActor(payment, recordedBy);
    tx.save(payment);
    scheduleAudit(tx, "payments", payment.id, recordedBy, status === "paid" ? "Payment recorded." : "Pending charge recorded.", {});
    return payment;
  });
}

export function settlePayment(app: core.App, id: string, details: Settlement) {
  return inScheduleTransaction(app, tx => {
    const payment = paymentRecord(tx, id, details.business);
    if (payment.getString("status") !== "pending") throw paymentConflict("Only pending charges can be paid.");
    payment.load(paidFields(tx, details));
    auditActor(payment, details.recordedBy);
    tx.save(payment);
    scheduleAudit(tx, "payments", id, details.recordedBy, "Charge marked as paid.", {});
    return payment;
  });
}

export function voidPayment(app: core.App, id: string, { reason, by, business }: { reason: unknown; by: string; business: string }) {
  return inScheduleTransaction(app, tx => {
    const payment = paymentRecord(tx, id, business);
    if (payment.getString("status") === "void") throw paymentConflict("The payment is already voided.");
    const why = textField(reason);
    if (!why) throw new BadRequestError("Enter a reason for voiding the payment.");
    payment.load({
      status: "void", void_reason: why, voided_at: new Date().toISOString().replace("T", " "), voided_by: by,
    });
    auditActor(payment, by);
    tx.save(payment);
    scheduleAudit(tx, "payments", id, by, "Payment voided.", {});
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
      ...charge, business: membership.getString("business"),
      currency: getBusiness(tx, membership.getString("business"))!.getString("currency"), client: membership.getString("client"), membership: membershipId,
      plan: planId, recorded_by: actor, status: "pending",
    });
    auditActor(payment, actor);
    try {
      tx.save(payment);
    } catch (error) {
      if (String(error).includes("UNIQUE constraint failed: payments.membership, payments.period_index")) return;
      throw error;
    }
    scheduleAudit(tx, "payments", payment.id, actor, "Billing cycle charge generated.", { period_index: charge.period_index });
  });
}
