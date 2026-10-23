import Link from "next/link";
import { PageHeader } from "@/components/admin/PageHeader";

export default async function TestPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <PageHeader title="테스트 플레이" description="탐사 엔진(4단계)과 함께 연결됩니다. 행동력 소모 없이, 서버 공개·보수·기록에 반영되지 않는 런을 돌릴 수 있게 됩니다." />
      <Link href={`/admin/realms/${id}`} className="btn btn-sm">← 편집기로</Link>
    </div>
  );
}
