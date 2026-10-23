"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getConfig } from "@/lib/game-config";
import { saveImage } from "@/lib/upload";
import { gameDayKey } from "@/lib/time";
import { audit } from "@/lib/audit";

export type CreateCharacterState = { error?: string } | undefined;

const schema = z.object({
  name: z.string().trim().min(1, "이름을 입력하세요.").max(20, "이름은 20자 이하여야 합니다."),
  category: z.enum(["COMBAT", "SEARCH", "PRODUCTION", "SPECIAL"], { message: "카테고리를 고르세요." }),
  abilityName: z.string().trim().min(1, "능력 이름을 입력하세요.").max(40, "능력 이름은 40자 이하여야 합니다."),
  abilityDesc: z.string().trim().min(10, "능력 서술을 10자 이상 적어 주세요.").max(3000, "능력 서술은 3000자 이하여야 합니다."),
});

export async function createCharacterAction(_prev: CreateCharacterState, formData: FormData): Promise<CreateCharacterState> {
  const user = await requireUser();
  if (user.character) redirect("/home");

  const parsed = schema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    abilityName: formData.get("abilityName"),
    abilityDesc: formData.get("abilityDesc"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const dup = await db.character.findUnique({ where: { name: parsed.data.name } });
  if (dup) return { error: "이미 같은 이름의 유저가 등록되어 있습니다." };

  let imageUrl: string | null = null;
  try {
    const file = formData.get("image");
    imageUrl = await saveImage(file instanceof File ? file : null, "profiles");
  } catch (e) {
    return { error: e instanceof Error ? e.message : "이미지 업로드에 실패했습니다." };
  }

  const cfg = await getConfig();
  const character = await db.character.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      imageUrl,
      category: parsed.data.category,
      abilityName: parsed.data.abilityName,
      abilityDesc: parsed.data.abilityDesc,
      abilityStatus: "PENDING",
      hp: cfg["char.startMaxHp"],
      maxHp: cfg["char.startMaxHp"],
      mp: cfg["char.startMaxMp"],
      maxMp: cfg["char.startMaxMp"],
      ap: cfg["char.dailyAp"],
      points: cfg["char.startPoints"],
      lastDailyResetKey: gameDayKey(),
    },
  });
  await audit(user.id, "character.create", { type: "character", id: character.id }, { name: character.name, category: character.category });
  redirect("/home");
}
