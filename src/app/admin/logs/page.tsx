import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatKst } from "@/lib/time";
import type { LogStatus, Prisma } from "@prisma/client";

const ST = { PENDING: { l: "심사 중", c: "tag-warn" }, APPROVED: { l: "공개", c: "tag-ok" }, REJECTED: { l: "반려", c: "tag-danger" } } as const;

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const where: Prisma.ExplorationLogWhereInput = status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? { status: status as LogStatus } : {};
  const logs = await db.explorationLog.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200, include: { character: true, realm: true, post: { include: { _count: { select: { reactions: true } } } } } });
  return (
    <div>
      <PageHeader title="로그 심사" description="카메라 로그를 심사하고 분량에 따라 보수를 건별로 지급합니다. 일기 로그는 자동 공개·자동 지급이며 여기서는 열람만 합니다." />
      <div className="mb-3 flex gap-1.5">{[{ v: "", l: "전체" }, { v: "PENDING", l: "심사 중" }, { v: "APPROVED", l: "공개" }, { v: "REJECTED", l: "반려" }].map((f) => <Link key={f.v} href={f.v ? `?status=${f.v}` : "?"} className={`btn btn-sm ${(status ?? "") === f.v ? "btn-primary" : ""}`}>{f.l}</Link>)}</div>
      <section className="panel overflow-x-auto">
        <table className="table">
          <thead><tr><th>상태</th><th>종류</th><th>제목</th><th>작성자</th><th>이계</th><th>공감</th><th>보수</th><th>시각</th><th></th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td><span className={`tag ${ST[l.status].c}`}>{ST[l.status].l}</span></td>
                <td className="text-xs">{l.kind === "DIARY" ? "일기" : "카메라"}</td>
                <td className="font-semibold">{l.title}</td>
                <td className="text-xs">{l.character.name}</td>
                <td className="text-xs text-fg-dim">{l.realm.name}</td>
                <td className="mono text-xs">{l.post._count.reactions}</td>
                <td className="mono text-xs text-warn">{l.rewardPaid}P</td>
                <td className="mono text-xs text-fg-mute">{formatKst(l.createdAt)}</td>
                <td><Link href={`/admin/logs/${l.id}`} className="btn btn-sm">{l.kind === "CAMERA" ? "심사" : "보기"}</Link></td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={9} className="help text-center">로그가 없습니다.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
