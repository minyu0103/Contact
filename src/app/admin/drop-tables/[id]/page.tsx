import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { DropEntriesEditor } from "@/components/admin/DropEntriesEditor";
import { deleteDropTableAction, saveDropTableAction } from "../actions";

export default async function DropTablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [table, items] = await Promise.all([
    db.dropTable.findUnique({ where: { id }, include: { entries: true } }),
    db.item.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  if (!table) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title={`드랍 테이블: ${table.name}`} />
      <section className="panel">
        <div className="p-4">
          <ActionForm
            action={saveDropTableAction}
            extraButtons={<ConfirmSubmit formAction={deleteDropTableAction} message={`"${table.name}" 테이블을 삭제할까요? 이 테이블을 쓰는 결과 효과는 아무것도 주지 않게 됩니다.`}>삭제</ConfirmSubmit>}
          >
            <input type="hidden" name="id" value={table.id} />
            <div className="field"><label htmlFor="name">이름</label><input id="name" name="name" className="input max-w-sm" defaultValue={table.name} maxLength={40} required /></div>
            <DropEntriesEditor items={items} initial={table.entries.map((e) => ({ itemId: e.itemId ?? "", weight: e.weight, minQty: e.minQty, maxQty: e.maxQty }))} />
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
