"use server";
import { unstable_rethrow } from "next/navigation";
import { requireOwner } from "@/lib/auth/server";
import { formError } from "@/lib/forms/errors";
import * as actions from "./actions";
async function submit(action: (data: FormData) => Promise<void>, data: FormData, success: string) {
  try { await action(data); return success; }
  catch (error) { unstable_rethrow(error); return formError(error); }
}
export async function createMarket(_: string, data: FormData) { await requireOwner(); return submit(actions.createMarket, data, "Market created."); }
export async function saveMarket(_: string, data: FormData) { await requireOwner(); return submit(actions.saveMarket, data, "Market assumptions saved."); }
export async function createOpportunity(_: string, data: FormData) { await requireOwner(); return submit(actions.createOpportunity, data, "Opportunity created."); }
export async function addEvaluation(_: string, data: FormData) { await requireOwner(); return submit(actions.addEvaluation, data, "Market evaluation is available."); }
export async function saveEvaluation(_: string, data: FormData) { await requireOwner(); return submit(actions.saveEvaluation, data, "Inputs saved."); }
