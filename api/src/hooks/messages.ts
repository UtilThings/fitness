/// <reference path="../../pb_data/types.d.ts" />

function validateMessageTemplate(e: core.RecordRequestEvent) {
  const { validateTemplate } =
    require(`${__hooks}/lib/message-render`) as typeof import("../lib/message-render");
  const record = e.record!;
  if (record.isNew() && !Object.prototype.hasOwnProperty.call(e.requestInfo().body, "active")) {
    record.set("active", true);
  }
  const key = record.getString("key");
  if (key === "manual") throw new BadRequestError("The template key is invalid.");
  const problems = validateTemplate({ key, subject: record.getString("subject"), body: record.getString("body") });
  if (problems.length) {
    const messages: Record<string, string> = {};
    for (const { field, message } of problems) {
      messages[field] ??= message;
    }
    const fields = Object.fromEntries(Object.entries(messages).map(([field, message]) => [
      field, new ValidationError("invalid_template", message),
    ]));
    throw new BadRequestError("The template is invalid.", fields);
  }
  return e.next();
}

onRecordCreateRequest(validateMessageTemplate, "message_templates");
onRecordUpdateRequest(validateMessageTemplate, "message_templates");

cronAdd("retry_failed_messages", "*/10 * * * *", () => {
  const { retryFailedMessages } = require(`${__hooks}/lib/message-send`) as typeof import("../lib/message-send");
  const { forEachActiveBusiness } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  forEachActiveBusiness($app, "retry_failed_messages", (business) => retryFailedMessages($app, business.id));
});

function blockMessageLogWrites() {
  throw new ForbiddenError("The server records message history.");
}

onRecordCreateRequest(blockMessageLogWrites, "message_logs");
onRecordUpdateRequest(blockMessageLogWrites, "message_logs");
onRecordDeleteRequest(blockMessageLogWrites, "message_logs");
