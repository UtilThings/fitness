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
      const data = buildEntry({
        action,
        collection,
        recordId: record.id,
        actorId: record.getString("@pbInternalAuditActor"),
        credentialsChanged: collection === "admins" && action === "update"
          && record.getString("password:hash") !== before.getString("password:hash"),
        before: action === "create" ? undefined : before.publicExport(),
        after: action === "delete" ? undefined : record.publicExport(),
      });

      if (data) {
        e.app.save(new Record(e.app.findCollectionByNameOrId("audit_logs"), data));
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
