import { z } from "zod";
import { InputValidationError } from "./errors";
export type EditResult = { message: string; saved: boolean; conflict: boolean; version: number };
export class EditConflictError extends InputValidationError {
  constructor() { super("This record changed in another window. Your entries are kept. Open the latest saved version to compare before editing again."); }
}
export function expectedVersion(data: FormData) {
  const parsed = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(0).max(2147483646)).safeParse(data.get("expectedVersion"));
  if (!parsed.success) throw new InputValidationError("The edit version is missing or invalid. Open the latest saved version before saving.");
  return parsed.data;
}
