/// <reference path="../../pb_data/types.d.ts" />

routerAdd("GET", "/api/admin/reports/occupancy", (e) => {
  const { serveReport } = require(`${__hooks}/lib/reports-store`) as typeof import("../lib/reports-store");
  return serveReport(e, "occupancy");
}, $apis.requireAuth("admins"));

routerAdd("GET", "/api/admin/reports/attendance", (e) => {
  const { serveReport } = require(`${__hooks}/lib/reports-store`) as typeof import("../lib/reports-store");
  return serveReport(e, "attendance");
}, $apis.requireAuth("admins"));

routerAdd("GET", "/api/admin/reports/revenue", (e) => {
  const { serveReport } = require(`${__hooks}/lib/reports-store`) as typeof import("../lib/reports-store");
  return serveReport(e, "revenue");
}, $apis.requireAuth("admins"));

routerAdd("GET", "/api/admin/reports/retention", (e) => {
  const { serveReport } = require(`${__hooks}/lib/reports-store`) as typeof import("../lib/reports-store");
  return serveReport(e, "retention");
}, $apis.requireAuth("admins"));
