import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatKst } from "@/lib/time";

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: p } = await searchParams;
  const page = Math.max(1, Number(p) || 1);
  const take = 100;
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, include: { actor: true }, skip: (page - 1) * take, take }),
    db.auditLog.count(),
  ]);
  return (
    <div>
      <PageHeader title="변경 기록" description={`수동 조정, 지급, 설정 변경 내역. 총 ${total}건`} />
      <section className="panel overflow-x-auto">
        <table className="table">
          <thead><tr><th>시각</th><th>누가</th><th>무엇을</th><th>대상</th><th>상세</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="mono whitespace-nowrap text-xs">{formatKst(l.createdAt, true)}</td>
                <td>{l.actor?.loginId ?? "-"}</td>
                <td className="mono text-xs">{l.action}</td>
                <td className="text-xs text-fg-dim">{l.targetType}{l.targetId ? ` · ${l.targetId.slice(0, 8)}` : ""}</td>
                <td><pre className="mono max-w-xl whitespace-pre-wrap break-all text-[0.68rem] text-fg-dim">{l.detail ? JSON.stringify(l.detail, null, 0) : ""}</pre></td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="help text-center">기록이 없습니다.</td></tr>}
          </tbody>
        </table>
      </section>
      {total > take && (
        <div className="mt-3 flex gap-2">
          {page > 1 && <a className="btn btn-sm" href={`?page=${page - 1}`}>이전</a>}
          {page * take < total && <a className="btn btn-sm" href={`?page=${page + 1}`}>다음</a>}
        </div>
      )}
    </div>
  );
}
