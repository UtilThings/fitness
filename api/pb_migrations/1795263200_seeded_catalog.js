/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const { CATALOG_SEED } = require(`${__hooks}/lib/catalog`);
  const services = app.findCollectionByNameOrId("services");
  const plans = app.findCollectionByNameOrId("plans");

  for (const [serviceIndex, { plans: seedPlans, ...fields }] of CATALOG_SEED.entries()) {
    const id = "cat008service" + String(serviceIndex).padStart(2, "0");
    let [service] = app.findRecordsByFilter(services, "slug = {:slug} || id = {:id}", "", 1, 0, { id, slug: fields.slug });
    if (!service) {
      service = new Record(services, { ...fields, id });
      app.save(service);
    }

    for (const [planIndex, seedPlan] of seedPlans.entries()) {
      const id = "cat008plan" + String(serviceIndex).padStart(2, "0") + String(planIndex).padStart(3, "0");
      const key = { id, service: service.id, name: seedPlan.name };
      const [existing] = app.findRecordsByFilter(plans, "(service = {:service} && name = {:name}) || id = {:id}", "", 1, 0, key);
      if (existing || (seedPlan.is_first_class && app.countRecords(plans, $dbx.hashExp({ is_first_class: true })))) {
        continue;
      }
      app.save(new Record(plans, {
        ...seedPlan,
        id,
        service: service.id,
        active: seedPlan.active && service.getBool("active"),
      }));
    }
  }
}, (app) => {
  const { CATALOG_SEED } = require(`${__hooks}/lib/catalog`);
  const collections = app.findAllCollections();

  function deleteIfUnreferenced(record) {
    const collectionId = record.collection().id;
    for (const collection of collections) {
      for (const field of collection.fields) {
        if (field.type() === "relation" && field.collectionId === collectionId &&
            app.findRecordsByFilter(collection, field.name + " ?= {:id}", "", 1, 0, { id: record.id }).length) {
          return;
        }
      }
    }
    app.delete(record);
  }

  const serviceIds = CATALOG_SEED.map((_, index) => "cat008service" + String(index).padStart(2, "0"));
  const planIds = CATALOG_SEED.flatMap(({ plans }, serviceIndex) => plans.map((_, planIndex) =>
    "cat008plan" + String(serviceIndex).padStart(2, "0") + String(planIndex).padStart(3, "0")
  ));

  for (const [collection, ids] of [["plans", planIds], ["services", serviceIds]]) {
    for (const id of ids) {
      const [record] = app.findRecordsByFilter(collection, "id = {:id}", "", 1, 0, { id });
      if (record) deleteIfUnreferenced(record);
    }
  }
});
