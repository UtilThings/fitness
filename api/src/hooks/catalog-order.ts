/// <reference path="../../pb_data/types.d.ts" />

routerAdd(
  "PATCH",
  "/api/catalog/{collection}/order",
  (e) => {
    const name = e.request.pathValue("collection");
    if (name !== "services" && name !== "plans") throw new NotFoundError();

    const actor = e.auth;
    const { updates } = e.requestInfo().body as {
      updates?: { id: string; sort: number; previous: number }[];
    };
    if (
      !Array.isArray(updates) ||
      updates.length === 0 ||
      updates.some(
        (item) =>
          !item ||
          typeof item.id !== "string" ||
          !item.id ||
          !Number.isSafeInteger(item.sort) ||
          item.sort < 0 ||
          !Number.isSafeInteger(item.previous) ||
          item.previous < 0,
      ) ||
      new Set(updates.map(({ id }) => id)).size !== updates.length ||
      new Set(updates.map(({ sort }) => sort)).size !== updates.length
    ) {
      throw new BadRequestError("El orden del catálogo no es válido.");
    }

    e.app.runInTransaction((txApp) => {
      const collection = txApp.findCollectionByNameOrId(name);
      const owner = actor && txApp.findRecordById("admins", actor.id);
      if (!owner?.getBool("active") || owner.getString("role") !== "owner") {
        throw new ForbiddenError("Solo el owner puede ordenar el catálogo.");
      }

      const changes = updates.map(({ id, previous, sort }) => {
        const [record] = txApp.findRecordsByFilter(
          collection,
          "id = {:id}",
          "",
          1,
          0,
          { id },
        );
        if (!record || record.getInt("sort") !== previous) {
          throw new ApiError(
            409,
            "El orden cambió. Vuelve a intentarlo con la lista actualizada.",
          );
        }
        return { record, sort };
      });
      if (
        name === "plans" &&
        new Set(changes.map(({ record }) => record.getString("service")))
          .size !== 1
      ) {
        throw new BadRequestError(
          "Ordena solo los planes de un mismo servicio.",
        );
      }

      for (const { record, sort } of changes) {
        record.set("sort", sort);
        record.set("@pbInternalAuditActor", owner.id);
        txApp.save(record);
      }
    });
    return e.noContent(204);
  },
  $apis.requireAuth("admins"),
);
