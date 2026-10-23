import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { createTagAction, deleteTagAction, renameTagAction } from "./actions";

export default async function TagsPage() {
  const tags = await db.abilityTag.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { characters: true } } } });
  return (
    <div>
      <PageHeader title="능력 태그" description="선택지 조건에 쓰는 짧은 키워드입니다 (예: 비행, 투시, 화염). 능력 심사에서 캐릭터에 붙입니다." />
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <section className="panel">
          <div className="panel-title">태그 추가</div>
          <div className="p-4">
            <ActionForm action={createTagAction} submitLabel="추가">
              <div className="field"><label htmlFor="name">태그 이름</label><input id="name" name="name" className="input" maxLength={20} required /></div>
            </ActionForm>
          </div>
        </section>
        <section className="panel">
          <div className="panel-title">태그 목록<span className="code">{tags.length}</span></div>
          <table className="table">
            <thead><tr><th>이름</th><th>보유 캐릭터</th><th></th></tr></thead>
            <tbody>
              {tags.map((t) => (
                <tr key={t.id}>
                  <td>
                    <form action={renameTagAction} className="flex gap-2">
                      <input type="hidden" name="id" value={t.id} />
                      <input name="name" defaultValue={t.name} className="input max-w-[12rem]" maxLength={20} />
                      <button className="btn btn-sm" type="submit">이름 변경</button>
                    </form>
                  </td>
                  <td className="mono">{t._count.characters}</td>
                  <td className="text-right">
                    <form action={deleteTagAction}>
                      <input type="hidden" name="id" value={t.id} />
                      <ConfirmSubmit message={`태그 "${t.name}"을(를) 삭제할까요? 캐릭터 ${t._count.characters}명에게서 제거되고, 이 태그를 조건으로 쓰는 선택지는 충족할 수 없게 됩니다.`}>삭제</ConfirmSubmit>
                    </form>
                  </td>
                </tr>
              ))}
              {tags.length === 0 && <tr><td colSpan={3} className="help text-center">태그가 없습니다.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
