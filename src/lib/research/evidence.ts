import { z } from "zod";
import { sourceUrl } from "../discovery/schema";
import { EVIDENCE_KINDS, PROVENANCE } from "./readiness";
const date = z.iso.date().transform((s) => new Date(`${s}T00:00:00Z`)).refine((d) => Number.isFinite(d.getTime()), "Invalid date");
export const evidenceSchema = z.object({
  opportunityId: z.coerce.number().int().positive(),
  marketId: z.preprocess((v) => v === "" ? null : v, z.coerce.number().int().positive().nullable()),
  kind: z.enum(EVIDENCE_KINDS), provenance: z.enum(PROVENANCE),
  summary: z.string().trim().min(10).max(2000), url: sourceUrl,
  observedAt: date, expiresAt: date,
  outcome: z.enum(["SUPPORTS", "CONCERN", "INCONCLUSIVE"]),
}).refine((e) => e.observedAt <= new Date(), "Observation cannot be in the future")
  .refine((e) => e.expiresAt > e.observedAt, "Expiry must follow observation");
