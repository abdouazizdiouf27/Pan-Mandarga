import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

/**
 * GET /api/admin/products/[id]/media
 * Retourne toutes les images (médias) d'un produit, triées par position.
 *
 * Utilisé après un upload via ImageUploader pour rafraîchir la liste
 * des médias affichés dans le product-editor.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  const images = await db.media.findMany({
    where: { productId: id },
    orderBy: [{ isMain: "desc" }, { position: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({
    images: images.map((m) => ({
      id: m.id,
      url: m.url,
      alt: m.alt,
      type: m.type,
      isMain: m.isMain,
      position: m.position,
    })),
  });
}
