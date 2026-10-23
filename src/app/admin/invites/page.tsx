import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatKst } from "@/lib/time";
import { deleteInviteAction, issueInvitesAction } from "./actions";

export default async function InvitesPage() {
  const codes = await db.inviteCode.findMany({ orderBy: { createdAt: "desc" }, include: { usedBy: { include: { character: true } } } });
  const unused = codes.filter((c) => !c.usedById).length;
  return (
    <div>
      <PageHeader title="초대 코드" description="발급한 코드로만 가입할 수 있습니다. 코드 하나당 계정 하나." />
      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
        <section className="panel">
          <div className="panel-title">코드 발급</div>
          <div className="p-4">
            <ActionForm action={issueInvitesAction} submitLabel="발급">
              <div className="field"><label htmlFor="count">개수</label><input id="count" name="count" type="number" min={1} max={50} defaultValue={1} className="input mono" /></div>
              <div className="field"><label htmlFor="note">메모 (누구에게 줄 코드인지)</label><input id="note" name="note" className="input" maxLength={100} /></div>
            </ActionForm>
          </div>
        </section>
        <section className="panel overflow-x-auto">
          <div className="panel-title">코드 목록<span className="code">미사용 {unused} / 전체 {codes.length}</span></div>
          <table className="table">
            <thead><tr><th>코드</th><th>메모</th><th>상태</th><th>발급</th><th></th></tr></thead>
            <tbody>
              {codes.map((c) => (
                <tr key={c.id}>
                  <td className="mono font-semibold">{c.code}</td>
                  <td className="text-fg-dim">{c.note}</td>
                  <td>
                    {c.usedById ? (
                      <span className="text-xs">
                        <span className="tag">사용됨</span> {c.usedBy?.loginId}{c.usedBy?.character ? ` (${c.usedBy.character.name})` : ""} · {c.usedAt ? formatKst(c.usedAt) : ""}
                      </span>
                    ) : (
                      <span className="tag tag-ok">미사용</span>
                    )}
                  </td>
                  <td className="mono text-xs text-fg-mute">{formatKst(c.createdAt)}</td>
                  <td className="text-right">
                    {!c.usedById && (
                      <form action={deleteInviteAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmSubmit message={`코드 ${c.code}를 삭제할까요?`}>삭제</ConfirmSubmit>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
