import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { createRealmAction } from "./actions";

export default async function RealmsPage() {
  const realms = await db.realm.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { nodes: true, edges: true, runs: true } }, nodes: { where: { revealedAt: { not: null } }, select: { id: true } } } });
  return (
    <div>
      <PageHeader title="이계" description="고정 이계를 만들고 편집기에서 노드·장면·선택지를 구성합니다. 작성 중에는 비공개로 두세요." />
      <form action={createRealmAction} className="mb-4 flex gap-2">
        <input name="name" className="input max-w-xs" placeholder="새 이계 이름 (예: 폐병원)" maxLength={40} />
        <button className="btn btn-primary" type="submit">+ 만들기</button>
      </form>
      <section className="panel overflow-x-auto">
        <table className="table">
          <thead><tr><th>이름</th><th>상태</th><th>노드</th><th>연결</th><th>진행도</th><th>런</th></tr></thead>
          <tbody>
            {realms.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/realms/${r.id}`} className="font-semibold hover:text-accent">{r.name}</Link></td>
                <td>{r.isPublished ? <span className="tag tag-ok">공개</span> : <span className="tag">비공개</span>}</td>
                <td className="mono">{r._count.nodes}</td>
                <td className="mono">{r._count.edges}</td>
                <td className="mono">{r.nodes.length}/{r._count.nodes}</td>
                <td className="mono">{r._count.runs}</td>
              </tr>
            ))}
            {realms.length === 0 && <tr><td colSpan={6} className="help text-center">이계가 없습니다.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
