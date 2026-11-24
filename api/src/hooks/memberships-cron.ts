/// <reference path="../../pb_data/types.d.ts" />

cronAdd("memberships_daily", "0 9 * * *", () => {
  const { membershipToday, runDaily } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  const { activeBusinesses } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  for (const business of activeBusinesses($app)) runDaily($app, business.id, membershipToday());
});

routerAdd("POST", "/api/admin/memberships/run-daily", (e) => {
  const { membershipToday, requireMembershipRole, runDaily } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  const actor = requireMembershipRole(e, ["owner"]);
  return e.json(200, runDaily(e.app, e.auth!.getString("business"), membershipToday(), actor));
});
