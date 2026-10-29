import { z } from "zod";
export const unlockListSchema = z.array(z.discriminatedUnion("type", [
  z.object({ type: z.literal("flag"), flag: z.string().trim().min(1, "플래그 이름을 입력하세요.").max(40) }),
  z.object({ type: z.literal("realm_escapes"), realmId: z.string().min(1, "이계를 고르세요."), count: z.number().int().min(1) }),
  z.object({ type: z.literal("item"), itemId: z.string().min(1, "아이템을 고르세요.") }),
]));
