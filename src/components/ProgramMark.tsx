export function ProgramMark({ name, tagline, version, size = "md" }: { name: string; tagline?: string; version?: string; size?: "sm" | "md" | "lg" }) {
  const title = size === "lg" ? "text-4xl" : size === "md" ? "text-xl" : "text-base";
  return (
    <div className="flex items-end gap-3">
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rotate-45 border border-accent bg-accent/20 shadow-[0_0_10px_var(--accent)]" aria-hidden />
        <span className={`${title} font-bold tracking-[0.3em] text-fg`}>{name}</span>
      </div>
      {tagline && size !== "sm" && (
        <span className="hud-label pb-1 hidden sm:inline">{tagline}</span>
      )}
      {version && <span className="mono pb-1 text-[0.6rem] text-fg-mute">v{version}</span>}
    </div>
  );
}
