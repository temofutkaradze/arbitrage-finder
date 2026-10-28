"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSchedule, setScheduleEnabled } from "@/lib/automation/service";
export async function addSchedule(_: string, form: FormData) {
  try { await createSchedule({ keyword: form.get("keyword"), intervalHours: form.get("intervalHours") }); }
  catch { return "Not saved. Use a unique product phrase (2–100 letters/digits/spaces), and a whole-number interval of 6–168 hours."; }
  revalidatePath("/automation"); return "Schedule created paused. Review the limits, then explicitly enable it.";
}
export async function changeSchedule(_: string, form: FormData) {
  const result = z.object({ id: z.coerce.number().int().positive(), enabled: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(form));
  if (!result.success) return "Invalid schedule action.";
  const enabled = result.data.enabled === "true";
  if (enabled && form.get("confirmed") !== "on") return "Confirm that this schedule may make recurring CJ catalogue requests.";
  try { await setScheduleEnabled(result.data.id, enabled); }
  catch { return "Not changed. At most five schedules can be enabled; check database availability."; }
  revalidatePath("/automation"); return enabled ? "Enabled. The worker will process it when running and within budget." : "Paused. Any in-flight result is prevented from importing.";
}
