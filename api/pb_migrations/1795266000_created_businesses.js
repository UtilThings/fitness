/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const staff = '@request.auth.collectionName = "admins" && @request.auth.active = true';
  const own = '@request.auth.business = id';
  const owner = staff + ' && @request.auth.role = "owner"';
  return app.save(new Collection({
    type: "base",
    name: "businesses",
    listRule: `(${staff}) && ${own}`,
    viewRule: `(${staff}) && ${own}`,
    createRule: null,
    updateRule: `(${owner}) && ${own}`,
    deleteRule: null,
    fields: [
      { name: "name", type: "text", required: true, max: 80 },
      { name: "slug", type: "text", required: true, pattern: "^[a-z0-9]+(-[a-z0-9]+)*$" },
      { name: "logo", type: "file", maxSelect: 1, maxSize: 2_097_152, protected: false,
        mimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif", "image/svg+xml"] },
      { name: "city", type: "text", max: 80 },
      { name: "phone", type: "text" },
      { name: "email", type: "text" },
      { name: "currency", type: "select", required: true, maxSelect: 1, values: ["USD", "EUR", "MXN", "COP", "CRC", "GBP"] },
      { name: "timezone", type: "text", required: true },
      { name: "receipt_prefix", type: "text", required: true, pattern: "^[A-Z0-9]{2,6}$" },
      { name: "active", type: "bool" },
      { name: "public_key_prefix", type: "text", pattern: "^[A-Za-z0-9]{8}$" },
      { name: "public_key_hash", type: "text", hidden: true },
      { name: "public_key_rotated_at", type: "date" },
      { name: "allowed_origins", type: "json", maxSize: 4096 },
      { name: "created", type: "autodate", onCreate: true },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    indexes: [
      "CREATE UNIQUE INDEX idx_businesses_slug ON businesses (slug)",
      "CREATE UNIQUE INDEX idx_businesses_public_key_prefix ON businesses (public_key_prefix) WHERE public_key_prefix != ''",
    ],
  }));
}, (app) => app.delete(app.findCollectionByNameOrId("businesses")));
