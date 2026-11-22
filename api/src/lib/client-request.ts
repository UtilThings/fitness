/// <reference path="../../pb_data/types.d.ts" />

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
  if (!clients.isValidEmail(email)) invalid("email", "Ingresa un email válido.");
  const phone = clients.normalizePhone(record.getString("phone"));
  if (!phone.ok) invalid("phone", phone.error);

  const storedAssessment = record.getString("assessment");
  const assessment = clients.validateAssessment(storedAssessment ? JSON.parse(storedAssessment) : null);
  if (!assessment.ok) {
    invalid("assessment", "Revisa la evaluación. " + Object.entries(assessment.errors).map(([key, message]) => key + " · " + message).join(" "));
  }

  const role = e.auth?.collection().name === "admins" ? e.auth.getString("role") : undefined;
  if (!clients.canChangeFreeClass({
    role, from: before.getBool("free_class_used"), to: record.getBool("free_class_used"),
  })) {
    invalid("free_class_used", "Solo el owner puede cambiar la primera clase gratis.");
  }

  const from = before.getString("status");
  if (from === "inactive" && record.getString("status") === "paused") {
    invalid("status", "Activa al cliente antes de pausarlo.");
  }

  const rawDate = body.joined_on;
  if (rawDate && !record.getString("joined_on")) invalid("joined_on", "Ingresa una fecha válida.");

  if (Object.keys(errors).length) throw new BadRequestError("Revisa los datos del cliente.", errors);

  record.set("email", email);
  if (phone.ok) record.set("phone", phone.value);
  record.set("assessment", assessment.value);
  if (!record.getString("joined_on")) {
    record.set("joined_on", startOfLocalDay(utcToLocal(new Date().toISOString()).date).replace("T", " "));
  }

  return e.next();
}
