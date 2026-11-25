/// <reference path="../../pb_data/types.d.ts" />

// Run the cascade before commit. After-update-success observes the complete change,
// including cancellations initiated by the schedule-block model hook.
onRecordUpdate((e) => {
  const { bookingData, bookingError, saveCancellation, sessionBookings, SESSION_CANCELLED_NOTE } =
    require(`${__hooks}/lib/booking-store`) as typeof import("../lib/booking-store");
  const { occupiedSeats } =
    require(`${__hooks}/lib/booking-rules`) as typeof import("../lib/booking-rules");
  const next = e.record!;
  const app = e.app;
  try {
    return app.runInTransaction((tx) => {
      e.app = tx;
      const current = tx.findRecordById("class_sessions", next.id);
      const cancelling = next.getString("status") === "cancelled" && current.getString("status") !== "cancelled";
      const reducing = next.getInt("capacity") < current.getInt("capacity");
      const bookings = cancelling || reducing ? sessionBookings(tx, next.id) : [];
      if (reducing && !cancelling && occupiedSeats(bookings.map(bookingData)) > next.getInt("capacity")) {
        throw bookingError("capacity", "Capacity cannot be lower than the number of confirmed bookings.");
      }
      e.next();
      if (!cancelling) return;
      const actor = next.getString("@pbInternalAuditActor");
      const now = Date.now();
      for (const booking of bookings) {
        if (["booked", "waitlisted"].includes(booking.getString("status"))) {
          saveCancellation(tx, booking, "cancelled", now, actor, SESSION_CANCELLED_NOTE);
        }
      }
    });
  } finally {
    e.app = app;
  }
}, "class_sessions");
