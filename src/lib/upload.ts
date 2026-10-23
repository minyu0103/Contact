import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const MAX_BYTES = 3 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

/**
 * 이미지 업로드 (프로토타입: 서버 로컬 public/uploads에 저장).
 * 나중에 Supabase Storage로 바꿀 때 이 함수만 교체하면 된다.
 * 반환: 공개 URL 또는 null(파일 없음). 오류는 throw.
 */
export async function saveImage(file: File | null, folder: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error("이미지는 3MB 이하여야 합니다.");
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("PNG, JPG, WEBP, GIF 이미지만 올릴 수 있습니다.");
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${name}`;
}
