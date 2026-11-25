/// <reference path="../../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
  try {
    const { bookingMessage } =
      require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
    bookingMessage(e.app, e.record!, true);
  } catch {
    e.app.logger().error("Could not process the booking notice.");
  }
  return e.next();
}, "bookings");

onRecordAfterUpdateSuccess((e) => {
  try {
    const { bookingMessage } =
      require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
    bookingMessage(e.app, e.record!, false);
  } catch {
    e.app.logger().error("Could not process the updated booking notice.");
  }
  return e.next();
}, "bookings");

// Cancellation originates in the class_sessions status and is observed via the committed
// booking cascade. Schedule and booking hooks never need to call this feature.
onRecordAfterUpdateSuccess((e) => {
  try {
    const { classChangeMessages } =
      require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
    classChangeMessages(e.app, e.record!);
  } catch {
    e.app.logger().error("Could not process the class change notice.");
  }
  return e.next();
}, "class_sessions");

cronAdd("class_reminders", "*/15 * * * *", () => {
  const { sendReminders } = require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
  const { forEachActiveBusiness } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  forEachActiveBusiness($app, "class_reminders", (business) => sendReminders($app, business.id));
});

cronAdd("payment_due_notices", "0 * * * *", () => {
  const { sendDatedNotices } = require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
  const { forEachActiveBusiness } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  forEachActiveBusiness($app, "payment_due_notices", (business) =>
    sendDatedNotices($app, "payment_due", business.id, business.getString("timezone")));
});

cronAdd("renewal_notices", "0 * * * *", () => {
  const { sendDatedNotices } = require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
  const { forEachActiveBusiness } = require(`${__hooks}/lib/tenant`) as typeof import("../lib/tenant");
  forEachActiveBusiness($app, "renewal_notices", (business) =>
    sendDatedNotices($app, "membership_renewal", business.id, business.getString("timezone")));
});
