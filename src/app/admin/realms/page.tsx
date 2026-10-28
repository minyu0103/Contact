import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { formatKst } from "@/lib/time";
import { createRealmAction, removeInstanceAction, spawnNowAction } from "./actions";

export default async function RealmsPage() {
  const all = await db.realm.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { nodes: true, edges: true, runs: true } }, nodes: { where: { revealedAt: { not: null } }, select: { id: true } }, template: { select: { name: true } }, instances: { select: { id: true, sealedAt: true } } } });
  const realms = all.filter((r) => !r.templateId);
  const instances = all.filter((r) => r.templateId);
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
                <td><Link href={`/admin/realms/${r.id}`} className="font-semibold hover:text-accent">{r.name}</Link>{r.isTemplate && <span className="tag tag-accent ml-2">인스턴트 템플릿</span>}</td>
                <td className="whitespace-nowrap">{r.isPublished ? <span className="tag tag-ok">공개</span> : <span className="tag">비공개</span>}
                  {r.isTemplate && <form action={spawnNowAction} className="mt-1"><input type="hidden" name="templateId" value={r.id} /><button className="btn btn-sm" type="submit">지금 생성</button><span className="help ml-2">활성 {r.instances.filter((i) => !i.sealedAt).length}/{r.maxConcurrent} · {r.spawnIntervalHours}시간</span></form>}</td>
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
      <section className="panel mt-4 overflow-x-auto">
        <div className="panel-title">인스턴트 이계 인스턴스<span className="code">{instances.length}</span></div>
        <table className="table">
          <thead><tr><th>이름</th><th>템플릿</th><th>상태</th><th>생성</th><th>런</th><th></th></tr></thead>
          <tbody>
            {instances.length === 0 && <tr><td colSpan={6} className="help text-center">생성된 인스턴스가 없습니다. 템플릿을 공개하면 주기마다 자동 생성되고, “지금 생성”으로 바로 만들 수도 있습니다.</td></tr>}
            {instances.map((r) => (
              <tr key={r.id}>
                <td><Link href={`/admin/realms/${r.id}`} className="font-semibold hover:text-accent">{r.name}</Link></td>
                <td className="text-xs text-fg-dim">{r.template?.name}</td>
                <td>{r.sealedAt ? <span className="tag">봉합됨 {formatKst(r.sealedAt)}</span> : <span className="tag tag-ok">활성</span>}</td>
                <td className="mono text-xs text-fg-mute">{formatKst(r.createdAt)}</td>
                <td className="mono">{r._count.runs}</td>
                <td><form action={removeInstanceAction}><input type="hidden" name="id" value={r.id} /><ConfirmSubmit message={`"${r.name}"을(를) 제거할까요? 진행 중인 런은 강제 종료됩니다.`}>제거</ConfirmSubmit></form></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
