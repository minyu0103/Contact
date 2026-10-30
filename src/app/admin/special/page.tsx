import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatKst } from "@/lib/time";

const ST = { PENDING: { l: "심사 중", c: "tag-warn" }, APPROVED: { l: "승인", c: "tag-ok" }, REJECTED: { l: "반려", c: "tag-danger" } } as const;

export default async function AdminSpecialPage() {
  const apps = await db.specialApplication.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: { character: true, realm: { include: { _count: { select: { nodes: true } } } } } });
  return (
    <div>
      <PageHeader title="특수형 이계" description="진입 신청을 승인하면 신청자 전용 이계(비공개)가 만들어지고 편집기로 이동합니다. 노드를 구성한 뒤 공개하면 신청자가 들어갈 수 있습니다. 보고서 공개 여부와 1등(정식 공략 루트), 보수는 상세에서 정합니다." />
      <section className="panel overflow-x-auto">
        <table className="table">
          <thead><tr><th>상태</th><th>제목</th><th>신청자</th><th>이계</th><th>보고서</th><th>보수</th><th>신청</th><th></th></tr></thead>
          <tbody>
            {apps.length === 0 && <tr><td colSpan={8} className="help text-center">신청이 없습니다.</td></tr>}
            {apps.map((a) => (
              <tr key={a.id}>
                <td><span className={`tag ${ST[a.status].c}`}>{ST[a.status].l}</span>{a.isWinner && <span className="tag tag-accent ml-1">1등</span>}</td>
                <td className="font-semibold">{a.title}</td>
                <td className="text-xs">{a.character.name}</td>
                <td className="text-xs">{a.realm ? <Link href={`/admin/realms/${a.realm.id}`} className="text-accent">편집기 (노드 {a.realm._count.nodes}, {a.realm.isPublished ? "공개" : "비공개"})</Link> : "-"}</td>
                <td className="text-xs">{a.isReportPublic ? "공개" : "비공개"}</td>
                <td className="mono text-xs text-warn">{a.rewardPaid}P</td>
                <td className="mono text-xs text-fg-mute">{formatKst(a.createdAt)}</td>
                <td><Link href={`/admin/special/${a.id}`} className="btn btn-sm">심사</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
