export function ProgramMark({ name, tagline, version, size = "md" }: { name: string; tagline?: string; version?: string; size?: "sm" | "md" | "lg" }) {
  const title = size === "lg" ? "text-3xl tracking-[0.32em]" : size === "md" ? "text-lg tracking-[0.28em]" : "text-[0.95rem] tracking-[0.26em]";
  const mark = size === "lg" ? "h-3.5 w-3.5" : "h-2.5 w-2.5";
  return (
    <div className="flex items-baseline gap-3">
      <div className="flex items-center gap-2.5">
        <span className={`inline-block ${mark} rotate-45 border border-accent bg-accent/25 shadow-[0_0_12px_rgba(114,214,227,0.6)]`} aria-hidden />
        <span className={`mono ${title} font-semibold text-fg`}>{name}</span>
      </div>
      {tagline && size !== "sm" && <span className="hud-label hidden sm:inline">{tagline}</span>}
      {version && <span className="mono text-[0.6rem] text-fg-mute">v{version}</span>}
    </div>
  );
}
