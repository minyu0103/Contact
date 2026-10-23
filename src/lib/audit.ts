import { db } from "./db";
import type { Prisma } from "@prisma/client";

export async function audit(
  actorId: string | null,
  action: string,
  target: { type?: string; id?: string } = {},
  detail?: Prisma.InputJsonValue,
) {
  await db.auditLog.create({
    data: {
      actorId,
      action,
      targetType: target.type ?? "",
      targetId: target.id ?? "",
      detail,
    },
  });
}
