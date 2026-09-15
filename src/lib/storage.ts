import path from "node:path";
import { mkdir } from "node:fs/promises";

/**
 * Persistent upload storage.
 *
 * Hostinger deploys every release into a managed hbuilds/current directory.
 * Therefore production uploads MUST live outside the build directory.
 */
export function getUploadsRoot(): string {
  const configured = process.env.UPLOADS_DIR?.trim();

  if (configured) return path.resolve(configured);

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "UPLOADS_DIR est obligatoire en production. Configurez-le dans les variables d'environnement Hostinger."
    );
  }

  return path.resolve(process.cwd(), "storage", "uploads");
}

export async function ensureUploadsRoot(): Promise<string> {
  const root = getUploadsRoot();
  await mkdir(root, { recursive: true });
  return root;
}

export function toUploadUrl(root: string, absolutePath: string): string {
  const relative = path.relative(root, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Chemin de fichier hors du stockage des uploads.");
  }
  return `/uploads/${relative.split(path.sep).join("/")}`;
}

export function resolveUploadPath(root: string, relativeUrlPath: string): string {
  const normalized = relativeUrlPath.replace(/^[/\\]+/, "");
  const resolved = path.resolve(root, normalized);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("Chemin d'upload interdit.");
  }
  return resolved;
}
