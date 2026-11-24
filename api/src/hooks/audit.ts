/// <reference path="../../pb_data/types.d.ts" />

function captureAuditActor(e: core.RecordRequestEvent) {
  // Superusers bypass collection rules. Keep audit writes restricted to server code.
  if (e.record?.collection().name === "audit_logs") {
    throw new ForbiddenError("Audit logs can only be written by the server.");
  }

  // Model hooks have no auth. Keep the actor on the record across a delayed transaction callback.
  const actorId = e.auth?.collection().name === "admins" ? e.auth.id : "";
  e.record?.set("@pbInternalAuditActor", actorId);
  return e.next();
}

onRecordCreateRequest(captureAuditActor);
onRecordUpdateRequest(captureAuditActor);
onRecordDeleteRequest(captureAuditActor);

function writeAuditLog(e: core.RecordEvent) {
  const record = e.record;
  if (!record) {
    return e.next();
  }

  const collection = record.collection().name;
  const action = e.type;
  try {
    const { isAudited } = require(`${__hooks}/lib/audit-config`) as typeof import("../lib/audit-config");
    if (isAudited(collection) && (action === "create" || action === "update" || action === "delete")) {
      const { buildEntry } = require(`${__hooks}/lib/audit`) as typeof import("../lib/audit");
      const before = action === "update" ? record.original() : record;
      const snapshot = (row: core.Record) => {
        const fields = row.publicExport();
        for (const name of row.collection().fields.fieldNames()) {
          if (row.collection().fields.getByName(name)?.type() === "date") {
            fields[name] = row.getString(name);
          }
        }
        return fields;
      };
      const data = buildEntry({
        action,
        collection,
        recordId: record.id,
        actorId: record.getString("@pbInternalAuditActor"),
        credentialsChanged: collection === "admins" && action === "update"
          && record.getString("password:hash") !== before.getString("password:hash"),
        before: action === "create" ? undefined : snapshot(before),
        after: action === "delete" ? undefined : snapshot(record),
      });

      if (data) {
        // Pass JSON text to the PocketBase field so nested changes survive goja conversion.
        e.app.save(new Record(e.app.findCollectionByNameOrId("audit_logs"), {
          ...data, business: collection === "businesses" ? record.id : record.getString("business"),
          diff: JSON.stringify(data.diff),
        }));
      }
    }
  } catch (error) {
    e.app.logger().error("Failed to write audit log", "collection", collection, "record_id", record.id, "error", String(error));
  }
  return e.next();
}

onRecordAfterCreateSuccess(writeAuditLog);
onRecordAfterUpdateSuccess(writeAuditLog);
onRecordAfterDeleteSuccess(writeAuditLog);

routerUse((e) => {
  const request = e.request;
  const collection = request.pathValue("collection");
  if (request.method !== "GET" || !collection || e.hasSuperuserAuth()) return e.next();
  const recordsPath = `/api/collections/${collection}/records`;
  const path = request.url.path;
  if (path !== recordsPath && !path.startsWith(recordsPath + "/")) return e.next();
  const actor = e.auth;
  if (actor?.collection().name === "admins" && actor.getBool("active") && actor.getString("role") === "owner") {
    return e.next();
  }

  // The collection rules filter results. Return a 403 for the records API before that filtering.
  const audit = e.app.findCachedCollectionByNameOrId("audit_logs");
  if ([audit.name, audit.id].includes(collection.toLowerCase())) {
    throw new ForbiddenError("Solo el owner puede consultar la auditoría.");
  }
  return e.next();
});
