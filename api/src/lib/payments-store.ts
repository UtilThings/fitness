/// <reference path="../../pb_data/types.d.ts" />

import { buildDueReport } from "./payments-due";
import { addDays } from "./membership-cycles";
import { utcToLocal } from "./tz";

function expand(app: core.App, records: core.Record[]) {
  const errors = app.expandRecords(records, ["client", "plan"], null);
  if (Object.keys(errors).length) throw new InternalServerError("No se pudieron cargar clientes y planes de los cobros.");
}

function related(record: core.Record) {
  const client = record.expandedOne("client");
  return {
    client: {
      id: record.getString("client"),
      name: client ? [client.getString("first_name"), client.getString("last_name")].filter(Boolean).join(" ") : "",
    },
    plan: record.expandedOne("plan")?.getString("name") ?? "",
  };
}

export function dueReport(app: core.App, days: number) {
  const today = utcToLocal(new Date().toISOString()).date;
  const end = addDays(today, days + 1);
  // Also include future cycle charges to resolve the next-period flag.
  const payments = app.findRecordsByFilter("payments",
    "status = 'pending' && ((due_on != '' && due_on < {:end}) || membership != '')", "", 0, 0, { end })
    .filter((record): record is core.Record => !!record);
  const memberships = app.findRecordsByFilter("memberships",
    "status = 'active' && current_period_end < {:end}", "", 0, 0, { end })
    .filter((record): record is core.Record => !!record);
  expand(app, payments);
  expand(app, memberships);
  return buildDueReport(payments.map(record => ({
    ...related(record), id: record.id, status: record.getString("status"),
    membership: record.getString("membership"), period_index: record.getInt("period_index"),
    amount_cents: record.getInt("amount_cents"), due_on: record.getString("due_on").slice(0, 10),
  })), memberships.map(record => ({
    ...related(record), id: record.id, status: record.getString("status"),
    periods_paid: record.getInt("periods_paid"), current_period_end: record.getString("current_period_end").slice(0, 10),
  })), today, days);
}
