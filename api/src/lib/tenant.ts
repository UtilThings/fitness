export const TENANT_COLLECTIONS = [
  "admins", "services", "plans", "class_templates", "class_sessions", "schedule_blocks", "coach_availability",
] as const;

export type TenantCollection = (typeof TENANT_COLLECTIONS)[number];
