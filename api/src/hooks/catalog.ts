/// <reference path="../../pb_data/types.d.ts" />

function checkCatalogPrice(e: core.RecordRequestEvent) {
  const body = e.requestInfo().body;
  const provided = Object.prototype.hasOwnProperty.call(body, "price_cents");
  if (
    e.record?.collection().name === "plans" &&
    (provided || e.record.isNew())
  ) {
    const price: unknown = body.price_cents;
    if (
      !(
        typeof price === "number" ||
        (typeof price === "string" && /^\d+$/.test(price))
      ) ||
      !Number.isSafeInteger(Number(price)) ||
      Number(price) < 0
    ) {
      throw new BadRequestError("Revisa los datos del plan.", {
        price_cents: new ValidationError(
          "validation_catalog",
          "Indica un precio en centavos enteros no negativos.",
        ),
      });
    }
  }
  return e.next();
}

onRecordCreateRequest(checkCatalogPrice, "plans");
onRecordUpdateRequest(checkCatalogPrice, "plans");

onRecordCreateRequest(
  (e) => {
    if (!Object.prototype.hasOwnProperty.call(e.requestInfo().body, "active")) {
      e.record?.set("active", true);
    }
    return e.next();
  },
  "services",
  "plans",
);

function saveCatalogInTransaction(e: core.RecordEvent) {
  // Keep validation, the write, and the service cascade on a single SQLite writer.
  const app = e.app;
  try {
    return app.runInTransaction((txApp) => {
      e.app = txApp;
      const record = e.record!;
      record.set("@pbInternalCatalogDeactivatedPlans", null);
      const deactivate =
        record.collection().name === "services" &&
        !record.isNew() &&
        !record.getBool("active") &&
        txApp.findRecordById("services", record.id).getBool("active");
      e.next();
      if (!deactivate) return;

      const plans = txApp.findRecordsByFilter(
        "plans",
        "service = {:service} && active = true",
        "",
        0,
        0,
        { service: record.id },
      );
      for (const plan of plans) {
        if (!plan) continue;
        plan.set("active", false);
        plan.set(
          "@pbInternalAuditActor",
          record.getString("@pbInternalAuditActor"),
        );
        txApp.save(plan);
      }
      record.set("@pbInternalCatalogDeactivatedPlans", plans.length);
    });
  } finally {
    e.app = app;
  }
}

onRecordCreate(saveCatalogInTransaction, "plans");
onRecordUpdate(saveCatalogInTransaction, "services", "plans");

onRecordValidate(
  (e) => {
    const {
      validateService,
      validatePlan,
      canActivatePlan,
      findFirstClassConflict,
    } = require(`${__hooks}/lib/catalog`) as typeof import("../lib/catalog");
    const record = e.record!;
    const fields = record.publicExport();
    const errors =
      record.collection().name === "services"
        ? validateService(
            fields as unknown as import("../lib/catalog").ServiceInput,
          )
        : validatePlan(fields as unknown as import("../lib/catalog").PlanInput);

    if (record.collection().name === "plans") {
      const serviceId = record.getString("service");
      const [service] = e.app.findRecordsByFilter(
        "services",
        "id = {:id}",
        "",
        1,
        0,
        { id: serviceId },
      );
      if (!service) errors.service = "Selecciona un servicio válido.";
      else if (
        record.getBool("active") &&
        !canActivatePlan(service.getBool("active"))
      ) {
        errors.active = "El servicio está inactivo.";
      }

      if (record.getBool("is_first_class")) {
        const business = record.getString("business");
        const conflicts = e.app.findRecordsByFilter(
          "plans",
          "is_first_class = true && id != {:id}" + (business ? " && business = {:business}" : ""),
          "",
          1,
          0,
          { id: record.id, business },
        );
        if (
          findFirstClassConflict(
            conflicts.flatMap((plan) =>
              plan ? [{ id: plan.id, is_first_class: true }] : [],
            ),
            record.id,
          )
        ) {
          errors.is_first_class = "Ya existe un plan de primera clase.";
        }
      }
    }

    if (Object.keys(errors).length) {
      const fields = Object.fromEntries(
        Object.entries(errors).map(([field, message]) => [
          field,
          new ValidationError("validation_catalog", message),
        ]),
      );
      throw new BadRequestError("Revisa los datos del catálogo.", fields);
    }
    return e.next();
  },
  "services",
  "plans",
);

onRecordAfterUpdateSuccess((e) => {
  const record = e.record!;
  const count = record.get("@pbInternalCatalogDeactivatedPlans");
  if (typeof count === "number") {
    const { buildEntry } = require(
      `${__hooks}/lib/audit`,
    ) as typeof import("../lib/audit");
    const data = buildEntry({
      action: "custom",
      collection: "services",
      recordId: record.id,
      actorId: record.getString("@pbInternalAuditActor"),
      before: { active: true },
      after: { active: false, planes_desactivados: count },
    });
    if (data) {
      try {
        e.app.save(
          new Record(e.app.findCollectionByNameOrId("audit_logs"), {
            ...data,
            business: record.getString("business"),
            summary: `Planes desactivados al desactivar ${record.getString("name")}: ${count}`,
          }),
        );
      } catch (error) {
        e.app
          .logger()
          .error(
            "Failed to audit catalog deactivation",
            "record_id",
            record.id,
            "error",
            String(error),
          );
      }
    }
  }
  return e.next();
}, "services");

onRecordDeleteRequest(
  (e) => {
    const { CATALOG_DEPENDENTS, dependentsBlockMessage } = require(
      `${__hooks}/lib/catalog`,
    ) as typeof import("../lib/catalog");
    const app = e.app;
    try {
      return app.runInTransaction((txApp) => {
        e.app = txApp;
        const record = e.record!;
        const kind =
          record.collection().name === "services" ? "service" : "plan";
        const collections = txApp.findAllCollections();
        const counts: Record<string, number> = {};
        for (const { collection, field } of CATALOG_DEPENDENTS[kind]) {
          if (collections.some((item) => item?.name === collection)) {
            counts[collection] = txApp.countRecords(
              collection,
              $dbx.hashExp({ [field]: record.id }),
            );
          }
        }
        const message = dependentsBlockMessage(kind, counts);
        if (message) throw new BadRequestError(message);
        return e.next();
      });
    } finally {
      e.app = app;
    }
  },
  "services",
  "plans",
);
