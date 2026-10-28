import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { ActionForm } from "@/components/ActionForm";
import { formatKst } from "@/lib/time";
import { sendDmAction } from "../../actions";

export default async function DmThreadPage({ params }: { params: Promise<{ characterId: string }> }) {
  const { characterId } = await params;
  const { character } = await requireCharacterUser();
  const other = await db.character.findUnique({ where: { id: characterId }, include: { orgMember: { include: { org: true } } } });
  if (!other || other.id === character.id) notFound();
  await db.directMessage.updateMany({ where: { fromId: other.id, toId: character.id, readAt: null }, data: { readAt: new Date() } });
  const msgs = await db.directMessage.findMany({ where: { OR: [{ fromId: character.id, toId: other.id }, { fromId: other.id, toId: character.id }] }, orderBy: { createdAt: "asc" }, take: 200 });
  return (
    <section className="panel">
      <div className="panel-title">{other.name}{other.orgMember?.showBadge && <span className="tag tag-accent ml-2">{other.orgMember.org.name}</span>}<span className="code">DM</span></div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {msgs.length === 0 && <p className="help">첫 메시지를 보내 보세요.</p>}
          {msgs.map((m) => {
            const mine = m.fromId === character.id;
            return (
              <div key={m.id} className={`max-w-[85%] ${mine ? "self-end" : "self-start"}`}>
                <p className={`whitespace-pre-wrap border px-3 py-2 text-sm leading-relaxed ${mine ? "border-accent/40 bg-accent-dim" : "border-line bg-bg"}`}>{m.body}</p>
                <p className={`mono mt-0.5 text-[0.62rem] text-fg-mute ${mine ? "text-right" : ""}`}>{formatKst(m.createdAt)}{mine && m.readAt ? " · 읽음" : ""}</p>
              </div>
            );
          })}
        </div>
        <ActionForm action={sendDmAction} submitLabel="보내기" submitClassName="btn btn-primary btn-sm" className="flex flex-col gap-2">
          <input type="hidden" name="toId" value={other.id} />
          <textarea name="body" className="textarea min-h-[3.5rem]" placeholder="메시지" maxLength={2000} required />
        </ActionForm>
        <Link href="/community/dm" className="btn btn-ghost btn-sm self-start">← 대화 목록</Link>
      </div>
    </section>
  );
}
