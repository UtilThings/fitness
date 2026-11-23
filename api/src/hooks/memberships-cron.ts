/// <reference path="../../pb_data/types.d.ts" />

cronAdd("memberships_daily", "0 9 * * *", () => {
  const { membershipToday, runDaily } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  runDaily($app, membershipToday());
});

routerAdd("POST", "/api/admin/memberships/run-daily", (e) => {
  const { membershipToday, requireMembershipRole, runDaily } =
    require(`${__hooks}/lib/memberships-service`) as typeof import("../lib/memberships-service");
  const actor = requireMembershipRole(e, ["owner"]);
  return e.json(200, runDaily(e.app, membershipToday(), actor));
});
