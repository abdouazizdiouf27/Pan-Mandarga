import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-guard";
import { unlink, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ensureUploadsRoot, resolveUploadPath } from "@/lib/storage";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};


export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Vidéo trop volumineuse (max 20 MB)" },
        { status: 413 }
      );
    }

    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: `Type MIME non supporté : ${file.type}. Acceptés : video/mp4, video/webm.` },
        { status: 415 }
      );
    }

    const uploadsRoot = await ensureUploadsRoot();
    const uploadDir = path.join(uploadsRoot, "hero");
    await mkdir(uploadDir, { recursive: true });

    const baseName = `hero-video-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const filename = `${baseName}.${ext}`;
    const fullPath = path.join(uploadDir, filename);

    const buf = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buf);

    const url = `/uploads/hero/${filename}`;
    return NextResponse.json({ url });
  } catch (e: any) {
    console.error("upload-video error:", e);
    return NextResponse.json(
      { error: e.message || "Erreur lors de l'upload vidéo" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { url } = await req.json();
    if (!url || !url.startsWith("/uploads/hero/")) {
      return NextResponse.json({ error: "URL invalide" }, { status: 400 });
    }
    // Chemin sécurisé : on résout relativement à UPLOADS_DIR
    const uploadsRoot = await ensureUploadsRoot();
    const relPath = url.replace(/^\/uploads\//, "");
    let fullPath: string;
    try { fullPath = resolveUploadPath(uploadsRoot, relPath); }
    catch { return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
    try {
      await unlink(fullPath);
    } catch {
      // file may not exist — fine
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
