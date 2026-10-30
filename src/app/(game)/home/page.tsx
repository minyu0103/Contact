import Link from "next/link";
import { db } from "@/lib/db";
import { requireCharacterUser } from "@/lib/auth";
import { loadCharacter } from "@/lib/character";
import { getConfig } from "@/lib/game-config";
import { CATEGORY_LABEL, EROSION_STAGE_LABEL, erosionStage, levelUpRequirement } from "@/lib/rules";
import { formatKst } from "@/lib/time";
import { logoutAction } from "@/app/(auth)/actions";
import { pendingOrgInviteCount, unreadDmCount } from "@/lib/community";
import { activeBanners, ensureStoryEvents } from "@/lib/story";

const ABILITY_STATUS = {
  PENDING: { label: "심사 중", cls: "tag-warn", note: "운영자가 능력 서술을 검토하고 있습니다. 심사 중에도 탐사는 가능합니다." },
  ACTIVE: { label: "활성", cls: "tag-ok", note: "능력 데이터가 등록되어 효과가 적용됩니다." },
  RETURNED: { label: "반려", cls: "tag-danger", note: "운영자의 코멘트를 확인하고 유저 화면에서 능력 서술을 수정해 다시 제출하세요." },
} as const;

export default async function HomePage() {
  const { character: raw } = await requireCharacterUser();
  const cfg = await getConfig();
  const character = (await loadCharacter(raw.id, cfg)) ?? raw;
  await ensureStoryEvents();
  const banners = await activeBanners();
  const [activeRun, notices, unread, invites, latest] = await Promise.all([
    db.run.findFirst({ where: { characterId: character.id, status: "ACTIVE", isTest: false }, include: { realm: true } }),
    db.notice.findMany({ orderBy: [{ pinned: "desc" }, { createdAt: "desc" }], take: 5 }),
    unreadDmCount(character.id),
    pendingOrgInviteCount(character.id),
    db.post.findMany({ where: { kind: "TIMELINE" }, orderBy: { createdAt: "desc" }, take: 3, include: { author: { select: { name: true } } } }),
  ]);
  const stage = erosionStage(character.erosion, cfg);
  const status = ABILITY_STATUS[character.abilityStatus];
  const need = levelUpRequirement(character.level, cfg);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {banners.map((b) => (
        <div key={b.id} className="relative overflow-hidden border border-erosion/50 bg-erosion/8 px-5 py-4 lg:col-span-3">
          <p className="hud-label mb-1 text-erosion">프로그램 긴급 알림</p>
          <p className="text-base leading-relaxed">{b.bannerText}</p>
        </div>
      ))}
      <section className="panel lg:col-span-3">
        <div className="panel-title">운영자 공지<span className="code">NOTICE</span></div>
        <ul className="divide-y divide-line">
          {notices.length === 0 && <li className="help p-4">공지가 없습니다.</li>}
          {notices.map((n) => (
            <li key={n.id} className="px-4 py-3.5">
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold">
                {n.pinned && <span className="tag tag-accent">고정</span>}
                {n.title}
                <span className="mono ml-auto text-[0.65rem] font-normal text-fg-mute">{formatKst(n.createdAt)}</span>
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg-dim">{n.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {stage === "WARNING" && (
        <p className="border border-warn/40 bg-warn/8 px-4 py-3 text-sm text-warn lg:col-span-3">
          경고: 침식률이 위험 수준에 근접했습니다. 침식 억제제 사용과 다른 유저와의 교류를 권고합니다. 일부 이계 정보가 차단됩니다.
        </p>
      )}
      {stage === "DANGER" && (
        <p className="border border-danger/50 bg-danger/8 px-4 py-3 text-sm text-danger lg:col-span-3">
          위험: 침식률이 한계를 넘었습니다. 이계 입장이 차단됩니다. 즉시 침식률을 낮추십시오.
        </p>
      )}

      <section className="panel lg:col-span-2">
        <div className="panel-title">상태 요약<span className="code">STATUS</span></div>
        <div className="grid gap-5 p-4 sm:grid-cols-2">
          <div className="flex gap-4">
            {character.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={character.imageUrl} alt="" className="h-20 w-20 border border-line-2 object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center border border-line-2 bg-bg text-[0.65rem] text-fg-mute">NO IMAGE</div>
            )}
            <div>
              <p className="text-lg font-bold">{character.name}</p>
              <p className="text-sm text-fg-dim">{CATEGORY_LABEL[character.category]} · {character.abilityName}</p>
              <p className="mono mt-1.5 text-xs text-fg-mute">Lv.{character.level} · EXP {character.exp}/{need}</p>
              {character.statPoints > 0 && (
                <Link href="/character" className="tag tag-accent mt-2">배분할 스탯 포인트 {character.statPoints}</Link>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
            <dt className="hud-label self-center">침식률</dt>
            <dd className="mono">{character.erosion} <span className="text-fg-dim">· {EROSION_STAGE_LABEL[stage]}</span></dd>
            <dt className="hud-label self-center">행동력</dt>
            <dd className="mono">{character.ap} / {cfg["char.dailyAp"]}</dd>
            <dt className="hud-label self-center">탈출 성공</dt>
            <dd className="mono">{character.escapeCount}회</dd>
            <dt className="hud-label self-center">숙련도</dt>
            <dd className="mono">{character.proficiency} / 5</dd>
          </dl>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">능력 심사<span className="code">REVIEW</span></div>
        <div className="p-4 text-sm">
          <p className="mb-2 flex items-center gap-2">
            <span className={`tag ${status.cls}`}>{status.label}</span>
            <span className="font-semibold">{character.abilityName}</span>
          </p>
          <p className="help">{status.note}</p>
          {character.abilityStatus === "RETURNED" && character.abilityComment && (
            <blockquote className="mt-3 whitespace-pre-wrap border-l-2 border-danger pl-3 text-xs text-fg-dim">{character.abilityComment}</blockquote>
          )}
        </div>
      </section>

      <section className="panel lg:col-span-3">
        <div className="panel-title">진행 중인 탐사<span className="code">RUN</span></div>
        <div className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-center">
          {activeRun ? (
            <>
              <div className="flex-1">
                <p className="font-semibold">{activeRun.realm.name}</p>
                <p className="help">입장 {formatKst(activeRun.startedAt)}. 이계 안에 머무르고 있습니다.</p>
              </div>
              <Link href={`/explore/${activeRun.id}`} className="btn btn-primary">이어서 탐사</Link>
            </>
          ) : (
            <>
              <p className="help flex-1">진행 중인 탐사가 없습니다. 지도에서 이계를 골라 입장하십시오.</p>
              <Link href="/map" className="btn">세계 지도 열기</Link>
            </>
          )}
        </div>
      </section>

      <section className="panel lg:col-span-3">
        <div className="panel-title">교류<span className="code">RP 댓글 오늘 {character.rpCountToday}/{cfg["rp.dailyLimit"]}</span></div>
        <div className="flex flex-col gap-3 p-4 text-sm sm:flex-row sm:items-start">
          <div className="flex flex-col gap-1.5">
            <Link href="/community/dm" className="btn btn-sm">읽지 않은 대화 {unread > 0 && <span className="tag tag-warn">{unread}</span>}</Link>
            <Link href="/community/org" className="btn btn-sm">조직 신청 {invites > 0 && <span className="tag tag-warn">{invites}</span>}</Link>
          </div>
          <ul className="flex-1 divide-y divide-line">
            {latest.length === 0 && <li className="help">타임라인에 아직 글이 없습니다. 사람들과 어울리면 침식률이 내려갑니다.</li>}
            {latest.map((p) => <li key={p.id} className="py-1.5"><Link href="/community/timeline" className="hover:text-accent"><b>{p.author.name}</b> <span className="text-fg-dim">{p.body.slice(0, 80)}</span></Link></li>)}
          </ul>
        </div>
      </section>

      <form action={logoutAction} className="sm:hidden">
        <button className="btn btn-ghost btn-block" type="submit">접속 종료</button>
      </form>
    </div>
  );
}
