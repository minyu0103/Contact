import Link from "next/link";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { formatKst } from "@/lib/time";
import { startDmAction } from "../actions";

export default async function DmListPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { character } = await requireCharacterUser();
  const { error } = await searchParams;
  const msgs = await db.directMessage.findMany({ where: { OR: [{ fromId: character.id }, { toId: character.id }] }, orderBy: { createdAt: "desc" }, include: { from: true, to: true } });
  // 상대별 최신 메시지 하나씩
  const threads = new Map<string, { other: { id: string; name: string; imageUrl: string | null }; last: typeof msgs[number]; unread: number }>();
  for (const m of msgs) {
    const other = m.fromId === character.id ? m.to : m.from;
    const t = threads.get(other.id);
    const unread = m.toId === character.id && !m.readAt ? 1 : 0;
    if (!t) threads.set(other.id, { other, last: m, unread }); else t.unread += unread;
  }
  return (
    <section className="panel">
      <div className="panel-title">1:1 대화<span className="code">{threads.size}</span></div>
      <div className="p-4">
        <form action={startDmAction} className="mb-4 flex gap-2">
          <input name="name" className="input max-w-xs" placeholder="유저 이름으로 대화 시작" required />
          <button className="btn btn-sm" type="submit">열기</button>
        </form>
        {error === "notfound" && <p className="error mb-3">그 이름의 유저가 없습니다.</p>}
        <ul className="divide-y divide-line">
          {threads.size === 0 && <li className="help py-2">대화가 없습니다.</li>}
          {[...threads.values()].map(({ other, last, unread }) => (
            <li key={other.id}>
              <Link href={`/community/dm/${other.id}`} className="flex items-center gap-3 py-2.5 hover:text-accent">
                {other.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={other.imageUrl} alt="" className="h-8 w-8 border border-line-2 object-cover" />
                ) : <span className="inline-block h-8 w-8 border border-line-2 bg-bg-3" />}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">{other.name}{unread > 0 && <span className="tag tag-warn">{unread}</span>}</span>
                  <span className="block truncate text-xs text-fg-dim">{last.fromId === character.id ? "나: " : ""}{last.body}</span>
                </span>
                <span className="mono text-xs text-fg-mute">{formatKst(last.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
