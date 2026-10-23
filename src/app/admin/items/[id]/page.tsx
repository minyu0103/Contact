import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ItemForm } from "@/components/admin/ItemForm";

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.item.findUnique({ where: { id } });
  if (!item) notFound();
  return (
    <div>
      <PageHeader title={`아이템: ${item.name}`} />
      <ItemForm item={item} />
    </div>
  );
}
