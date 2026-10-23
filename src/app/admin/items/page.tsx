import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { ITEM_CATEGORY_OPTIONS, describeItemEffect, type ItemEffect } from "@/lib/content-types";

export default async function ItemsPage() {
  const items = await db.item.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { inventory: true, dropEntries: true } } } });
  const catLabel = (v: string) => ITEM_CATEGORY_OPTIONS.find((o) => o.value === v)?.label ?? v;
  return (
    <div>
      <PageHeader title="아이템" description="아이템 추가·수정·삭제, 상점 판매 설정, 회수가." action={{ href: "/admin/items/new", label: "+ 새 아이템" }} />
      <section className="panel overflow-x-auto">
        <table className="table">
          <thead><tr><th></th><th>이름</th><th>분류</th><th>효과</th><th>상점</th><th>회수가</th><th>보유/드랍</th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="w-10">
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl} alt="" className="h-8 w-8 border border-line object-cover" />
                  ) : <span className="inline-block h-8 w-8 border border-line bg-bg" />}
                </td>
                <td><Link href={`/admin/items/${it.id}`} className="font-semibold hover:text-accent">{it.name}</Link></td>
                <td className="text-fg-dim">{catLabel(it.category)}</td>
                <td className="text-xs text-fg-dim">{(it.effects as ItemEffect[]).map(describeItemEffect).join(", ") || "-"}</td>
                <td className="mono text-xs">
                  {it.shopEnabled ? <><span className="text-warn">{it.price}P</span>{(it.minLevel > 0 || it.minEscapes > 0) && <span className="text-fg-mute"> · 조건</span>}</> : <span className="text-fg-mute">미판매</span>}
                </td>
                <td className="mono text-xs">{it.sellPrice > 0 ? `${it.sellPrice}P` : <span className="text-fg-mute">불가</span>}</td>
                <td className="mono text-xs text-fg-mute">{it._count.inventory} / {it._count.dropEntries}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={7} className="help text-center">아이템이 없습니다.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
