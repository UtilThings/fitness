export const ROLES = ["owner", "coach", "reception"] as const;
export type Role = (typeof ROLES)[number];

export const RULE_STAFF = '@request.auth.collectionName = "admins" && @request.auth.active = true';
export const RULE_OWNER = RULE_STAFF + ' && @request.auth.role = "owner"';

function joinRules(operator: "&&" | "||", parts: string[]): string {
  const rules = parts.map((part) => part.trim()).filter(Boolean);
  if (rules.length < 2) {
    return rules[0] ?? "";
  }

  return rules
    .map((rule) => /&&|\|\|/.test(rule) ? `(${rule})` : rule)
    .join(` ${operator} `);
}

export function ruleAnd(...parts: string[]): string {
  return joinRules("&&", parts);
}

export function ruleOr(...parts: string[]): string {
  return joinRules("||", parts);
}

export function ruleRoles(...roles: Role[]): string {
  if (roles.length === 0) {
    throw new Error("At least one role is required");
  }

  const conditions = roles.map((role) => {
    if (!ROLES.includes(role)) {
      throw new Error(`Unknown role: ${role}`);
    }

    return `@request.auth.role = "${role}"`;
  });

  const roleRule = conditions.join(" || ");
  return RULE_STAFF + " && " + (conditions.length > 1 ? `(${roleRule})` : roleRule);
}

export function ruleOwnerOrSelf(lockedFields: readonly string[] = []): string {
  const selfRule = [
    RULE_STAFF,
    "id = @request.auth.id",
    ...lockedFields.map((field) => `@request.body.${field}:isset = false`),
  ].join(" && ");

  return ruleOr(RULE_OWNER, selfRule);
}

export const RULE_BUSINESS = '@request.auth.business = business';
export const RULE_BUSINESS_SELF = '@request.auth.business = id';

export function ruleBusiness(rule: string): string;
export function ruleBusiness(rule: null): null;
export function ruleBusiness(rule: string | null): string | null {
  return rule === null ? null : ruleAnd(rule, RULE_BUSINESS);
}
