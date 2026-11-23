/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const bookings = app.findCollectionByNameOrId("bookings");
  bookings.fields.add(new RelationField({
    name: "membership", collectionId: app.findCollectionByNameOrId("memberships").id, maxSelect: 1,
  }));
  return app.save(bookings);
}, (app) => {
  const bookings = app.findCollectionByNameOrId("bookings");
  bookings.fields.removeByName("membership");
  return app.save(bookings);
});
