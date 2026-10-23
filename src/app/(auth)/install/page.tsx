import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { BootLog } from "@/components/BootLog";
import { getCurrentUser } from "@/lib/auth";
import { InstallForm } from "./InstallForm";

export default async function InstallPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <AuthShell title="자동 설치">
      <BootLog />
      <InstallForm />
      <p className="help mt-4 text-center">
        이미 설치했다면 <Link href="/login" className="text-accent underline-offset-2 hover:underline">접속</Link>
      </p>
    </AuthShell>
  );
}
