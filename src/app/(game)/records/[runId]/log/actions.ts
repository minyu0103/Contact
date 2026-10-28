"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { saveImage } from "@/lib/upload";
import type { FormState } from "@/components/ActionForm";

export async function createLogAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { character } = await requireCharacterUser();
  const cfg = await getConfig();
  const runId = String(formData.get("runId") ?? "");
  const kind = String(formData.get("kind") ?? "") === "CAMERA" ? "CAMERA" : "DIARY";
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const body = String(formData.get("body") ?? "").trim();
  const nodeId = String(formData.get("nodeId") ?? "") || null;
  const run = await db.run.findUnique({ where: { id: runId } });
  if (!run || run.characterId !== character.id) return { error: "내 탐사가 아닙니다." };
  if (run.status === "ACTIVE" || run.isTest) return { error: "끝난 탐사만 로그를 쓸 수 있습니다." };
  if (!title) return { error: "제목을 입력하세요." };
  if (!body) return { error: "내용을 입력하세요." };
  if (kind === "DIARY" && body.length > cfg["log.diaryMaxLength"]) return { error: `일기 로그는 ${cfg["log.diaryMaxLength"]}자 이하입니다.` };
  if (kind === "CAMERA" && !run.hadCamera) return { error: "이계용 비디오 카메라를 지니고 입장한 탐사만 카메라 로그를 쓸 수 있습니다." };
  if (kind === "CAMERA" && body.length > 20000) return { error: "카메라 로그는 20000자 이하입니다." };
  if (await db.explorationLog.findUnique({ where: { runId_kind: { runId, kind } } })) return { error: "이 탐사의 로그는 이미 썼습니다." };
  if (nodeId) {
    const visited = Array.isArray(run.visitedNodeIds) ? (run.visitedNodeIds as string[]) : [];
    if (!visited.includes(nodeId)) return { error: "이 탐사에서 방문한 구역만 고를 수 있습니다." };
  }
  let imageUrl: string | null = null;
  if (kind === "CAMERA") {
    try { const f = formData.get("image"); imageUrl = await saveImage(f instanceof File ? f : null, "logs"); } catch (e) { return { error: e instanceof Error ? e.message : "이미지 업로드 실패" }; }
  }
  const log = await db.$transaction(async (tx) => {
    const post = await tx.post.create({ data: { kind: "LOG", authorId: character.id, title, body: "" } });
    const created = await tx.explorationLog.create({ data: {
      kind, status: kind === "DIARY" ? "APPROVED" : "PENDING", runId, characterId: character.id, realmId: run.realmId, nodeId: kind === "DIARY" ? nodeId : null,
      title, body, imageUrl, postId: post.id, rewardPaid: kind === "DIARY" ? cfg["log.diaryReward"] : 0,
    } });
    if (kind === "DIARY" && cfg["log.diaryReward"] > 0) await tx.character.update({ where: { id: character.id }, data: { points: { increment: cfg["log.diaryReward"] } } });
    return created;
  });
  revalidatePath("/", "layout");
  redirect(`/community/logs/${log.id}`);
}
