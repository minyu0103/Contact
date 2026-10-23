import Link from "next/link";
import { db } from "@/lib/db";
import { getConfig } from "@/lib/game-config";
import { PageHeader } from "@/components/admin/PageHeader";
import { CATEGORY_LABEL, EROSION_STAGE_LABEL, erosionStage } from "@/lib/rules";
import { formatKst } from "@/lib/time";

const STAGE_TAG = { STABLE: "tag-ok", ACTIVE: "tag-accent", WARNING: "tag-warn", DANGER: "tag-danger" } as const;
const ABILITY_TAG = { PENDING: "tag-warn", ACTIVE: "tag-ok", RETURNED: "tag-danger" } as const;
const ABILITY_LABEL = { PENDING: "심사 중", ACTIVE: "활성", RETURNED: "반려" } as const;

export default async function UsersPage() {
  const cfg = await getConfig();
  const [characters, noCharUsers] = await Promise.all([
    db.character.findMany({ orderBy: { createdAt: "asc" }, include: { user: true, runs: { where: { status: "ACTIVE" }, select: { id: true } } } }),
    db.user.findMany({ where: { character: null }, orderBy: { createdAt: "asc" } }),
  ]);
  return (
    <div>
      <PageHeader title="유저" description="상세에서 수치 수동 조정, 아이템 지급·회수, 진행 중 런 강제 종료를 할 수 있습니다." />
      <section className="panel overflow-x-auto">
        <table className="table">
          <thead><tr><th>이름</th><th>계정</th><th>카테고리</th><th>능력</th><th>Lv</th><th>체력</th><th>정신력</th><th>침식률</th><th>P</th><th>런</th><th>가입</th></tr></thead>
          <tbody>
            {characters.map((c) => {
              const stage = erosionStage(c.erosion, cfg);
              return (
                <tr key={c.id}>
                  <td><Link href={`/admin/users/${c.id}`} className="font-semibold hover:text-accent">{c.name}</Link></td>
                  <td className="text-xs text-fg-dim">{c.user.loginId}{c.user.role === "ADMIN" && <span className="tag tag-warn ml-1">관리자</span>}</td>
                  <td className="text-xs">{CATEGORY_LABEL[c.category]}</td>
                  <td className="text-xs"><span className={`tag ${ABILITY_TAG[c.abilityStatus]}`}>{ABILITY_LABEL[c.abilityStatus]}</span> {c.abilityName}</td>
                  <td className="mono">{c.level}</td>
                  <td className="mono">{c.hp}/{c.maxHp}</td>
                  <td className="mono">{c.mp}/{c.maxMp}</td>
                  <td><span className={`tag ${STAGE_TAG[stage]}`}>{EROSION_STAGE_LABEL[stage]}</span> <span className="mono">{c.erosion}</span></td>
                  <td className="mono text-warn">{c.points}</td>
                  <td>{c.runs.length > 0 && <span className="tag tag-accent">진행 중</span>}</td>
                  <td className="mono text-xs text-fg-mute">{formatKst(c.createdAt)}</td>
                </tr>
              );
            })}
            {characters.length === 0 && <tr><td colSpan={11} className="help text-center">등록된 유저가 없습니다.</td></tr>}
          </tbody>
        </table>
      </section>
      {noCharUsers.length > 0 && (
        <section className="panel mt-4">
          <div className="panel-title">캐릭터를 아직 만들지 않은 계정<span className="code">{noCharUsers.length}</span></div>
          <ul className="divide-y divide-line text-sm">
            {noCharUsers.map((u) => <li key={u.id} className="flex gap-3 px-4 py-2"><span>{u.loginId}</span>{u.role === "ADMIN" && <span className="tag tag-warn">관리자</span>}<span className="mono ml-auto text-xs text-fg-mute">{formatKst(u.createdAt)}</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
