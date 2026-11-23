export type Interval = { start: number; end: number };
export type AvailabilitySlot = { coach?: string; weekday: number; start_time: string; end_time: string };
export type CoachSession = { id: string; coach: string; status: string; startMs: number; durationMin: number };
export type ScheduleBlock = { id: string; date_from: string; date_to: string };

type SchedulingError = {
  code: "coach_conflict" | "outside_availability" | "invalid_capacity" | "partner_required" |
    "title_required" | "block_conflict";
  conflictId?: string;
};

type SessionInput = {
  coach: string;
  startMs: number;
  durationMin: number;
  capacity: number;
  sessions: CoachSession[];
  blocks: ScheduleBlock[];
  localDate: string;
  lastLocalDate?: string;
  excludeId?: string;
};

export function toMinutes(time: string): number {
  const parts = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return parts ? Number(parts[1]) * 60 + Number(parts[2]) : NaN;
}

export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

function slotInterval(slot: AvailabilitySlot): Interval {
  return { start: toMinutes(slot.start_time), end: toMinutes(slot.end_time) };
}

export function isWithinAvailability(slots: AvailabilitySlot[], weekday: number, startMin: number, endMin: number): boolean {
  return endMin > startMin && slots.some((slot) => {
    const { start, end } = slotInterval(slot);
    return slot.weekday === weekday && start <= startMin && endMin <= end;
  });
}

export function validateAvailabilitySlots(slots: AvailabilitySlot[]): "invalid_slot" | "overlapping_slots" | null {
  for (const [index, slot] of slots.entries()) {
    const interval = slotInterval(slot);
    if (!Number.isInteger(slot.weekday) || slot.weekday < 0 || slot.weekday > 6 || !(interval.start < interval.end)) {
      return "invalid_slot";
    }
    if (slots.slice(0, index).some((other) => other.coach === slot.coach &&
      other.weekday === slot.weekday && intervalsOverlap(interval, slotInterval(other)))) {
      return "overlapping_slots";
    }
  }
  return null;
}

export function findCoachConflicts(
  sessions: CoachSession[], coachId: string, startMs: number, durationMin: number, excludeId?: string,
): CoachSession[] {
  const interval = { start: startMs, end: startMs + durationMin * 60_000 };
  return sessions.filter((session) => session.coach === coachId && session.status === "scheduled" &&
    session.id !== excludeId && intervalsOverlap(interval, {
      start: session.startMs, end: session.startMs + session.durationMin * 60_000,
    }));
}

export function findBlockConflicts(blocks: ScheduleBlock[], localDate: string, lastLocalDate = localDate): ScheduleBlock[] {
  return blocks.filter((block) => block.date_from <= lastLocalDate && block.date_to >= localDate);
}

export function privateCapacity({ clientCount, partnerCount, capacity = clientCount }: {
  clientCount: number; partnerCount: number; capacity?: number;
}): 1 | 2 | SchedulingError {
  if (![1, 2].includes(clientCount) || ![1, 2].includes(capacity) || capacity < clientCount) {
    return { code: "invalid_capacity" };
  }
  if (capacity === 2 && partnerCount !== clientCount) return { code: "partner_required" };
  return capacity as 1 | 2;
}

function validateConflicts(input: SessionInput): SchedulingError | null {
  const { coach, sessions, startMs, durationMin, excludeId, blocks, localDate, lastLocalDate } = input;
  if (!coach) return null;
  const [session] = findCoachConflicts(sessions, coach, startMs, durationMin, excludeId);
  if (session) return { code: "coach_conflict", conflictId: session.id };
  const [block] = findBlockConflicts(blocks, localDate, lastLocalDate);
  return block ? { code: "block_conflict", conflictId: block.id } : null;
}

export function validatePrivateSession(input: SessionInput & {
  slots: AvailabilitySlot[]; weekday: number; startMin: number; endMin: number;
  clientCount?: number; partnerCount?: number;
}): SchedulingError | null {
  if (![1, 2].includes(input.capacity)) return { code: "invalid_capacity" };
  if (input.clientCount !== undefined) {
    const result = privateCapacity({
      clientCount: input.clientCount, partnerCount: input.partnerCount ?? 0, capacity: input.capacity,
    });
    if (typeof result !== "number") return result;
  }
  const conflict = validateConflicts(input);
  if (conflict) return conflict;
  return isWithinAvailability(input.slots, input.weekday, input.startMin, input.endMin)
    ? null : { code: "outside_availability" };
}

export function validateSpecialSession(input: SessionInput & { title: string }): SchedulingError | null {
  if (!input.title.trim()) return { code: "title_required" };
  if (!Number.isInteger(input.capacity) || input.capacity < 1) return { code: "invalid_capacity" };
  return validateConflicts(input);
}
