/// <reference path="../../pb_data/types.d.ts" />

// PocketBase 0.40.5 replaces the inherited handler with the same middleware ID.
const publicCors = new Middleware((e) => e.next(), -1041, "pbCors");

routerAdd("GET", "/api/public/catalog", (e) => {
  const { servePublicCatalog } = require(`${__hooks}/lib/public-store`) as typeof import("../lib/public-store");
  return servePublicCatalog(e);
}, publicCors);

routerAdd("GET", "/api/public/schedule", (e) => {
  const { servePublicSchedule } = require(`${__hooks}/lib/public-store`) as typeof import("../lib/public-store");
  return servePublicSchedule(e);
}, publicCors);

for (const path of ["/api/public/catalog", "/api/public/schedule"]) {
  routerAdd("OPTIONS", path, (e) => {
    const { publicPreflight } = require(`${__hooks}/lib/public-store`) as typeof import("../lib/public-store");
    return publicPreflight(e);
  }, publicCors);
}
