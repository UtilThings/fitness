/// <reference path="../../pb_data/types.d.ts" />

onRecordAfterCreateSuccess(e => {
  e.next();
  const { ensurePendingCharge } =
    require(`${__hooks}/lib/payments-service`) as typeof import("../lib/payments-service");
  ensurePendingCharge(e.app, e.record!);
}, "memberships");

onRecordAfterUpdateSuccess(e => {
  e.next();
  const { ensurePendingCharge } =
    require(`${__hooks}/lib/payments-service`) as typeof import("../lib/payments-service");
  ensurePendingCharge(e.app, e.record!);
}, "memberships");

routerAdd("GET", "/api/admin/payments/due", e => {
  const { requirePaymentRole } =
    require(`${__hooks}/lib/payments-service`) as typeof import("../lib/payments-service");
  const { dueReport } = require(`${__hooks}/lib/payments-store`) as typeof import("../lib/payments-store");
  requirePaymentRole(e);
  const query = e.request.url.query();
  const readInt = (key: string, fallback: number, max: number) => {
    const value = query.has(key) ? query.get(key) : String(fallback);
    if (!/^[1-9]\d*$/.test(value) || Number(value) > max) {
      throw new BadRequestError(`${key} debe ser un entero entre 1 y ${max}.`);
    }
    return Number(value);
  };
  const days = readInt("days", 7, 60);
  const limit = readInt("limit", 50, 500);
  const report = dueReport(e.app, days, e.auth!.getString("business"));
  return e.json(200, {
    ...report,
    overdue: report.overdue.slice(0, limit),
    upcoming: report.upcoming.slice(0, limit),
    renewals: report.renewals.slice(0, limit),
  });
});
