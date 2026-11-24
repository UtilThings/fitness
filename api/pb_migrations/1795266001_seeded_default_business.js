/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const existing = app.findRecordsByFilter("businesses", "slug = 'jq-fitness'", "", 1, 0);
  if (existing.length > 0) return;
  const origins = ($os.getenv("PUBLIC_SITE_ORIGINS") || "").split(",").map((value) => value.trim()).filter(Boolean);
  return app.save(new Record(app.findCollectionByNameOrId("businesses"), {
    name: $os.getenv("STUDIO_NAME") || "JQ Fitness",
    slug: "jq-fitness",
    city: "Miramar, FL",
    phone: $os.getenv("STUDIO_PHONE") || "",
    timezone: "America/New_York",
    currency: "USD",
    receipt_prefix: "JQ",
    active: true,
    allowed_origins: JSON.stringify(Array.from(new Set(origins))),
  }));
}, (app) => {
  for (const record of app.findRecordsByFilter("businesses", "slug = 'jq-fitness'", "", 1, 0)) {
    app.delete(record);
  }
});
