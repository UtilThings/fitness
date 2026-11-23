/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const collection = app.findCollectionByNameOrId("class_sessions");
  collection.fields.add(new TextField({ name: "title", max: 120 }));
  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("class_sessions");
  collection.fields.removeByName("title");
  return app.save(collection);
});
