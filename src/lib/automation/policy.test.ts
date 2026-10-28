import { expect, it } from "vitest";
import { scheduleSchema, failurePolicy, errorCategory, utcDayStart } from "./policy";
it("bounds schedules and normalizes phrases without accepting credential-like inputs", () => {
  expect(scheduleSchema.parse({keyword:"  Kitchen Organizer  ",intervalHours:24}).keyword).toBe("kitchen organizer");
  for (const intervalHours of [0,5,169,6.5]) expect(scheduleSchema.safeParse({keyword:"organizer",intervalHours}).success).toBe(false);
  expect(scheduleSchema.safeParse({keyword:"https://example.com",intervalHours:24}).success).toBe(false);
});
it("pauses auth errors immediately and other repeated failures after five", () => {
  expect(failurePolicy(1,"AUTH").pause).toBe(true);
  expect(failurePolicy(4,"NETWORK").pause).toBe(false);
  expect(failurePolicy(5,"NETWORK").pause).toBe(true);
  expect(failurePolicy(1,"RATE").delayMs).toBeGreaterThanOrEqual(3600000);
  expect(failurePolicy(100,"NETWORK").delayMs).toBe(86400000);
});
it("retains only fixed error categories and uses UTC budget boundaries", () => {
  expect(errorCategory(new Error("private upstream response"))).toBe("VALIDATION_OR_STORAGE");
  expect(errorCategory(new Error("CJ authentication failed"))).toBe("AUTH");
  expect(utcDayStart(new Date("2026-10-28T00:01:00+04:00")).toISOString()).toBe("2026-10-27T00:00:00.000Z");
});
