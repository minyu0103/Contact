"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCharacterUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EngineError, ackResultAction, chooseAction, continueAction, discardLootAction, escapeAction, moveAction, startRun, teleportAction, consumeItemInRun } from "@/lib/engine/engine";

export type RunCmdState = { error?: string } | undefined;

async function ownRun(runId: string) {
  const { user, character } = await requireCharacterUser();
  const run = await db.run.findUnique({ where: { id: runId } });
  if (!run || (run.characterId !== character.id && user.role !== "ADMIN")) redirect("/home");
  return run;
}

/** 탐사 화면의 모든 조작. cmd 형식: "choice:<id>", "choice-auto:<id>", "move:<edgeId>", "escape", "continue", "ack", "teleport:<nodeId>", "item:<itemId>", "discard:<itemId>" */
export async function runCommandAction(_prev: RunCmdState, formData: FormData): Promise<RunCmdState> {
  const runId = String(formData.get("runId") ?? "");
  const cmd = String(formData.get("cmd") ?? "");
  await ownRun(runId);
  const [kind, arg] = cmd.split(":", 2);
  try {
    switch (kind) {
      case "choice": await chooseAction(runId, arg, false); break;
      case "choice-auto": await chooseAction(runId, arg, true); break;
      case "move": await moveAction(runId, arg); break;
      case "escape": await escapeAction(runId); break;
      case "continue": await continueAction(runId); break;
      case "ack": await ackResultAction(runId); break;
      case "teleport": await teleportAction(runId, arg); break;
      case "item": await consumeItemInRun(runId, arg); break;
      case "discard": await discardLootAction(runId, arg); break;
      default: return { error: "알 수 없는 명령입니다." };
    }
  } catch (e) {
    if (e instanceof EngineError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/explore/${runId}`);
  revalidatePath("/", "layout");
  return undefined;
}

export async function enterRealmAction(_prev: RunCmdState, formData: FormData): Promise<RunCmdState> {
  const { character } = await requireCharacterUser();
  const realmId = String(formData.get("realmId") ?? "");
  let runId: string;
  try {
    runId = await startRun(character.id, realmId, { isTest: false });
  } catch (e) {
    if (e instanceof EngineError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/explore/${runId}`);
}
