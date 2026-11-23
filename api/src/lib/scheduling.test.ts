import { describe, expect, test } from "bun:test";
import {
  findCoachConflicts, intervalsOverlap, isWithinAvailability, privateCapacity, toMinutes,
  validateAvailabilitySlots, validatePrivateSession, validateSpecialSession,
} from "./scheduling";

const slot = { weekday: 1, start_time: "08:00", end_time: "12:00" };
const session = { id: "regular", coach: "coach", status: "scheduled", startMs: 0, durationMin: 60 };
const input = {
  coach: "coach", startMs: 0, durationMin: 60, capacity: 1, sessions: [], blocks: [],
  localDate: "2026-11-23", slots: [slot], weekday: 1, startMin: 510, endMin: 570,
};

describe("agendado", () => {
  test("distingue solapes parciales, totales y bordes", () => {
    expect(intervalsOverlap({ start: 0, end: 60 }, { start: 30, end: 90 })).toBe(true);
    expect(intervalsOverlap({ start: 0, end: 60 }, { start: 10, end: 30 })).toBe(true);
    expect(findCoachConflicts([session], "coach", 30 * 60_000, 60)).toEqual([session]);
    expect(findCoachConflicts([session], "coach", 60 * 60_000, 60)).toEqual([]);
    expect(findCoachConflicts([session], "coach", 0, 60, session.id)).toEqual([]);
    expect(findCoachConflicts([{ ...session, status: "cancelled" }], "coach", 0, 60)).toEqual([]);
  });

  test("exige contención en un único tramo y respeta medianoche", () => {
    expect(isWithinAvailability([slot], 1, 510, 570)).toBe(true);
    expect(isWithinAvailability([slot], 1, 690, 750)).toBe(false);
    const adjacent = { ...slot, start_time: "12:00", end_time: "13:00" };
    expect(isWithinAvailability([slot, adjacent], 1, 690, 750)).toBe(false);
    expect(validateAvailabilitySlots([slot, adjacent])).toBeNull();
    expect(validateAvailabilitySlots([slot, { ...adjacent, start_time: "11:30" }])).toBe("overlapping_slots");
    expect(validateAvailabilitySlots([{ ...slot, end_time: "08:00" }])).toBe("invalid_slot");
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("24:00")).toBeNaN();
    expect(validatePrivateSession({ ...input, startMin: 1410, endMin: 30 })).toEqual({ code: "outside_availability" });
  });

  test("la capacidad dos exige planes partner para todos", () => {
    expect(privateCapacity({ clientCount: 1, partnerCount: 0 })).toBe(1);
    expect(privateCapacity({ clientCount: 1, partnerCount: 1 })).toBe(1);
    expect(privateCapacity({ clientCount: 1, partnerCount: 1, capacity: 2 })).toBe(2);
    expect(privateCapacity({ clientCount: 2, partnerCount: 2 })).toBe(2);
    expect(privateCapacity({ clientCount: 2, partnerCount: 1 })).toEqual({ code: "partner_required" });
    expect(privateCapacity({ clientCount: 1, partnerCount: 0, capacity: 2 })).toEqual({ code: "partner_required" });
    expect(privateCapacity({ clientCount: 2, partnerCount: 2, capacity: 1 })).toEqual({ code: "invalid_capacity" });
  });

  test("las especiales requieren título y respetan bloqueos con coach", () => {
    expect(validateSpecialSession({ ...input, title: "  " })).toEqual({ code: "title_required" });
    const crossing = { ...input, lastLocalDate: "2026-11-24", title: "Evento",
      blocks: [{ id: "block", date_from: "2026-11-24", date_to: "2026-11-24" }] };
    expect(validateSpecialSession(crossing)).toEqual({ code: "block_conflict", conflictId: "block" });
    expect(validateSpecialSession({ ...crossing, coach: "" })).toBeNull();
  });
});
