import Link from "next/link";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { characterProgress, isUnlocked, type UnlockCondition } from "@/lib/archive";

const CAT = { REALM: "이계", CREATURE: "이계 생물", INFECTED: "감염물" } as const;

export default async function ArchivePage() {
  const { character } = await requireCharacterUser();
  const [entries, progress] = await Promise.all([
    db.archiveEntry.findMany({ where: { isPublished: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }], include: { stages: { orderBy: { sortOrder: "asc" }, select: { conditions: true } }, adoptedLog: { include: { character: { select: { name: true } } } } } }),
    characterProgress(character.id),
  ]);
  const groups = (["REALM", "CREATURE", "INFECTED"] as const).map((c) => ({ c, list: entries.filter((e) => e.category === c) }));
  return (
    <div className="flex flex-col gap-4">
      <p className="help">이상현상 아카이브. 조사 정도에 따라 문서가 단계적으로 해금됩니다. 이계를 탐사하고 단서를 모을수록 더 많이 읽을 수 있습니다.</p>
      {groups.map(({ c, list }) => (
        <section key={c} className="panel">
          <div className="panel-title">{CAT[c]}<span className="code">{list.length}</span></div>
          <ul className="divide-y divide-line">
            {list.length === 0 && <li className="help p-4">등록된 문서가 없습니다.</li>}
            {list.map((e) => {
              const unlocked = e.stages.filter((s) => isUnlocked(s.conditions as UnlockCondition[], progress)).length;
              return (
                <li key={e.id} className="px-4 py-3">
                  <Link href={`/archive/${e.id}`} className="flex flex-wrap items-center gap-2 hover:text-accent">
                    {e.code && <span className="mono text-xs text-fg-mute">{e.code}</span>}
                    <span className="font-semibold">{e.title}</span>
                    <span className="mono ml-auto text-xs text-fg-dim">해금 {unlocked}/{e.stages.length}</span>
                  </Link>
                  <p className="help line-clamp-1">{e.summary}{e.adoptedLog && ` · 기록: ${e.adoptedLog.character.name}`}</p>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
