/// <reference path="../../pb_data/types.d.ts" />

routerAdd("POST", "/api/admin/messages/preview", (e) => {
  const { previewMessage } = require(`${__hooks}/lib/message-admin`) as typeof import("../lib/message-admin");
  return previewMessage(e);
}, $apis.requireAuth("admins"));

routerAdd("POST", "/api/admin/messages/class/{sessionId}", (e) => {
  const { messageClass } = require(`${__hooks}/lib/message-admin`) as typeof import("../lib/message-admin");
  return messageClass(e);
}, $apis.requireAuth("admins"));

routerAdd("POST", "/api/admin/messages/test", (e) => {
  const { testMessage } = require(`${__hooks}/lib/message-admin`) as typeof import("../lib/message-admin");
  return testMessage(e);
}, $apis.requireAuth("admins"));
