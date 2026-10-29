import "server-only";
import { db } from "./db";

export type UnlockCondition = { type: "flag"; flag: string } | { type: "realm_escapes"; realmId: string; count: number } | { type: "item"; itemId: string };

/** 캐릭터가 지금까지 모은 것: 단서 플래그, 이계별 탈출 횟수(인스턴스는 템플릿 기준으로 합산), 보유·획득한 아이템 */
export async function characterProgress(characterId: string) {
  const [runs, inv] = await Promise.all([
    db.run.findMany({ where: { characterId, isTest: false, status: { in: ["ESCAPED", "FALLEN"] } }, include: { realm: { select: { id: true, templateId: true } } } }),
    db.inventoryItem.findMany({ where: { characterId }, select: { itemId: true } }),
  ]);
  const flags = new Set<string>();
  const escapes = new Map<string, number>();
  const items = new Set(inv.map((i) => i.itemId));
  for (const r of runs) {
    for (const c of (Array.isArray(r.clues) ? (r.clues as { flag: string }[]) : [])) if (c.flag) flags.add(c.flag);
    for (const f of (Array.isArray(r.flags) ? (r.flags as string[]) : [])) if (!f.startsWith("__")) flags.add(f);
    for (const l of (Array.isArray(r.loot) ? (r.loot as { itemId: string }[]) : [])) items.add(l.itemId);
    if (r.status === "ESCAPED") {
      const key = r.realm.templateId ?? r.realm.id;
      escapes.set(key, (escapes.get(key) ?? 0) + 1);
    }
  }
  return { flags, escapes, items };
}

export type Progress = Awaited<ReturnType<typeof characterProgress>>;

export function isUnlocked(conds: UnlockCondition[], p: Progress): boolean {
  return conds.every((c) => {
    switch (c.type) {
      case "flag": return p.flags.has(c.flag);
      case "realm_escapes": return (p.escapes.get(c.realmId) ?? 0) >= c.count;
      case "item": return p.items.has(c.itemId);
      default: return false;
    }
  });
}

export function describeUnlock(c: UnlockCondition, names: { realms: Map<string, string>; items: Map<string, string> }): string {
  switch (c.type) {
    case "flag": return "특정 단서를 확보";
    case "realm_escapes": return `"${names.realms.get(c.realmId) ?? "?"}" 탈출 ${c.count}회`;
    case "item": return `"${names.items.get(c.itemId) ?? "?"}" 획득`;
  }
}
