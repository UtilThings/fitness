/// <reference path="../../pb_data/types.d.ts" />

routerAdd("POST", "/api/admin/payments", e => {
  const { createPayment, requirePaymentRole } =
    require(`${__hooks}/lib/payments-service`) as typeof import("../lib/payments-service");
  return e.json(200, createPayment(e.app, e.requestInfo().body, requirePaymentRole(e)));
});

routerAdd("POST", "/api/admin/payments/{id}/pay", e => {
  const { settlePayment, requirePaymentRole } =
    require(`${__hooks}/lib/payments-service`) as typeof import("../lib/payments-service");
  const recordedBy = requirePaymentRole(e);
  const { method, paid_at, note } = e.requestInfo().body;
  return e.json(200, settlePayment(e.app, e.request.pathValue("id"), { method, paidAt: paid_at, recordedBy, note }));
});

routerAdd("POST", "/api/admin/payments/{id}/void", e => {
  const { voidPayment, requirePaymentRole } =
    require(`${__hooks}/lib/payments-service`) as typeof import("../lib/payments-service");
  const by = requirePaymentRole(e);
  return e.json(200, voidPayment(e.app, e.request.pathValue("id"), { reason: e.requestInfo().body.reason, by }));
});

onRecordDelete(() => {
  throw new ForbiddenError("Los pagos se conservan en el historial.");
}, "payments");
