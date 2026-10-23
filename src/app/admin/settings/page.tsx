import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/ActionForm";
import { SETTING_DEFS, SETTING_GROUPS, getConfig, type SettingDef } from "@/lib/game-config";
import { saveSettingsAction } from "./actions";
import { db } from "@/lib/db";

export default async function SettingsPage() {
  const cfg = await getConfig();
  const overridden = new Set((await db.setting.findMany({ select: { key: true } })).map((s) => s.key));
  return (
    <div>
      <PageHeader title="게임 설정" description="SPEC의 모든 기본값입니다. 저장하면 바로 게임에 반영됩니다. 기본값과 다른 항목은 표시됩니다." />
      <ActionForm action={saveSettingsAction} submitLabel="모두 저장">
        <div className="grid gap-4 lg:grid-cols-2">
          {SETTING_GROUPS.map((group) => (
            <section key={group} className="panel">
              <div className="panel-title">{group}</div>
              <div className="flex flex-col gap-3 p-4">
                {(SETTING_DEFS as readonly SettingDef[]).filter((d) => d.group === group).map((def) => {
                  const value = cfg[def.key as keyof typeof cfg];
                  return (
                    <div key={def.key} className="grid grid-cols-[1fr_9rem] items-center gap-3">
                      <div>
                        <label htmlFor={def.key} className="text-sm">
                          {def.label}
                          {overridden.has(def.key) && <span className="tag tag-accent ml-2">변경됨</span>}
                        </label>
                        {def.help && <p className="help">{def.help}</p>}
                        <p className="mono text-[0.62rem] text-fg-mute">{def.key} · 기본 {String(def.default)}</p>
                      </div>
                      {def.type === "boolean" ? (
                        <label className="flex items-center justify-end gap-2 text-sm">
                          <input id={def.key} name={def.key} type="checkbox" defaultChecked={Boolean(value)} className="h-4 w-4 accent-[var(--accent)]" />
                          켜짐
                        </label>
                      ) : def.type === "number" ? (
                        <input id={def.key} name={def.key} type="number" step={def.step ?? 1} min={def.min} max={def.max} defaultValue={Number(value)} className="input mono text-right" />
                      ) : (
                        <input id={def.key} name={def.key} type="text" defaultValue={String(value)} className="input" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </ActionForm>
    </div>
  );
}
