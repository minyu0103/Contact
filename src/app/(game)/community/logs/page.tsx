import Link from "next/link";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { formatKst } from "@/lib/time";

export default async function LogsPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { character } = await requireCharacterUser();
  const { kind } = await searchParams;
  const where = kind === "CAMERA" ? { kind: "CAMERA" as const } : kind === "DIARY" ? { kind: "DIARY" as const } : {};
  const logs = await db.explorationLog.findMany({
    where: { ...where, OR: [{ status: "APPROVED" }, { characterId: character.id }] },
    orderBy: { createdAt: "desc" }, take: 50,
    include: { character: { select: { name: true } }, realm: { select: { name: true } }, node: { select: { name: true } }, post: { include: { _count: { select: { reactions: true, comments: true } } } } },
  });
  return (
    <section className="panel">
      <div className="panel-title">탐사 로그<span className="code">{logs.length}</span></div>
      <div className="flex gap-1.5 px-4 py-2">
        {[{ v: "", l: "전체" }, { v: "DIARY", l: "일기" }, { v: "CAMERA", l: "카메라" }].map((f) => <Link key={f.v} href={f.v ? `?kind=${f.v}` : "?"} className={`btn btn-sm ${(kind ?? "") === f.v ? "btn-primary" : ""}`}>{f.l}</Link>)}
        <span className="help ml-auto self-center">탐사기록 화면에서 쓸 수 있습니다.</span>
      </div>
      <ul className="divide-y divide-line">
        {logs.length === 0 && <li className="help p-4">로그가 없습니다.</li>}
        {logs.map((l) => (
          <li key={l.id} className="px-4 py-3">
            <Link href={`/community/logs/${l.id}`} className="flex flex-wrap items-center gap-2 hover:text-accent">
              <span className="tag">{l.kind === "DIARY" ? "일기" : "카메라"}</span>
              {l.status === "PENDING" && <span className="tag tag-warn">심사 중</span>}{l.status === "REJECTED" && <span className="tag tag-danger">반려</span>}
              <span className="font-semibold">{l.title}</span>
              <span className="text-xs text-fg-dim">{l.character.name} · {l.realm.name}{l.node ? ` · ${l.node.name}` : ""}</span>
              <span className="mono ml-auto text-xs text-fg-mute">◆{l.post._count.reactions} · 댓글 {l.post._count.comments} · {formatKst(l.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
