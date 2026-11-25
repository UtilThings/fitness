/// <reference path="../../pb_data/types.d.ts" />

import { getBusinessTimezone, resolveBusiness } from "./tenant";
import * as clients from "./clients";
import { startOfLocalDay, utcToLocal } from "./tz";

export function validateClientRequest(e: core.RecordRequestEvent, before: core.Record) {
  const record = e.record!;
  const body = e.requestInfo().body;
  if (!Object.prototype.hasOwnProperty.call(body, "free_class_used")) {
    record.set("free_class_used", before.getBool("free_class_used"));
  }
  const errors: { [field: string]: ValidationError } = {};
  const invalid = (field: string, message: string) => {
    errors[field] = new ValidationError("validation_client", message);
  };

  const email = clients.normalizeEmail(record.getString("email"));
  if (!clients.isValidEmail(email)) invalid("email", "Enter a valid email address.");
  const phone = clients.normalizePhone(record.getString("phone"));
  if (!phone.ok) invalid("phone", phone.error);

  const storedAssessment = record.getString("assessment");
  const assessment = clients.validateAssessment(storedAssessment ? JSON.parse(storedAssessment) : null);
  if (!assessment.ok) {
    invalid("assessment", "Check the assessment.");
  }

  const role = e.auth?.collection().name === "admins" ? e.auth.getString("role") : undefined;
  if (!clients.canChangeFreeClass({
    role, from: before.getBool("free_class_used"), to: record.getBool("free_class_used"),
  })) {
    invalid("free_class_used", "Only the owner can change the free first class.");
  }

  const from = before.getString("status");
  if (from === "inactive" && record.getString("status") === "paused") {
    invalid("status", "Activate the client before pausing them.");
  }

  const rawDate = body.joined_on;
  if (String(rawDate ?? "").trim() && !record.getString("joined_on")) invalid("joined_on", "Enter a valid date.");

  if (Object.keys(errors).length) throw new BadRequestError("Check the client details.", errors);

  record.set("email", email);
  if (phone.ok) record.set("phone", phone.value);
  record.set("assessment", assessment.value);
  if (!record.getString("joined_on")) {
    const business = e.hasSuperuserAuth() ? record.getString("business") : resolveBusiness(e.auth);
    const timezone = getBusinessTimezone(e.app, business, e);
    const today = utcToLocal(new Date().toISOString(), timezone).date;
    record.set("joined_on", startOfLocalDay(today, timezone).replace("T", " "));
  }

  return e.next();
}
