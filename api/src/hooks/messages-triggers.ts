/// <reference path="../../pb_data/types.d.ts" />

onRecordAfterCreateSuccess((e) => {
  try {
    const { bookingMessage } =
      require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
    bookingMessage(e.app, e.record!, true);
  } catch {
    e.app.logger().error("No se pudo procesar el aviso de reserva.");
  }
  return e.next();
}, "bookings");

onRecordAfterUpdateSuccess((e) => {
  try {
    const { bookingMessage } =
      require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
    bookingMessage(e.app, e.record!, false);
  } catch {
    e.app.logger().error("No se pudo procesar el aviso de la reserva actualizada.");
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
    e.app.logger().error("No se pudo procesar el aviso de cambio de clase.");
  }
  return e.next();
}, "class_sessions");

cronAdd("class_reminders", "*/15 * * * *", () => {
  try {
    const { sendReminders } =
      require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
    sendReminders($app);
  } catch {
    $app.logger().error("No se pudieron consultar los recordatorios de clase.");
  }
});

cronAdd("payment_due_notices", "0 * * * *", () => {
  try {
    const { sendDatedNotices } =
      require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
    sendDatedNotices($app, "payment_due");
  } catch {
    $app.logger().error("No se pudieron consultar los avisos de cobro.");
  }
});

cronAdd("renewal_notices", "0 * * * *", () => {
  try {
    const { sendDatedNotices } =
      require(`${__hooks}/lib/message-triggers`) as typeof import("../lib/message-triggers");
    sendDatedNotices($app, "membership_renewal");
  } catch {
    $app.logger().error("No se pudieron consultar los avisos de renovación.");
  }
});
