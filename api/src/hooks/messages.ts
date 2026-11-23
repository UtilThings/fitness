/// <reference path="../../pb_data/types.d.ts" />

onRecordCreateRequest((e) => {
  if (!Object.prototype.hasOwnProperty.call(e.requestInfo().body, "active")) {
    e.record!.set("active", true);
  }
  return e.next();
}, "message_templates");
