/// <reference path="../../pb_data/types.d.ts" />

routerAdd("POST", "/api/admin/payments", e => {
  const { createPayment, requirePaymentRole } =
    require(`${__hooks}/lib/payments-service`) as typeof import("../lib/payments-service");
  return e.json(200, createPayment(e.app, e.requestInfo().body, requirePaymentRole(e), e.auth!.getString("business")));
});

routerAdd("POST", "/api/admin/payments/{id}/pay", e => {
  const { settlePayment, requirePaymentRole } =
    require(`${__hooks}/lib/payments-service`) as typeof import("../lib/payments-service");
  const recordedBy = requirePaymentRole(e);
  const { method, paid_at, note } = e.requestInfo().body;
  return e.json(200, settlePayment(e.app, e.request.pathValue("id"), { method, paidAt: paid_at, recordedBy, note, business: e.auth!.getString("business") }));
});

routerAdd("POST", "/api/admin/payments/{id}/void", e => {
  const { voidPayment, requirePaymentRole } =
    require(`${__hooks}/lib/payments-service`) as typeof import("../lib/payments-service");
  const by = requirePaymentRole(e);
  return e.json(200, voidPayment(e.app, e.request.pathValue("id"), { reason: e.requestInfo().body.reason, by, business: e.auth!.getString("business") }));
});

onRecordDelete(() => {
  throw new ForbiddenError("Los pagos se conservan en el historial.");
}, "payments");

function blockPaymentRecordWrite() {
  throw new ForbiddenError("Gestiona los pagos mediante las rutas de cobros.");
}

// PocketBase superusers bypass collection rules, so also protect direct HTTP writes.
onRecordCreateRequest(blockPaymentRecordWrite, "payments", "receipt_sequences");
onRecordUpdateRequest(blockPaymentRecordWrite, "payments", "receipt_sequences");
onRecordDeleteRequest(blockPaymentRecordWrite, "payments", "receipt_sequences");
