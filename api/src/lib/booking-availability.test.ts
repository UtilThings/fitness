import { expect, test } from "bun:test";
import { availabilityRange } from "./booking-availability";

test("availability uses the local date boundaries of the business", () => {
  const from = "2026-03-08";
  const to = "2026-03-09";
  expect(availabilityRange(from, to, "America/Bogota")).toEqual({
    from: "2026-03-08T05:00:00.000Z", to: "2026-03-09T05:00:00.000Z",
  });
  expect(availabilityRange(from, to, "America/New_York")).toEqual({
    from: "2026-03-08T05:00:00.000Z", to: "2026-03-09T04:00:00.000Z",
  });
});
