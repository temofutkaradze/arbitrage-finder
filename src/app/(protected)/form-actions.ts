"use server";
import { unstable_rethrow } from "next/navigation";
import { requireOwner } from "@/lib/auth/server";
import { EditConflictError, type EditResult } from "@/lib/forms/editing";
import { formError } from "@/lib/forms/errors";
import * as actions from "./actions";
async function submit(action: (data: FormData) => Promise<unknown>, data: FormData, success: string) {
  try { await action(data); return success; }
  catch (error) { unstable_rethrow(error); return formError(error); }
}
export async function createMarket(_: string, data: FormData) { await requireOwner(); return submit(actions.createMarket, data, "Market created."); }
export async function saveMarket(state: EditResult, data: FormData): Promise<EditResult> {
  await requireOwner();
  try { const version = await actions.saveMarket(data); return { message: "Market assumptions saved.", version, saved: true, conflict: false }; }
  catch (error) { unstable_rethrow(error); return { message: formError(error), version: state.version, saved: false, conflict: error instanceof EditConflictError }; }
}
export async function createOpportunity(_: string, data: FormData) { await requireOwner(); return submit(actions.createOpportunity, data, "Opportunity created."); }
export async function addEvaluation(_: string, data: FormData) { await requireOwner(); return submit(actions.addEvaluation, data, "Market evaluation is available."); }
export async function saveEvaluation(state: EditResult, data: FormData): Promise<EditResult> {
  await requireOwner();
  try { const version = await actions.saveEvaluation(data); return { message: "Inputs saved.", version, saved: true, conflict: false }; }
  catch (error) { unstable_rethrow(error); return { message: formError(error), version: state.version, saved: false, conflict: error instanceof EditConflictError }; }
}
