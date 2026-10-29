import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ArchiveEntryForm } from "@/components/admin/ArchiveEntryForm";

export default async function NewArchivePage() {
  const logs = await db.explorationLog.findMany({ where: { kind: "CAMERA", status: "APPROVED", archiveEntry: null }, include: { character: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="max-w-3xl">
      <PageHeader title="새 문서" description="만든 뒤 단계를 추가하고 해금 조건을 붙입니다." />
      <section className="panel"><div className="p-4"><ArchiveEntryForm entry={null} logs={logs.map((l) => ({ id: l.id, title: l.title, author: l.character.name }))} /></div></section>
    </div>
  );
}
