export const AUDITED_COLLECTIONS: readonly string[] = [
  "admins", "services", "plans", "class_templates", "class_sessions", "schedule_blocks", "clients",
];
export const SENSITIVE_FIELDS = ["password", "passwordHash", "tokenKey"];
export const IGNORED_FIELDS: readonly string[] = ["created", "updated"];

export function isAudited(name: string): boolean {
  return name !== "audit_logs" && AUDITED_COLLECTIONS.includes(name);
}
