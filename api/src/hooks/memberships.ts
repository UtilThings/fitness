/// <reference path="../../pb_data/types.d.ts" />

routerAdd("POST", "/api/admin/memberships/assign", (e) => {
  const { assign, membershipToday, requireMembershipRole } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  const { getBusinessTimezone } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  const actor = requireMembershipRole(e, ["owner", "reception"]);
  const business = e.auth!.getString("business");
  return e.json(200, assign(e.app, e.requestInfo().body, { business, actor, today: membershipToday(getBusinessTimezone(e.app, business, e)) }));
});

routerAdd("POST", "/api/admin/memberships/{id}/{action}", (e) => {
  const { manageMembership, membershipToday, requireMembershipRole } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  const { getBusinessTimezone } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  const actor = requireMembershipRole(e, ["owner", "reception"]);
  const business = e.auth!.getString("business");
  const action = e.request!.pathValue("action");
  if (action !== "renew" && action !== "pause" && action !== "resume" && action !== "cancel" && action !== "adjust") {
    throw new NotFoundError("Membership action not found.");
  }
  return e.json(200, manageMembership(e.app, e.request!.pathValue("id"), action, e.requestInfo().body,
    { business, actor, today: membershipToday(getBusinessTimezone(e.app, business, e)) }));
});

onRecordValidate((e) => {
  const movement = e.record!;
  if (movement.getString("reason") === "adjust" && !movement.getString("note").trim()) {
    throw new BadRequestError("Enter a reason for the adjustment.");
  }
  return e.next();
}, "credit_movements");

onRecordUpdate(() => {
  throw new ForbiddenError("Correct transactions through adjustments.");
}, "credit_movements");

onRecordDelete(() => {
  throw new ForbiddenError("Transactions are part of the credit history.");
}, "credit_movements");
