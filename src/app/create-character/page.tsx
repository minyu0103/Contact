import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { requireUser } from "@/lib/auth";
import { CreateCharacterForm } from "./CreateCharacterForm";

export default async function CreateCharacterPage() {
  const user = await requireUser();
  if (user.character) redirect("/home");
  return (
    <AuthShell title="유저 등록">
      <p className="help mb-4">
        설치가 완료되었습니다. 프로그램이 당신을 식별할 수 있도록 정보를 등록하십시오.
        능력 서술은 운영자의 심사를 거쳐 게임 데이터로 변환됩니다. 심사 중에도 탐사는 가능합니다.
      </p>
      <CreateCharacterForm />
    </AuthShell>
  );
}
