import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";

const CAT = { REALM: "이계", CREATURE: "이계 생물", INFECTED: "감염물" } as const;

export default async function AdminArchivePage() {
  const entries = await db.archiveEntry.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { stages: true } }, adoptedLog: { include: { character: true } } } });
  return (
    <div>
      <PageHeader title="도감 (이상현상 아카이브)" description="이계·생물·감염물 문서를 SCP 문서풍으로 작성합니다. 단계마다 해금 조건을 붙이면 유저는 조건을 채운 단계까지만 읽습니다." action={{ href: "/admin/archive/new", label: "+ 새 문서" }} />
      <section className="panel overflow-x-auto">
        <table className="table">
          <thead><tr><th>분류</th><th>번호</th><th>제목</th><th>단계</th><th>채택 로그</th><th>상태</th></tr></thead>
          <tbody>
            {entries.length === 0 && <tr><td colSpan={6} className="help text-center">문서가 없습니다. 로그 심사 화면에서 승인된 카메라 로그를 문서로 채택할 수도 있습니다.</td></tr>}
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="text-xs">{CAT[e.category]}</td>
                <td className="mono text-xs">{e.code}</td>
                <td><Link href={`/admin/archive/${e.id}`} className="font-semibold hover:text-accent">{e.title}</Link></td>
                <td className="mono">{e._count.stages}</td>
                <td className="text-xs text-fg-dim">{e.adoptedLog ? `${e.adoptedLog.title} (${e.adoptedLog.character.name})` : "-"}</td>
                <td>{e.isPublished ? <span className="tag tag-ok">공개</span> : <span className="tag">비공개</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
