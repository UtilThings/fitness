/// <reference path="../pb_data/types.d.ts" />

function scopeBusinessRules(app, reverse) {
  const collections = [
    "admins", "services", "plans", "class_templates", "class_sessions", "schedule_blocks", "coach_availability",
    "clients", "bookings", "memberships", "credit_movements", "receipt_sequences", "payments", "coaching_programs",
    "coaching_checkins", "message_templates", "message_logs", "audit_logs",
  ];
  const rule = '@request.auth.business = business';
  const suffix = ' && ' + rule;
  for (const name of collections) {
    const collection = app.findCollectionByNameOrId(name);
    for (const action of ["listRule", "viewRule", "updateRule", "deleteRule"]) {
      const previous = collection[action];
      if (previous == null) continue;
      if (reverse) {
        if (previous === rule) collection[action] = "";
        else if (previous.endsWith(suffix)) {
          const unscoped = previous.slice(0, -suffix.length);
          const inner = unscoped.slice(1, -1);
          collection[action] = unscoped.startsWith("(") && unscoped.endsWith(")") && /&&|\|\|/.test(inner)
            ? inner : unscoped;
        }
      } else {
        const existing = /&&|\|\|/.test(previous) ? `(${previous})` : previous;
        collection[action] = existing ? existing + suffix : rule;
      }
    }
    app.save(collection);
  }
}

// The businesses collection already has its own rule comparing the auth business to its id.
migrate((app) => scopeBusinessRules(app, false), (app) => scopeBusinessRules(app, true));
