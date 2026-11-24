/// <reference path="../../pb_data/types.d.ts" />

const { TENANT_COLLECTIONS } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
// Booking request handlers carry out their own write and return before calling the next hook.
const tenantRequestCollections = TENANT_COLLECTIONS.filter((name) => name !== "bookings");

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
    throw new BadRequestError("No se puede cambiar el negocio de un registro.");
  }
  validateTenantReferences(e.app, record);
  return e.next();
}, ...TENANT_COLLECTIONS);

onRecordAuthRequest((e) => {
  const { getBusiness, resolveBusiness } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  if (e.record!.collection().fields.getByName("business") && !getBusiness(e.app, resolveBusiness(e.record))?.getBool("active")) {
    throw new ForbiddenError("El negocio o la cuenta están inactivos.");
  }
  return e.next();
}, "admins");

routerUse((e) => {
  if (e.auth?.collection().name === "admins" && e.auth.collection().fields.getByName("business")) {
    const { getBusiness, resolveBusiness } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
    if (!getBusiness(e.app, resolveBusiness(e.auth))?.getBool("active")) {
      throw new ForbiddenError("El negocio o la cuenta están inactivos.");
    }
  }
  return e.next();
});
