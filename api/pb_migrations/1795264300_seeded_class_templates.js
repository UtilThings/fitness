/// <reference path="../pb_data/types.d.ts" />

function scheduleSeed() {
  return [
    ["tropical-jump", 1, "19:30", 12],
    ["tropical-jump", 3, "19:30", 12],
    ["tropical-jump", 6, "09:00", 12],
    ["group-strength", 2, "09:00", 6],
    ["group-strength", 2, "17:30", 6],
    ["group-strength", 2, "19:00", 6],
    ["group-strength", 4, "09:00", 6],
    ["group-strength", 4, "17:30", 6],
    ["group-strength", 4, "19:00", 6],
  ].map(([slug, weekday, start_time, capacity], index) => ({
    id: "jqclasstplseed" + (index + 1),
    slug, weekday, start_time, capacity,
  }));
}

migrate((app) => {
  const collection = app.findCollectionByNameOrId("class_templates");
  const services = {};
  for (const { slug } of scheduleSeed()) {
    if (services[slug]) continue;
    const [service] = app.findRecordsByFilter("services", "slug = {:slug}", "", 1, 0, { slug });
    if (!service) throw new Error("El servicio " + slug + " no existe: aplica antes el catálogo.");
    services[slug] = service.id;
  }

  for (const { slug, ...values } of scheduleSeed()) {
    const service = services[slug];
    const existing = app.findRecordsByFilter("class_templates",
      "id = {:id} || (service = {:service} && weekday = {:weekday} && start_time = {:start_time})",
      "", 1, 0, { ...values, service });
    if (!existing.length) {
      app.save(new Record(collection, { ...values, service, duration_min: 60, active: true }));
    }
  }
}, (app) => {
  // Stable IDs limit rollback to rows owned by this seed, even after edits.
  for (const { id } of scheduleSeed()) {
    const [template] = app.findRecordsByFilter("class_templates", "id = {:id}", "", 1, 0, { id });
    if (!template) continue;
    const sessions = app.findRecordsByFilter("class_sessions", "template = {:id}", "", 1, 0, { id });
    if (!sessions.length) app.delete(template);
  }
});
