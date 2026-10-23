import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <AuthShell title="접속">
      <LoginForm />
      <p className="help mt-4 text-center">
        처음이라면 <Link href="/install" className="text-accent underline-offset-2 hover:underline">초대 코드로 설치</Link>
      </p>
    </AuthShell>
  );
}
