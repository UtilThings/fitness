export function canTransition(from: string, to: string, role = ""): boolean {
  if (from === to) return true;
  if (from === "scheduled") return to === "cancelled" || to === "completed";
  return from === "cancelled" && to === "scheduled" && role === "owner";
}

export function isCancellationTransition(prev: unknown, next: unknown): boolean {
  return prev === "scheduled" && next === "cancelled";
}

export function validateCancelReason(text: unknown): string | null {
  const length = typeof text === "string" ? Array.from(text.trim()).length : 0;
  return length >= 3 && length <= 200 ? null : "The reason must contain 3 to 200 characters.";
}

export function validateMove(input: {
  startsAt: unknown;
  now: number;
  blocked?: boolean;
  conflict?: boolean;
}): string | null {
  const { startsAt, now, blocked, conflict } = input;
  if (typeof startsAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(startsAt)) {
    return "Enter a valid future UTC date and time.";
  }
  const date = new Date(startsAt);
  if (!(date.getTime() > now) || date.toISOString().slice(0, 19) !== startsAt.slice(0, 19)) {
    return "Enter a valid future UTC date and time.";
  }
  if (blocked) return "The date falls within a schedule block.";
  if (conflict) return "The coach already has a session at that time.";
  return null;
}
