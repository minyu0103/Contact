import "server-only";
import { db } from "./db";
import { getConfig } from "./game-config";

/** 발동 조건을 만족한 스토리 이벤트를 찾아 발동한다 (홈·지도 조회 시 늦게 실행) */
export async function ensureStoryEvents() {
  const pending = await db.storyEvent.findMany({ where: { isActive: true, firedAt: null, conditionType: { not: "MANUAL" } } });
  if (pending.length === 0) return;
  const now = new Date();
  let serverEscapes: number | null = null;
  for (const ev of pending) {
    let ok = false;
    if (ev.conditionType === "DATE") ok = !!ev.triggerAt && ev.triggerAt <= now;
    else if (ev.conditionType === "SERVER_ESCAPES") { if (serverEscapes === null) serverEscapes = await db.run.count({ where: { status: "ESCAPED", isTest: false } }); ok = serverEscapes >= ev.threshold; }
    else if (ev.conditionType === "REALM_PROGRESS" && ev.realmId) {
      const [total, revealed] = await Promise.all([db.node.count({ where: { realmId: ev.realmId } }), db.node.count({ where: { realmId: ev.realmId, revealedAt: { not: null } } })]);
      ok = total > 0 && Math.round((revealed / total) * 100) >= ev.threshold;
    }
    if (ok) await fireStoryEvent(ev.id, null);
  }
}

/** 이벤트 발동: 공지 작성, 전원 보상, 이계 공개 */
export async function fireStoryEvent(id: string, actorUserId: string | null) {
  const cfg = await getConfig();
  void cfg;
  await db.$transaction(async (tx) => {
    const ev = await tx.storyEvent.findUnique({ where: { id } });
    if (!ev || ev.firedAt) return;
    await tx.storyEvent.update({ where: { id }, data: { firedAt: new Date() } });
    if (ev.body) await tx.notice.create({ data: { title: ev.title, body: ev.body, pinned: true, authorId: actorUserId } });
    if (ev.publishRealmId) await tx.realm.update({ where: { id: ev.publishRealmId }, data: { isPublished: true } });
    if (ev.rewardPoints > 0 || ev.rewardItemId) {
      const chars = await tx.character.findMany({ where: { isNpc: false }, select: { id: true } });
      if (ev.rewardPoints > 0) await tx.character.updateMany({ where: { isNpc: false }, data: { points: { increment: ev.rewardPoints } } });
      if (ev.rewardItemId) for (const c of chars) {
        const inv = await tx.inventoryItem.findUnique({ where: { characterId_itemId: { characterId: c.id, itemId: ev.rewardItemId } } });
        if (inv) await tx.inventoryItem.update({ where: { id: inv.id }, data: { qty: inv.qty + ev.rewardQty } });
        else await tx.inventoryItem.create({ data: { characterId: c.id, itemId: ev.rewardItemId, qty: ev.rewardQty } }); // 보상은 칸 수와 무관하게 지급
      }
    }
    await tx.auditLog.create({ data: { actorId: actorUserId, action: "story.fire", targetType: "story", targetId: id, detail: { title: ev.title, auto: !actorUserId } } });
  }, { timeout: 30000 });
}

/** 홈 상단에 띄울 연출 문구 (발동 후 bannerDays 이내) */
export async function activeBanners() {
  const fired = await db.storyEvent.findMany({ where: { firedAt: { not: null }, bannerText: { not: "" } }, orderBy: { firedAt: "desc" }, take: 5 });
  const now = Date.now();
  return fired.filter((e) => e.firedAt && now - e.firedAt.getTime() <= e.bannerDays * 86400000);
}
