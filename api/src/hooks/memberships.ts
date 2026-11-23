/// <reference path="../../pb_data/types.d.ts" />

routerAdd("POST", "/api/admin/memberships/assign", (e) => {
  const { assign, membershipToday, requireMembershipRole } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  const actor = requireMembershipRole(e, ["owner", "reception"]);
  return e.json(200, assign(e.app, e.requestInfo().body, { actor, today: membershipToday() }));
});

routerAdd("POST", "/api/admin/memberships/{id}/{action}", (e) => {
  const { manageMembership, membershipToday, requireMembershipRole } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  const actor = requireMembershipRole(e, ["owner", "reception"]);
  const action = e.request!.pathValue("action");
  if (action !== "renew" && action !== "pause" && action !== "resume" && action !== "cancel" && action !== "adjust") {
    throw new NotFoundError("Acción de membresía no encontrada.");
  }
  return e.json(200, manageMembership(e.app, e.request!.pathValue("id"), action, e.requestInfo().body,
    { actor, today: membershipToday() }));
});

onRecordValidate((e) => {
  const movement = e.record!;
  if (movement.getString("reason") === "adjust" && !movement.getString("note").trim()) {
    throw new BadRequestError("Indica el motivo del ajuste.");
  }
  return e.next();
}, "credit_movements");

onRecordUpdate(() => {
  throw new ForbiddenError("Los movimientos se corrigen mediante ajustes.");
}, "credit_movements");

onRecordDelete(() => {
  throw new ForbiddenError("Los movimientos forman parte del historial de créditos.");
}, "credit_movements");
