import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";
import fs from "node:fs/promises";
import { getUploadsRoot, resolveUploadPath } from "@/lib/storage";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  // Try to remove file from disk
  try {
    if (media.url.startsWith("/uploads/")) {
      const root = getUploadsRoot();
      const rel = media.url.replace(/^\/uploads\//, "");
      const filePath = resolveUploadPath(root, rel);
      await fs.unlink(filePath);
    }
  } catch (e) {
    // Non-blocking
    console.warn("Failed to delete file:", e);
  }

  await db.media.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
