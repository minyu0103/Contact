import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function Index() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.character) redirect("/create-character");
  redirect("/home");
}
