import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { CATEGORY_LABEL } from "@/lib/rules";
import { createNpcAction, deleteNpcAction, switchToNpcAction } from "./actions";

export default async function AdminNpcsPage() {
  const npcs = await db.character.findMany({ where: { isNpc: true }, orderBy: { createdAt: "asc" }, include: { _count: { select: { posts: true, comments: true, dmSent: true } } } });
  return (
    <div>
      <PageHeader title="위장 NPC" description="정체를 숨긴 아트라하시스 에이전트 등 운영자가 조작하는 캐릭터입니다. '전환'하면 그 캐릭터로 접속되어 타임라인·게시판·대화·탐사를 모두 할 수 있고, 상태 표시줄의 '관리자로 돌아가기'로 복귀합니다. NPC는 심사 대기·위험 단계·보상 대상에서 제외됩니다." />
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <section className="panel self-start"><div className="panel-title">NPC 만들기</div><div className="p-4">
          <ActionForm action={createNpcAction} submitLabel="만들기">
            <div className="field"><label>이름</label><input name="name" className="input" maxLength={20} required /></div>
            <div className="field"><label>카테고리</label><select name="category" className="select" defaultValue="SPECIAL"><option value="COMBAT">전투형</option><option value="SEARCH">탐색형</option><option value="PRODUCTION">생산형</option><option value="SPECIAL">특수형</option></select></div>
            <div className="field"><label>능력 이름 (프로필에 표시)</label><input name="abilityName" className="input" maxLength={40} placeholder="비공개" /></div>
            <div className="field"><label>능력 서술</label><textarea name="abilityDesc" className="textarea" maxLength={3000} /></div>
            <div className="field"><label>프로필 이미지</label><input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="input text-sm" /></div>
          </ActionForm>
        </div></section>
        <section className="panel"><div className="panel-title">NPC 목록<span className="code">{npcs.length}</span></div>
          <ul className="divide-y divide-line text-sm">
            {npcs.length === 0 && <li className="help p-4">NPC가 없습니다.</li>}
            {npcs.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                {n.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={n.imageUrl} alt="" className="h-8 w-8 border border-line-2 object-cover" />
                ) : <span className="inline-block h-8 w-8 border border-line-2 bg-bg-3" />}
                <span className="font-semibold">{n.name}</span><span className="text-xs text-fg-dim">{CATEGORY_LABEL[n.category]} · {n.abilityName}</span>
                <span className="mono text-xs text-fg-mute">글 {n._count.posts} · 댓글 {n._count.comments} · DM {n._count.dmSent}</span>
                <form action={switchToNpcAction} className="ml-auto"><input type="hidden" name="id" value={n.id} /><button className="btn btn-primary btn-sm" type="submit">전환</button></form>
                <form action={deleteNpcAction}><input type="hidden" name="id" value={n.id} /><ConfirmSubmit message={`NPC "${n.name}"을(를) 삭제할까요? 글과 대화도 함께 사라집니다.`}>삭제</ConfirmSubmit></form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
