import { describe, expect, test } from "bun:test";
import { classTemplates, groupPlans, jumpPlans, personalOneOnOne, personalPartner } from "../../../web/src/lib/data";
import { CATALOG_SEED, canActivatePlan, dependentsBlockMessage, findFirstClassConflict, validatePlan, validateService } from "./catalog";

describe("catálogo", () => {
  const service = CATALOG_SEED[0]!;
  const paid = service.plans[0]!;
  const first = CATALOG_SEED[3]!.plans[1]!;

  test("valida el cupo, política, tipo y slug", () => {
    expect(validateService(service)).toEqual({});
    expect(validateService(CATALOG_SEED[4]!)).toEqual({});
    expect(validateService({ ...service, capacity: 0, cancellation_hours: 169, slug: "Grupo 1" })).toHaveProperty("capacity");
    expect(Object.keys(validateService({ ...service, capacity: 0.5, cancellation_hours: 169, slug: "Grupo 1" }))).toEqual(["slug", "capacity", "cancellation_hours"]);
  });

  test("valida los precios y las condiciones de la primera clase", () => {
    expect(validatePlan(paid)).toEqual({});
    expect(validatePlan(first)).toEqual({});
    for (const price of [-1, 0, 0.5]) {
      expect(validatePlan({ ...paid, price_cents: price })).toHaveProperty("price_cents");
    }
    expect(validatePlan({ ...first, price_cents: 1, billing_unit: "per_class" })).toHaveProperty("billing_unit");
    expect(validatePlan({ ...first, price_cents: 1 })).toHaveProperty("price_cents");
    expect(Object.keys(validatePlan({ ...paid, sessions: -1, per_week: 8, commitment_periods: 0.5 }))).toEqual(["sessions", "per_week", "commitment_periods"]);
  });

  test("detecta conflictos, activación y dependientes", () => {
    const plans = [{ id: "first", is_first_class: true }, { id: "paid", is_first_class: false }];
    expect(findFirstClassConflict(plans, "new")).toBe("first");
    expect(findFirstClassConflict(plans, "first")).toBeUndefined();
    expect(canActivatePlan(false)).toBe(false);
    expect(canActivatePlan(true)).toBe(true);
    expect(dependentsBlockMessage("service", { plans: 3 })).toBe("Tiene 3 planes asociados. Desactívalo en su lugar.");
    expect(dependentsBlockMessage("plan", { memberships: 1, payments: 2 })).toContain("1 membresía asociada, 2 pagos asociados");
    expect(dependentsBlockMessage("plan", {})).toBeNull();
  });

  test("conserva nombres, precios, sesiones, frecuencia, compromiso y cupos de web", () => {
    const sources = [personalOneOnOne, personalPartner, groupPlans, jumpPlans, []];
    expect(CATALOG_SEED).toHaveLength(sources.length);
    for (const [index, seeded] of CATALOG_SEED.entries()) {
      const source = sources[index]!;
      expect(new Set(seeded.plans.map(({ name }) => name)).size).toBe(source.length);
      expect(seeded.plans).toHaveLength(source.length);
      for (const row of source) {
        const actual = seeded.plans.find(({ name }) => name === row.name);
        const sessions = Number.parseInt(row.sessions, 10);
        const frequency = row.freq.match(/(\d+).*per week/i)?.[1] ?? row.name.match(/(\d+)x \/ week/)?.[1];
        const commitment = Number(row.freq.match(/(\d+) billing periods/)?.[1] ?? 0);
        const billing_unit = row.unit === "per class" ? "per_class" : row.unit === "first visit" ? "first_visit" : "per_4_weeks";
        expect(actual).toMatchObject({
          price_cents: row.price * 100,
          sessions,
          per_week: Number(frequency ?? (commitment ? sessions / 4 : 0)),
          commitment_periods: commitment,
          is_first_class: row.unit === "first visit",
          partner: row.name.startsWith("Partner "),
          note: row.note ?? "",
          billing_unit,
        });
      }
    }
    for (const template of classTemplates) {
      expect(CATALOG_SEED.find(({ name }) => name === template.service)?.capacity).toBe(template.capacity);
    }
    expect(CATALOG_SEED.map(({ capacity, cancellation_hours }) => [capacity, cancellation_hours]))
      .toEqual([[1, 24], [2, 24], [6, 12], [12, 12], [0, 0]]);
  });
});
