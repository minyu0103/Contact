import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/PageHeader";
import { CATEGORY_LABEL } from "@/lib/rules";
import { formatKst } from "@/lib/time";
import type { AbilityStatus, Prisma } from "@prisma/client";

const ABILITY_TAG = { PENDING: "tag-warn", ACTIVE: "tag-ok", RETURNED: "tag-danger" } as const;
const ABILITY_LABEL = { PENDING: "심사 중", ACTIVE: "활성", RETURNED: "반려" } as const;

export default async function AbilitiesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const where: Prisma.CharacterWhereInput = status === "PENDING" || status === "ACTIVE" || status === "RETURNED" ? { abilityStatus: status as AbilityStatus } : {};
  const list = await db.character.findMany({ where, orderBy: [{ abilityStatus: "asc" }, { updatedAt: "desc" }], include: { effects: true, tags: true } });
  const filters: { v?: string; label: string }[] = [{ label: "전체" }, { v: "PENDING", label: "심사 중" }, { v: "RETURNED", label: "반려" }, { v: "ACTIVE", label: "활성" }];
  return (
    <div>
      <PageHeader title="능력 심사" description="유저가 제출한 능력 서술을 확인하고, 효과를 입력한 뒤 승인하거나 코멘트와 함께 반려합니다." />
      <div className="mb-3 flex gap-1.5">
        {filters.map((f) => (
          <Link key={f.label} href={f.v ? `?status=${f.v}` : "?"} className={`btn btn-sm ${status === f.v || (!status && !f.v) ? "btn-primary" : ""}`}>{f.label}</Link>
        ))}
      </div>
      <section className="panel overflow-x-auto">
        <table className="table">
          <thead><tr><th>상태</th><th>유저</th><th>카테고리</th><th>능력</th><th>효과</th><th>태그</th><th>최근 변경</th><th></th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td><span className={`tag ${ABILITY_TAG[c.abilityStatus]}`}>{ABILITY_LABEL[c.abilityStatus]}</span></td>
                <td className="font-semibold">{c.name}</td>
                <td className="text-xs">{CATEGORY_LABEL[c.category]}</td>
                <td>{c.abilityName}</td>
                <td className="mono text-xs">{c.effects.length}</td>
                <td className="mono text-xs">{c.tags.length}</td>
                <td className="mono text-xs text-fg-mute">{formatKst(c.updatedAt)}</td>
                <td className="text-right"><Link href={`/admin/abilities/${c.id}`} className="btn btn-sm">열기</Link></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="help text-center">해당하는 능력이 없습니다.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
