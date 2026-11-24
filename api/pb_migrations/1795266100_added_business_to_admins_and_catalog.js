/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const businesses = app.findCollectionByNameOrId("businesses");
  const business = app.findFirstRecordByData("businesses", "slug", "jq-fitness");
  const collections = ["admins", "services", "plans", "class_templates", "class_sessions", "schedule_blocks", "coach_availability"];
  const indexes = {
    "services": [
      "idx_services_slug",
      "slug",
      "business, slug",
      ""
    ]
  };
  for (const name of collections) {
    const collection = app.findCollectionByNameOrId(name);
    collection.fields.add(new RelationField({ name: "business", collectionId: businesses.id, maxSelect: 1, cascadeDelete: false }));
    app.save(collection);

    app.db().update(name, { business: business.id }, $dbx.hashExp({ business: "" })).execute();
    collection.fields.getByName("business").required = true;
    collection.addIndex(`idx_${name}_business`, false, "business", "");
    if (indexes[name]) {
      const [index, , columns, where] = indexes[name];
      collection.removeIndex(index);
      collection.addIndex(index, true, columns, where);
    }
    app.save(collection);
  }
}, (app) => {
  const collections = ["admins", "services", "plans", "class_templates", "class_sessions", "schedule_blocks", "coach_availability"];
  const indexes = {
    "services": [
      "idx_services_slug",
      "slug",
      "business, slug",
      ""
    ]
  };
  for (const name of collections) {
    const collection = app.findCollectionByNameOrId(name);
    collection.removeIndex(`idx_${name}_business`);
    if (indexes[name]) {
      const [index, oldColumns, , where] = indexes[name];
      collection.removeIndex(index);
      collection.addIndex(index, true, oldColumns, where);
    }
    collection.fields.removeByName("business");
    app.save(collection);
  }
});
