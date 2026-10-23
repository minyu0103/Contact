import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { startTestRunAction } from "./actions";

export default async function TestPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdmin();
  const realm = await db.realm.findUnique({ where: { id } });
  if (!realm) notFound();
  return (
    <div className="max-w-xl">
      <PageHeader title={`테스트 플레이: ${realm.name}`} description="행동력을 쓰지 않고, 서버 공개·보수·기록·실제 캐릭터 수치에 반영되지 않는 런을 돌립니다." />
      <section className="panel"><div className="p-4">
        {!user.character ? (
          <p className="help">테스트 플레이에는 관리자 계정의 캐릭터가 필요합니다 (카테고리와 능력 조건을 평가하기 위해). <Link href="/create-character" className="text-accent">유저 등록</Link>을 먼저 해 주세요.</p>
        ) : (
          <ActionForm action={startTestRunAction} submitLabel="테스트 시작" pendingLabel="시작 중...">
            <input type="hidden" name="realmId" value={realm.id} />
            <div className="field"><label htmlFor="forceResult">판정 결과 강제</label>
              <select id="forceResult" name="forceResult" className="select"><option value="">강제 안 함 (실제 주사위)</option><option value="SUCCESS">모두 성공</option><option value="FAIL">모두 실패</option></select></div>
            <p className="help">테스트 캐릭터: {user.character.name}. 시작 수치는 현재 캐릭터와 같고, 런 중 변화는 캐릭터에 저장되지 않습니다.</p>
          </ActionForm>
        )}
        <Link href={`/admin/realms/${id}`} className="btn btn-sm mt-4">← 편집기로</Link>
      </div></section>
    </div>
  );
}
