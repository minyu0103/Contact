import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { createDropTableAction } from "./actions";

export default async function DropTablesPage() {
  const tables = await db.dropTable.findMany({ orderBy: { createdAt: "asc" }, include: { entries: { include: { item: true } } } });
  return (
    <div>
      <PageHeader title="드랍 테이블" description="이름과 항목(아이템, 가중치, 수량 범위)으로 이루어집니다. 여러 노드와 이벤트에서 같은 테이블을 재사용합니다." />
      <form action={createDropTableAction} className="mb-4 flex gap-2">
        <input name="name" className="input max-w-xs" placeholder="새 테이블 이름 (예: 폐병원 잡동사니)" maxLength={40} />
        <button className="btn btn-primary" type="submit">+ 만들기</button>
      </form>
      <section className="panel">
        <table className="table">
          <thead><tr><th>이름</th><th>항목</th></tr></thead>
          <tbody>
            {tables.map((t) => {
              const total = t.entries.reduce((s, e) => s + e.weight, 0);
              return (
                <tr key={t.id}>
                  <td><Link href={`/admin/drop-tables/${t.id}`} className="font-semibold hover:text-accent">{t.name}</Link></td>
                  <td className="text-xs text-fg-dim">
                    {t.entries.length === 0 ? "(비어 있음)" : t.entries.map((e) => `${e.item?.name ?? "없음"} ${total ? Math.round((e.weight / total) * 100) : 0}%`).join(" · ")}
                  </td>
                </tr>
              );
            })}
            {tables.length === 0 && <tr><td colSpan={2} className="help text-center">드랍 테이블이 없습니다.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
