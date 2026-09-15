import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/promotions
 * Retourne toutes les promotions avec leurs produits/collections ciblés.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const promotions = await db.promotion.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      products: { select: { productId: true } },
      collections: { select: { collectionId: true } },
    },
  });
  return NextResponse.json({ promotions });
}

/**
 * POST /api/admin/promotions
 * Crée une promotion avec ciblage précis.
 *
 * Body :
 *   {
 *     name, type, value, targetType ("product" | "collection" | "all"),
 *     active, startsAt, endsAt,
 *     productIds?: string[],    // si targetType === "product"
 *     collectionIds?: string[] // si targetType === "collection"
 *   }
 *
 * Validation backend :
 *   - Vérifie que les productIds/collectionIds existent réellement
 *   - Ignore silencieusement les IDs inexistants (au lieu de crasher)
 *   - Si targetType "product" mais productIds vide → erreur 400
 *   - Si targetType "collection" mais collectionIds vide → erreur 400
 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const body = await req.json();

  const targetType = body.targetType || "all";
  const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
  const collectionIds: string[] = Array.isArray(body.collectionIds) ? body.collectionIds : [];

  // Validation : si cible product/collection, il faut au moins 1 élément
  if (targetType === "product" && productIds.length === 0) {
    return NextResponse.json(
      { error: "Sélectionnez au moins un produit." },
      { status: 400 }
    );
  }
  if (targetType === "collection" && collectionIds.length === 0) {
    return NextResponse.json(
      { error: "Sélectionnez au moins une collection." },
      { status: 400 }
    );
  }

  // Validation backend : ne garde que les IDs qui existent réellement
  let validProductIds: string[] = [];
  let validCollectionIds: string[] = [];
  if (productIds.length > 0) {
    const found = await db.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });
    validProductIds = found.map((p) => p.id);
  }
  if (collectionIds.length > 0) {
    const found = await db.collection.findMany({
      where: { id: { in: collectionIds } },
      select: { id: true },
    });
    validCollectionIds = found.map((c) => c.id);
  }

  // Crée la promotion + liaisons (transaction)
  const promo = await db.promotion.create({
    data: {
      name: body.name,
      type: body.type,
      value: Number(body.value) || 0,
      targetType,
      targetId: body.targetId || null,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      active: body.active !== false,
      products: validProductIds.length
        ? { create: validProductIds.map((pid) => ({ productId: pid })) }
        : undefined,
      collections: validCollectionIds.length
        ? { create: validCollectionIds.map((cid) => ({ collectionId: cid })) }
        : undefined,
    },
    include: {
      products: { select: { productId: true } },
      collections: { select: { collectionId: true } },
    },
  });

  return NextResponse.json({ promotion: promo });
}
