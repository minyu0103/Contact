import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { characterProgress, describeUnlock, isUnlocked, type UnlockCondition } from "@/lib/archive";

const CAT = { REALM: "이계", CREATURE: "이계 생물", INFECTED: "감염물" } as const;

export default async function ArchiveEntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;
  const { user, character } = await requireCharacterUser();
  const [entry, progress, realms, items] = await Promise.all([
    db.archiveEntry.findUnique({ where: { id: entryId }, include: { stages: { orderBy: { sortOrder: "asc" } }, adoptedLog: { include: { character: { select: { name: true } } } } } }),
    characterProgress(character.id),
    db.realm.findMany({ select: { id: true, name: true } }),
    db.item.findMany({ select: { id: true, name: true } }),
  ]);
  if (!entry || (!entry.isPublished && user.role !== "ADMIN")) notFound();
  const names = { realms: new Map(realms.map((r) => [r.id, r.name])), items: new Map(items.map((i) => [i.id, i.name])) };
  return (
    <article className="panel mx-auto max-w-3xl">
      <div className="panel-title">{entry.code && <span className="mono mr-2 text-fg-mute">{entry.code}</span>}{entry.title}<span className="code">{CAT[entry.category]}</span></div>
      <div className="flex flex-col gap-5 p-5">
        {entry.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.imageUrl} alt="" className="max-h-80 w-auto max-w-full border border-line-2 object-contain" />
        )}
        {entry.summary && <p className="whitespace-pre-wrap leading-relaxed text-fg-dim">{entry.summary}</p>}
        {entry.adoptedLog && <p className="text-xs text-fg-mute">이 문서는 <Link href={`/community/logs/${entry.adoptedLog.id}`} className="text-accent">{entry.adoptedLog.character.name}의 카메라 로그</Link>에서 채택되었습니다.</p>}
        {entry.stages.map((st, i) => {
          const conds = st.conditions as UnlockCondition[];
          const open = isUnlocked(conds, progress);
          return (
            <section key={st.id} className={`border p-4 ${open ? "border-line" : "border-line/60 bg-bg/50"}`}>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <span className="mono text-xs text-fg-mute">{String(i + 1).padStart(2, "0")}</span>{st.title}
                {!open && <span className="tag tag-warn ml-auto">열람 제한</span>}
              </p>
              {open ? (
                <p className="whitespace-pre-wrap leading-relaxed">{st.body || <span className="help">(본문 없음)</span>}</p>
              ) : (
                <p className="text-sm text-fg-mute">
                  <span className="mono">[데이터 말소]</span> {st.hint || `해금 조건: ${conds.map((c) => describeUnlock(c, names)).join(", ")}`}
                </p>
              )}
            </section>
          );
        })}
        <Link href="/archive" className="btn btn-sm self-start">← 도감</Link>
      </div>
    </article>
  );
}
