import type { AuthorView } from "@/lib/community";

export function CharacterName({ a, size = "sm" }: { a: AuthorView; size?: "sm" | "md" }) {
  const img = size === "md" ? "h-9 w-9" : "h-6 w-6";
  return (
    <span className="inline-flex items-center gap-2">
      {a.anonymous ? (
        <span className={`inline-flex ${img} items-center justify-center border border-line bg-bg text-[0.6rem] text-fg-mute`}>?</span>
      ) : a.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.imageUrl} alt="" className={`${img} border border-line-2 object-cover`} />
      ) : (
        <span className={`inline-block ${img} border border-line-2 bg-bg-3`} />
      )}
      <span className={`font-semibold ${a.anonymous ? "text-fg-dim" : ""}`}>{a.name}</span>
      {a.badge && <span className="tag tag-accent">{a.badge}</span>}
      {a.realName && <span className="tag tag-warn" title="관리자에게만 보임">실제: {a.realName}</span>}
    </span>
  );
}
