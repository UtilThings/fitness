/// <reference path="../../pb_data/types.d.ts" />

import { canUseFirstClass, computeBalance, creditsToApply, creditsToGrant, isFirstVisit, reasonFor, type EligibilityCode } from "./credits";
import { assign, chargeable, covers, matchingMemberships, membershipError, planData, recordMovement,
  selectBookingMembership, sessionDate, type BookingEligibilityOptions } from "./memberships-service";
import { getRecord } from "./schedule-store";
import { setFreeClassUsed } from "./booking-store";

const eligibilityMessages: Record<EligibilityCode, string> = {
  ok: "",
  overridden: "",
  no_membership: "El cliente no tiene una membresía para este servicio.",
  membership_not_active: "El cliente no tiene una membresía activa para la fecha de la sesión.",
  no_credits: "El cliente no tiene créditos disponibles.",
  weekly_limit: "El cliente alcanzó el límite semanal de reservas.",
};

export function authorizeBooking(app: core.App, client: core.Record, session: core.Record,
  options: BookingEligibilityOptions & { actor: string; today: string; reportClient?: boolean }) {
  let selection = selectBookingMembership(app, client.id, session, { ...options, override: false });
  if (options.firstVisit && selection.code === "no_membership") {
    const service = session.getString("service");
    const [plan] = app.findRecordsByFilter("plans",
      "service = {:service} && active = true && is_first_class = true", "", 1, 0, { service });
    const firstVisitUsed = app.findRecordsByFilter("memberships",
      "client = {:client} && (plan.is_first_class = true || plan.billing_unit = 'first_visit')", "", 1, 0, { client: client.id });
    if (!plan || !canUseFirstClass({ free_class_used: client.getBool("free_class_used") },
      firstVisitUsed.length ? [planData(plan)] : [])) {
      throw membershipError(400, "first_class_used", "El cliente no puede usar una primera clase en este servicio.");
    }
    assign(app, { client: client.id, plan: plan.id }, options);
    selection = selectBookingMembership(app, client.id, session, { ...options, override: false });
  }
  if (!selection.allowed) {
    if (!options.override || options.firstVisit) {
      throw membershipError(400, selection.code, eligibilityMessages[selection.code], options.reportClient ? client.id : undefined);
    }
    selection = selectBookingMembership(app, client.id, session, options);
  }
  return selection;
}

export function reconcileBooking(app: core.App, booking: core.Record) {
  const status = booking.getString("status");
  const movements = app.findRecordsByFilter("credit_movements", "booking = {:booking}", "created,id", 0, 0, { booking: booking.id });
  if (!movements.length && !reasonFor(status)) return;
  const byMembership = new Map<string, { delta: number }[]>();
  for (const movement of movements) {
    if (!movement) continue;
    const id = movement.getString("membership");
    const existing = byMembership.get(id) ?? [];
    existing.push({ delta: movement.getInt("delta") });
    byMembership.set(id, existing);
  }
  const session = app.findRecordById("class_sessions", booking.getString("session"));
  const client = booking.getString("client");
  let target: core.Record | undefined;
  if (reasonFor(status) && chargeable(app, session)) {
    const membershipId = booking.getString("membership");
    target = membershipId ? getRecord(app, "memberships", membershipId) : undefined;
    if (!target) {
      const previous = [...byMembership].find(([, entries]) => computeBalance(entries) < 0)?.[0];
      if (previous) target = getRecord(app, "memberships", previous);
    }
    if (!target && !booking.getBool("free_class")) {
      target = matchingMemberships(app, client, session.getString("service"))
        .find(({ record }) => record.getString("status") === "active" && covers(record, sessionDate(session)))?.record;
    }
    if (target) {
      const plan = planData(app.findRecordById("plans", target.getString("plan")));
      if (status === "attended" && isFirstVisit(plan)) {
        setFreeClassUsed(app, app.findRecordById("clients", client), true, booking.getString("marked_by"));
      }
      if (creditsToGrant(plan) === null && !byMembership.has(target.id)) target = undefined;
    }
  }

  if (target && !byMembership.has(target.id)) byMembership.set(target.id, []);
  for (const [membershipId, entries] of byMembership) {
    const change = creditsToApply(membershipId === target?.id ? status : "cancelled", computeBalance(entries));
    if (!change) continue;
    const membership = app.findRecordById("memberships", membershipId);
    const note = change.reason === "adjust" ? "Corrección de la reserva" : status === "no_show" ? "No-show" : "";
    recordMovement(app, membership, change.delta, change.reason, { booking: booking.id, note });
  }
}
