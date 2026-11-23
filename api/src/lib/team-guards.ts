export const ADMIN_REFERENCES: { collection: string; field: string }[] = [
  { collection: "audit_logs", field: "actor" },
  { collection: "services", field: "default_coach" },
  { collection: "bookings", field: "marked_by" },
  { collection: "payments", field: "recorded_by" },
  { collection: "payments", field: "voided_by" },
];

interface AdminState {
  id: string;
  role: string;
  active: boolean;
}

interface GuardError {
  status: number;
  message: string;
}

const lastOwner: GuardError = {
  status: 400,
  message: "Debe quedar al menos un owner activo",
};

export function checkAdminChange({ before, after, actorId, activeOwners }: {
  before: AdminState;
  after: AdminState;
  actorId?: string;
  activeOwners: number;
}): GuardError | null {
  if (before.active && !after.active && before.id === actorId) {
    return { status: 400, message: "No puedes desactivarte a ti mismo" };
  }
  if (before.active && before.role === "owner" && activeOwners <= 1
    && (!after.active || after.role !== "owner")) {
    return lastOwner;
  }
  return null;
}

export function canDeleteAdmin({ referencesCount, isLastOwner, isSelf }: {
  referencesCount: number;
  isLastOwner: boolean;
  isSelf: boolean;
}): GuardError | null {
  if (isLastOwner) return lastOwner;
  if (isSelf) return { status: 400, message: "No puedes eliminar tu propia cuenta" };
  if (referencesCount > 0) {
    return { status: 409, message: "Tiene registros asociados; desactívalo en su lugar" };
  }
  return null;
}
