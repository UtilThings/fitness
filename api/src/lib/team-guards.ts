/// <reference path="../../pb_data/types.d.ts" />

import { TENANT_REFERENCES } from "./tenant";

export const ADMIN_REFERENCES = Object.entries(TENANT_REFERENCES).flatMap(([collection, fields]) =>
  Object.entries(fields).filter(([, target]) => target === "admins").map(([field]) => ({ collection, field })));

export function countActiveOwners(app: Pick<core.App, "countRecords">, business: string) {
  return app.countRecords("admins", $dbx.hashExp({ business, role: "owner", active: true }));
}

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
