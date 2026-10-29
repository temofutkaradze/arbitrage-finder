import { z } from "zod";
import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../db/prisma";
import { compareIdentity, identitySchema } from "./identity";

export class MatchingError extends Error {}
const id = z.number().int().positive();
const revision = z.number().int().min(0);
const reviewNote = z.string().trim().min(20).max(2000);
const LIMIT = 200;
const include = { identity: true, opportunity: { select: { id: true, name: true } } } as const;
type Listing = Prisma.SourceListingGetPayload<{ include: typeof include }>;
function snapshot(listing: Listing) {
  return { listingId: listing.id, provider: listing.provider, externalId: listing.externalId, variantId: listing.variantId,
    name: listing.name, url: listing.url, opportunityId: listing.opportunityId,
    identity: listing.identity ? { ...listing.identity, observedAt: listing.identity.observedAt.toISOString(), updatedAt: listing.identity.updatedAt.toISOString() } : null };
}
// Same lock as imports and candidate promotion; all linking and identity writes
// participate so stale forms and two concurrent accepts cannot change the result.
async function lock(tx: Prisma.TransactionClient) { await tx.$executeRaw`SELECT pg_advisory_xact_lock(71340921)`; }

export async function saveIdentity(listingId: number, expectedRevision: number, raw: unknown) {
  id.parse(listingId); revision.parse(expectedRevision);
  const parsed = identitySchema.safeParse(raw);
  if (!parsed.success) throw new MatchingError("Identifiers rejected. Use a valid GTIN or brand + manufacturer part number, a source URL, observation time and a note of at least 20 characters.");
  const data = parsed.data;
  if (data.observedAt > new Date()) throw new MatchingError("Identity observation time cannot be in the future.");
  return prisma.$transaction(async tx => {
    await lock(tx);
    const listing = await tx.sourceListing.findUnique({ where: { id: listingId }, include });
    if (!listing) throw new MatchingError("Listing no longer exists.");
    if ((listing.identity?.revision ?? 0) !== expectedRevision) throw new MatchingError("Identity changed. Reload before editing.");
    if (listing.opportunityId) {
      const peers = await tx.sourceListing.findMany({ where: { opportunityId: listing.opportunityId, id: { not: listingId } }, include, take: LIMIT + 1 });
      if (peers.length > LIMIT || peers.some(p => !p.identity || !compareIdentity(data, p.identity).ready)) throw new MatchingError("This edit conflicts with or cannot confirm another linked listing. Undo the reviewed link before changing identity.");
    }
    const saved = await tx.listingIdentity.upsert({ where: { listingId }, create: { listingId, revision: 1, ...data }, update: { ...data, revision: { increment: 1 } } });
    await tx.identityRevision.create({ data: { listingId, revision: saved.revision, snapshot: snapshot({ ...listing, identity: saved }) } });
    return saved;
  });
}

export async function matchingProposals(listingId: number, db: Prisma.TransactionClient = prisma) {
  const source = await db.sourceListing.findUnique({ where: { id: listingId }, include });
  if (!source?.identity || source.opportunityId) return { source, groups: [], ambiguous: false, limited: false };
  const identity = source.identity;
  const keys: Prisma.ListingIdentityWhereInput[] = [];
  if (identity.gtin) keys.push({ gtin: identity.gtin });
  if (identity.brand && identity.mpn) keys.push({ brand: identity.brand, mpn: identity.mpn });
  const anchors = await db.sourceListing.findMany({ where: { id: { not: listingId }, opportunityId: { not: null }, identity: { is: { OR: keys } } }, include, orderBy: { id: "asc" }, take: LIMIT + 1 });
  const opportunityIds = [...new Set(anchors.map(a => a.opportunityId!))];
  // One bounded query also catches contradictory siblings within each research record.
  const peers = opportunityIds.length ? await db.sourceListing.findMany({ where: { opportunityId: { in: opportunityIds } }, include, orderBy: { id: "asc" }, take: LIMIT + 1 }) : [];
  const limited = anchors.length > LIMIT || peers.length > LIMIT;
  const ambiguous = opportunityIds.length > 1;
  const groups = opportunityIds.slice(0, LIMIT).map(opportunityId => {
    const target = anchors.find(a => a.opportunityId === opportunityId)!;
    const members = peers.filter(p => p.opportunityId === opportunityId);
    const comparisons = members.map(p => p.identity ? compareIdentity(identity, p.identity) : null);
    const reasons = [...new Set(comparisons.flatMap(c => c ? [...c.blockers, ...c.missing, ...(!c.basis ? ["A linked listing has no matching identifier"] : [])] : ["A linked listing has no recorded identity"]))];
    if (ambiguous) reasons.push("Identifiers match more than one research record; resolve duplicates before linking");
    if (limited) reasons.push("Review exceeds 200 matching listings; narrow or correct identifiers before linking");
    return { target, members, basis: compareIdentity(identity, target.identity!).basis, reasons, ready: !reasons.length && members.length > 0 };
  });
  return { source, groups, ambiguous, limited };
}

const linkSchema = z.object({ listingId: id, targetListingId: id, expectedOpportunityId: id, sourceRevision: revision, targetRevision: revision, confirmed: z.literal(true), note: reviewNote });
export async function acceptListingLink(raw: unknown) {
  const args = linkSchema.safeParse(raw);
  if (!args.success) throw new MatchingError("Confirm the exact variant and pack and provide a review note of at least 20 characters.");
  const { listingId, targetListingId, sourceRevision, targetRevision, note } = args.data;
  return prisma.$transaction(async tx => {
    await lock(tx);
    const state = await matchingProposals(listingId, tx);
    if (!state.source?.identity || state.source.opportunityId) throw new MatchingError("Source is missing identifiers or already linked. Reload to review.");
    const group = state.groups.find(g => g.members.some(p => p.id === targetListingId));
    const target = group?.members.find(p => p.id === targetListingId);
    if (state.source.identity.revision !== sourceRevision || target?.identity?.revision !== targetRevision) throw new MatchingError("Identity changed. Reload and review the latest identifiers.");
    if (target?.opportunityId !== args.data.expectedOpportunityId) throw new MatchingError("Target research record changed. Reload before linking.");
    if (!group?.ready || !target?.opportunityId) throw new MatchingError("Match is incomplete, conflicting or ambiguous. Reload and correct identifiers before linking.");
    await tx.sourceListing.update({ where: { id: listingId }, data: { opportunityId: target.opportunityId } });
    await tx.listingLinkDecision.create({ data: { listingId, opportunityId: target.opportunityId, kind: "LINK", note,
      snapshot: { source: snapshot(state.source), target: snapshot(target), checkedPeers: group.members.map(snapshot), basis: group.basis } } });
    return target.opportunityId;
  }, { timeout: 20_000 });
}

export async function undoListingLink(listingId: number, expectedOpportunityId: number, note: string, confirmed: boolean) {
  id.parse(listingId); id.parse(expectedOpportunityId);
  if (!confirmed || !reviewNote.safeParse(note).success) throw new MatchingError("Confirm undo and explain the correction in at least 20 characters.");
  return prisma.$transaction(async tx => {
    await lock(tx);
    const source = await tx.sourceListing.findUnique({ where: { id: listingId }, include });
    const last = await tx.listingLinkDecision.findFirst({ where: { listingId }, orderBy: { id: "desc" } });
    if (!source || source.opportunityId !== expectedOpportunityId || last?.kind !== "LINK" || last.opportunityId !== expectedOpportunityId) throw new MatchingError("This reviewed link is no longer current. Reload to check.");
    await tx.sourceListing.update({ where: { id: listingId }, data: { opportunityId: null } });
    await tx.listingLinkDecision.create({ data: { listingId, opportunityId: expectedOpportunityId, kind: "UNLINK", note: note.trim(), snapshot: { source: snapshot(source), reversesDecisionId: last.id } } });
  });
}
