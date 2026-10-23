"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { EngineError, startRun } from "@/lib/engine/engine";
import type { FormState } from "@/components/ActionForm";

export async function startTestRunAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const character = await db.character.findUnique({ where: { userId: admin.id } });
  if (!character) return { error: "관리자 캐릭터가 없습니다." };
  const realmId = String(formData.get("realmId") ?? "");
  const force = String(formData.get("forceResult") ?? "");
  let runId: string;
  try {
    runId = await startRun(character.id, realmId, { isTest: true, forceResult: force === "SUCCESS" || force === "FAIL" ? force : null });
  } catch (e) {
    if (e instanceof EngineError) return { error: e.message };
    throw e;
  }
  redirect(`/explore/${runId}`);
}
