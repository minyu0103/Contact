import { PageHeader } from "@/components/admin/PageHeader";
import { ItemForm } from "@/components/admin/ItemForm";

export default function NewItemPage() {
  return (
    <div>
      <PageHeader title="새 아이템" />
      <ItemForm item={null} />
    </div>
  );
}
