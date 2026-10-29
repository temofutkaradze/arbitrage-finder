export class ReportLimitError extends Error {}
export function assertReportLimits(data: { evaluations: { length: number }; evidence: { length: number }; listings: { length: number }; competitors: { length: number } }) {
  if (data.evaluations.length > 100 || data.evidence.length > 2000 || data.listings.length > 500 || data.competitors.length > 2000) throw new ReportLimitError("Report exceeds export limits. No partial report was generated.");
}
