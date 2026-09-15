import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-guard";
import sharp from "sharp";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ensureUploadsRoot, toUploadUrl } from "@/lib/storage";

/**
 * Route d'upload d'image générique — réutilisable pour :
 *   - Produits (médias)
 *   - Image de fond des collections
 *   - Image du Hero
 *   - Tout autre usage image du back-office
 *
 * CORRECTIONS MOBILE :
 *   1. Support HEIC/HEIF (photos iPhone par défaut) — sharp ne le supporte
 *      pas natif sans libheif ; on refuse proprement avec un message clair.
 *   2. Validation stricte : type MIME + extension + magic bytes.
 *   3. Limite de taille explicite (10 MB — couvre photos camera mobile).
 *   4. Gestion d'erreur détaillée : retourne le vrai message d'erreur au
 *      client (pas juste "Erreur").
 *   5. Compression intelligente : redimensionne à 1600px max, WebP qualité 82.
 *   6. Préserve l'orientation EXIF (mobile souvent en paysage).
 *   7. Nom de fichier sécurisé (UUID + extension).
 *
 * Paramètres FormData :
 *   - file: File (obligatoire)
 *   - productId?: string (si upload pour un produit)
 *   - collectionId?: string (si upload pour une collection)
 *   - isMain?: "true" | "false"
 *   - alt?: string
 *   - position?: number
 *   - folder?: string (sous-dossier de /uploads, défaut "products")
 *
 * Réponse :
 *   200 → { url, filename, width, height, size }
 *   400 → { error, code } (fichier manquant / invalide)
 *   413 → { error, code } (trop volumineux)
 *   500 → { error, code } (erreur serveur détaillée)
 */

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/bmp",
  "image/tiff",
]);
const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
  ".heif",
  ".avif",
  ".bmp",
  ".tif",
  ".tiff",
]);

// Détecte si un fichier est HEIC/HEIF (iPhone) — sharp ne le supporte pas
// toujours sans libheif. On refuse proprement avec un message clair.
function isHeic(file: File): boolean {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

// Le stockage est externalisé dans /lib/storage.ts afin d'éviter
// toute dépendance au chemin de build Hostinger.
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  // Limite de taille globale sur la requête (10 MB)
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > MAX_SIZE * 1.5) {
    return NextResponse.json(
      {
        error:
          "Fichier trop volumineux (max 10 Mo). Compressez l'image ou choisissez une plus petite.",
        code: "FILE_TOO_LARGE",
      },
      { status: 413 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e: any) {
    return NextResponse.json(
      {
        error: `Données du formulaire invalides : ${e.message || "parse error"}`,
        code: "INVALID_FORMDATA",
      },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "Aucun fichier fourni.", code: "NO_FILE" },
      { status: 400 }
    );
  }

  // Validation taille fichier
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      {
        error: `Image trop volumineuse (${(file.size / 1024 / 1024).toFixed(1)} Mo). Maximum : 10 Mo.`,
        code: "FILE_TOO_LARGE",
      },
      { status: 413 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "Fichier vide.", code: "EMPTY_FILE" },
      { status: 400 }
    );
  }

  // Validation type MIME
  const type = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(type)) {
    return NextResponse.json(
      {
        error: `Type de fichier non supporté : ${type || "inconnu"}. Formats acceptés : JPG, PNG, WebP, GIF, HEIC/HEIF, AVIF.`,
        code: "UNSUPPORTED_TYPE",
      },
      { status: 400 }
    );
  }

  // Validation extension
  const ext = path.extname(file.name || "").toLowerCase();
  if (ext && !ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      {
        error: `Extension non supportée : ${ext}. Formats acceptés : JPG, PNG, WebP, GIF, HEIC/HEIF, AVIF.`,
        code: "UNSUPPORTED_EXT",
      },
      { status: 400 }
    );
  }

  // Refus HEIC si sharp ne le supporte pas — message clair pour l'utilisateur
  if (isHeic(file)) {
    return NextResponse.json(
      {
        error:
          "Les photos HEIC (iPhone par défaut) ne sont pas supportées par le serveur. Veuillez convertir en JPG ou PNG depuis votre téléphone (Photos > Partager > Exporter en JPG), ou utilisez une photo JPG.",
        code: "HEIC_NOT_SUPPORTED",
      },
      { status: 415 }
    );
  }

  // Paramètres optionnels
  const folder = (formData.get("folder") as string) || "products";
  const alt = (formData.get("alt") as string) || "";
  const position = Number(formData.get("position") || 0);
  const isMain = formData.get("isMain") === "true";
  const productId = (formData.get("productId") as string) || null;

  // Dossier de destination (sécurisé — on n'autorise que des noms simples)
  const safeFolder = /^[a-z0-9-_]+$/i.test(folder) ? folder : "products";
  let uploadsRoot: string;
  let uploadDir: string;
  try {
    uploadsRoot = await ensureUploadsRoot();
    uploadDir = path.join(uploadsRoot, safeFolder);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Stockage non configuré.", code: "STORAGE_NOT_CONFIGURED" }, { status: 500 });
  }

  try {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(uploadDir, { recursive: true });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: `Impossible de créer le dossier d'upload : ${e.message}`,
        code: "MKDIR_FAILED",
      },
      { status: 500 }
    );
  }

  // Traitement sharp
  let buf: Buffer;
  try {
    buf = Buffer.from(await file.arrayBuffer());
  } catch (e: any) {
    return NextResponse.json(
      {
        error: `Lecture du fichier impossible : ${e.message}`,
        code: "READ_FAILED",
      },
      { status: 400 }
    );
  }

  if (buf.length === 0) {
    return NextResponse.json(
      { error: "Buffer vide après lecture.", code: "EMPTY_BUFFER" },
      { status: 400 }
    );
  }

  const filename = `${randomUUID()}.webp`;
  const fullPath = path.join(uploadDir, filename);

  let metadata: { width?: number; height?: number };
  try {
    metadata = await sharp(buf).metadata();
  } catch (e: any) {
    return NextResponse.json(
      {
        error: `Format d'image non reconnu par le processeur d'image. Essayez un JPG ou PNG classique. Détail : ${e.message}`,
        code: "SHARP_METADATA_FAILED",
      },
      { status: 415 }
    );
  }

  try {
    await sharp(buf, {
      failOnError: false,
    })
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toFile(fullPath);

    const url = toUploadUrl(uploadsRoot, fullPath);

    // Si c'est un média produit, on l'enregistre en base
    if (productId || formData.has("productId")) {
      const { db } = await import("@/lib/db");
      if (isMain && productId) {
        await db.media.updateMany({
          where: { productId },
          data: { isMain: false },
        });
      }
      const media = await db.media.create({
        data: {
          productId: productId || null,
          url,
          alt,
          type: "image",
          position,
          isMain,
        },
      });
      if (isMain && productId) {
        await db.product.update({
          where: { id: productId },
          data: { mainImageId: media.id },
        });
      }
    }

    return NextResponse.json({
      url,
      filename,
      width: metadata.width,
      height: metadata.height,
      size: buf.length,
    });
  } catch (e: any) {
    console.error("[upload] sharp processing error:", e);
    return NextResponse.json(
      {
        error: `Échec du traitement de l'image : ${e.message || "erreur sharp"}. Essayez un JPG ou PNG.`,
        code: "SHARP_PROCESS_FAILED",
      },
      { status: 500 }
    );
  }
}

// Expose l'info pour la route de serve (utilisée par /uploads/[...path] en prod)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
