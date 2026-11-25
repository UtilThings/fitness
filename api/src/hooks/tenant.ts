/// <reference path="../../pb_data/types.d.ts" />

const { TENANT_COLLECTIONS } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
// These request handlers validate tenant references themselves or reject HTTP writes.
const tenantRequestCollections = TENANT_COLLECTIONS.filter((name) => ![
  "bookings", "coaching_programs", "coaching_checkins", "audit_logs", "payments", "receipt_sequences", "message_logs",
].includes(name));

onRecordCreateRequest((e) => {
  const { prepareTenantCreate } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  prepareTenantCreate(e);
  return e.next();
}, ...tenantRequestCollections);

onRecordUpdateRequest((e) => {
  const { prepareTenantUpdate } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  prepareTenantUpdate(e);
  return e.next();
}, ...tenantRequestCollections);

onRecordValidate((e) => {
  const { assertSameBusiness, validateTenantReferences } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  const record = e.record!;
  if (!record.collection().fields.getByName("business")) return e.next();
  const stored = record.isNew() ? undefined : e.app.findRecordById(record.collection(), record.id);
  if (stored && !assertSameBusiness(record, stored)) {
    throw new BadRequestError("A record cannot be moved to another business.");
  }
  validateTenantReferences(e.app, record);
  return e.next();
}, ...TENANT_COLLECTIONS);

onRecordAuthRequest((e) => {
  const { getBusiness, resolveBusiness } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  if (e.record!.collection().fields.getByName("business") && !getBusiness(e.app, resolveBusiness(e.record))?.getBool("active")) {
    throw new ForbiddenError("The business or account is inactive.");
  }
  return e.next();
}, "admins");

routerUse((e) => {
  if (e.auth?.collection().name === "admins" && e.auth.collection().fields.getByName("business")) {
    const { getBusiness, resolveBusiness } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
    if (!getBusiness(e.app, resolveBusiness(e.auth))?.getBool("active")) {
      throw new ForbiddenError("The business or account is inactive.");
    }
  }
  return e.next();
});
