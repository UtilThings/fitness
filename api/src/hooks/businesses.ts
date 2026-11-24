/// <reference path="../../pb_data/types.d.ts" />

function validateBusinessRequest(e: core.RecordRequestEvent) {
  const { BUSINESS_OWNER_FIELDS, isSupportedTimezone, validateOrigins } =
    require(`${__hooks}/lib/business`) as typeof import("../lib/business");
  if (!e.hasSuperuserAuth()) {
    const body = e.requestInfo().body;
    if (Object.keys(body).some((key) => !BUSINESS_OWNER_FIELDS.includes(key === "logo-" ? "logo" : key))) {
      throw new BadRequestError("Solo puedes editar los datos de marca, contacto y orígenes.");
    }
  }
  const record = e.record!;
  if (!isSupportedTimezone(record.getString("timezone"))) {
    throw new BadRequestError("Zona horaria no admitida.");
  }
  const origins = record.getString("allowed_origins");
  const error = validateOrigins(origins ? JSON.parse(origins) : null);
  if (error) throw new BadRequestError(error);
  return e.next();
}

onRecordCreateRequest(validateBusinessRequest, "businesses");
onRecordUpdateRequest(validateBusinessRequest, "businesses");

onRecordEnrich((e) => {
  e.next();
  e.record?.hide("public_key_hash");
}, "businesses");

onRecordCreate((e) => {
  const templates = e.app.findAllCollections().find((collection) => collection?.name === "message_templates");
  if (!templates?.fields.getByName("business")) return e.next();

  const { seedBusinessDefaults } = require(`${__hooks}/lib/business-defaults`) as typeof import("../lib/business-defaults");
  const app = e.app;
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      e.next();
      seedBusinessDefaults(tx, e.record!.id);
    });
  } finally {
    e.app = app;
  }
}, "businesses");
