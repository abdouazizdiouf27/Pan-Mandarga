import { NextRequest, NextResponse } from "next/server";
import { createReadStream, stat } from "node:fs";
import path from "node:path";
import { getUploadsRoot, resolveUploadPath } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Route de service des fichiers uploadés en production.
 *
 * En développement : les uploads sont dans /public/uploads et sont servis
 * directement par Next.js (cette route n'est pas appelée car /uploads/* est
 * résolu par le dossier statique).
 *
 * En production : UPLOADS_DIR pointe vers un dossier persistant Hostinger hors hbuilds/current
 * (hors /public, persistant). Cette route stream les fichiers depuis ce
 * dossier vers le client via l'URL /uploads/<subpath>.
 *
 * Sécurité :
 *   - Path traversal bloqué (on ne remonte pas au-dessus de UPLOADS_DIR)
 *   - Seuls les fichiers existants sont servis
 *   - Content-Type deviné via extension
 */

const MIME_BY_EXT: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let uploadsRoot: string;
  let resolved: string;
  const requestedPath = pathSegments.map((s) => decodeURIComponent(s)).join("/");
  try {
    uploadsRoot = getUploadsRoot();
    resolved = resolveUploadPath(uploadsRoot, requestedPath);
  } catch {
    return NextResponse.json({ error: "Stockage non configuré ou chemin interdit" }, { status: 500 });
  }

  // Vérifie que le fichier existe
  let stats;
  try {
    stats = await new Promise<any>((resolve, reject) => {
      stat(resolved, (err, st) => {
        if (err) reject(err);
        else resolve(st);
      });
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!stats.isFile()) {
    return NextResponse.json({ error: "Not a file" }, { status: 404 });
  }

  const ext = path.extname(resolved).toLowerCase();
  const contentType = MIME_BY_EXT[ext] || "application/octet-stream";

  const stream = createReadStream(resolved);
  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Length", String(stats.size));
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  const webStream = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      stream.destroy();
    },
  });

  return new NextResponse(webStream, { status: 200, headers });
}
