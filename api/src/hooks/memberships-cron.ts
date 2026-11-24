/// <reference path="../../pb_data/types.d.ts" />

cronAdd("memberships_daily", "0 9 * * *", () => {
  const { membershipToday, runDaily } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  const { forEachActiveBusiness } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  forEachActiveBusiness($app, "memberships_daily", (business) =>
    runDaily($app, business.id, membershipToday(business.getString("timezone"))));
});

routerAdd("POST", "/api/admin/memberships/run-daily", (e) => {
  const { membershipToday, requireMembershipRole, runDaily } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  const actor = requireMembershipRole(e, ["owner"]);
  const { getBusinessTimezone } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  const business = e.auth!.getString("business");
  return e.json(200, runDaily(e.app, business, membershipToday(getBusinessTimezone(e.app, business, e)), actor));
});
