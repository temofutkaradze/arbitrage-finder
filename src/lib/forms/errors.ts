import { ZodError } from "zod";
export class InputValidationError extends Error {}
export function formError(error: unknown): string {
  if (error instanceof InputValidationError) return error.message;
  if (error instanceof ZodError) return "Check the required fields, supported currency, country code and source URL. No changes were saved.";
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === "P2002") return "This record already exists. Reload to view it before submitting again.";
  if (code === "P2025" || code === "P2003") return "A selected record no longer exists. Reload and select it again.";
  return "Could not confirm the save. Your entries are kept. Check the current record and connection before trying again.";
}
