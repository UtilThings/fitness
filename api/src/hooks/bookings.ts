/// <reference path="../../pb_data/types.d.ts" />

onRecordsListRequest((e) => {
  if (!e.auth) throw new NotFoundError();
  return e.next();
}, "bookings");

// Select fields use a model hook for their default.
onRecordCreate((e) => {
  if (!e.record!.getString("status")) e.record!.set("status", "booked");
  return e.next();
}, "bookings");

onRecordCreateRequest((e) => {
  const { canBook, decideBookingStatus } =
    require(`${__hooks}/lib/booking-rules`) as typeof import("../lib/booking-rules");
  const { bookingError, bookingRelation, bookingData, requireBookingStaff, sessionBookings, setFreeClassUsed } =
    require(`${__hooks}/lib/booking-store`) as typeof import("../lib/booking-store");
  const { auditActor, inScheduleTransaction } =
    require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const actor = requireBookingStaff(e);
  const requested = e.record!;
  const useFreeClass = e.requestInfo().body.use_free_class === true;

  const result = inScheduleTransaction(e.app, (tx) => {
    const session = bookingRelation(tx, "class_sessions", requested.getString("session"), "session");
    const client = bookingRelation(tx, "clients", requested.getString("client"), "client");
    const records = sessionBookings(tx, session.id);
    const existing = records.find((record) => record.getString("client") === client.id);
    const decision = canBook({
      session: { status: session.getString("status"), starts_at: session.getString("starts_at") },
      client: { status: client.getString("status") },
      existing: existing && bookingData(existing),
      now: Date.now(),
    });
    if (!decision.ok) throw bookingError(decision.field, decision.message);

    if (useFreeClass) {
      const hasPlan = !client.getBool("free_class_used") && tx.countRecords("plans", $dbx.hashExp({
        service: session.getString("service"), active: true, is_first_class: true,
      }));
      if (!hasPlan) throw bookingError("use_free_class", "El cliente no puede usar una clase gratis en este servicio.");
    }

    const next = decideBookingStatus(session.getInt("capacity"), records.map(bookingData));
    const booking = existing ?? new Record(requested.collection(), { session: session.id, client: client.id });
    booking.load({
      status: next.status,
      waitlist_position: next.status === "waitlisted" ? next.position : 0,
      cancelled_at: "",
      marked_by: "",
      source: "admin",
      override_note: "",
      free_class: useFreeClass,
    });
    auditActor(booking, actor);
    tx.save(booking);
    if (useFreeClass) setFreeClassUsed(tx, client, true, actor);
    return booking;
  });

  return e.json(200, result);
}, "bookings");

onRecordUpdateRequest((e) => {
  const { decideCancellation, nextAttendanceStatus } =
    require(`${__hooks}/lib/booking-rules`) as typeof import("../lib/booking-rules");
  const { bookingError, bookingData, requireBookingStaff, saveCancellation, serviceCancellationHours,
    updateWaitlist, SESSION_CANCELLED_NOTE } =
    require(`${__hooks}/lib/booking-store`) as typeof import("../lib/booking-store");
  const { auditActor, inScheduleTransaction } =
    require(`${__hooks}/lib/schedule-store`) as typeof import("../lib/schedule-store");
  const actor = requireBookingStaff(e);
  const body = e.requestInfo().body;
  const status = body.status;
  if (status !== "cancelled" && status !== "attended" && status !== "no_show") {
    throw bookingError("status", "Selecciona una transición de reserva permitida.");
  }
  const note = typeof body.override_note === "string" ? body.override_note.trim() : "";
  if (note === SESSION_CANCELLED_NOTE) throw bookingError("override_note", "Indica el motivo de la excepción.");

  const result = inScheduleTransaction(e.app, (tx) => {
    const booking = tx.findRecordById("bookings", e.record!.id);
    const session = tx.findRecordById("class_sessions", booking.getString("session"));
    const input = {
      booking: bookingData(booking), startsAt: session.getString("starts_at"), now: Date.now(),
      override: { requested: body.override === true, note },
    };

    if (status === "cancelled") {
      const decision = decideCancellation({ ...input, cancellationHours: serviceCancellationHours(tx, session) });
      if (!decision.ok) throw bookingError(decision.field, decision.message);
      saveCancellation(tx, booking, decision.status, input.now, actor, note);
      updateWaitlist(tx, session, actor, input.booking.status === "booked");
    } else {
      const decision = nextAttendanceStatus({ ...input, status });
      if (!decision.ok) throw bookingError(decision.field, decision.message);
      booking.load({ status, marked_by: actor, override_note: note });
      auditActor(booking, actor);
      tx.save(booking);
    }
    return booking;
  });

  return e.json(200, result);
}, "bookings");
