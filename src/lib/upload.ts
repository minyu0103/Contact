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
 * 이미지 업로드.
 * - SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 있으면 Supabase Storage의 "uploads" 공개 버킷에 올린다 (배포 환경).
 * - 없으면 서버 로컬 public/uploads에 저장한다 (로컬 개발).
 * 반환: 공개 URL 또는 null(파일 없음). 오류는 throw.
 */
export async function saveImage(file: File | null, folder: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_BYTES) throw new Error("이미지는 3MB 이하여야 합니다.");
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("PNG, JPG, WEBP, GIF 이미지만 올릴 수 있습니다.");
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const bucket = process.env.SUPABASE_BUCKET ?? "uploads";
    const objectPath = `${folder}/${name}`;
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": file.type, "x-upsert": "false" },
      body: bytes,
    });
    if (!res.ok) throw new Error(`이미지 저장소 오류 (${res.status}). 운영자에게 알려 주세요.`);
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
  }

  const dir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/${folder}/${name}`;
}
