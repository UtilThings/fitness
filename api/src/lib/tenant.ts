export const TENANT_COLLECTIONS = [
  "admins", "services", "plans", "class_templates", "class_sessions", "schedule_blocks", "coach_availability",
  "clients", "bookings", "memberships", "credit_movements", "receipt_sequences", "payments", "coaching_programs", "coaching_checkins",
] as const;

export type TenantCollection = (typeof TENANT_COLLECTIONS)[number];
