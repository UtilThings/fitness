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
  return length >= 3 && length <= 200 ? null : "El motivo debe tener entre 3 y 200 caracteres.";
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
    return "Indica una fecha y hora UTC válida en el futuro.";
  }
  const date = new Date(startsAt);
  if (!(date.getTime() > now) || date.toISOString().slice(0, 19) !== startsAt.slice(0, 19)) {
    return "Indica una fecha y hora UTC válida en el futuro.";
  }
  if (blocked) return "La fecha está dentro de un bloqueo.";
  if (conflict) return "El coach ya tiene una sesión en ese horario.";
  return null;
}
