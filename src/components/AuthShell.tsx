import { getConfig } from "@/lib/game-config";
import { ProgramMark } from "./ProgramMark";

export async function AuthShell({ children, title }: { children: React.ReactNode; title: string }) {
  const cfg = await getConfig();
  return (
    <main className="grid-bg relative flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center gap-2 text-center">
          <ProgramMark name={cfg["program.name"]} version={cfg["program.version"]} size="lg" />
          <p className="text-xs text-fg-dim">{cfg["program.tagline"]}</p>
        </div>
        <section className="panel">
          <div className="panel-title">{title}</div>
          <div className="p-5 sm:p-6">{children}</div>
        </section>
        <p className="help mt-5 text-center">
          이 프로그램은 조건을 갖춘 기기에 자동으로 설치됩니다. 접근 권한은 사용자의 의지에 따라 부여됩니다.
        </p>
      </div>
    </main>
  );
}
