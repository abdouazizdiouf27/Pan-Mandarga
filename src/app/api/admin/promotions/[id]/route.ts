import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PUT /api/admin/promotions/[id]
 * Met à jour une promotion + son ciblage (remplace les liaisons existantes).
 *
 * Body : même structure que POST.
 * Les liaisons products/collections sont remplacées (deleteMany + create).
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const body = await req.json();

  const targetType = body.targetType || "all";
  const productIds: string[] = Array.isArray(body.productIds) ? body.productIds : [];
  const collectionIds: string[] = Array.isArray(body.collectionIds) ? body.collectionIds : [];

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

  // Validation backend : ne garde que les IDs existants
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

  // Transaction : update promo + reset liaisons
  await db.$transaction([
    db.promotionProduct.deleteMany({ where: { promotionId: id } }),
    db.promotionCollection.deleteMany({ where: { promotionId: id } }),
  ]);

  const promo = await db.promotion.update({
    where: { id },
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

/**
 * DELETE /api/admin/promotions/[id]
 * Supprime la promotion (Cascade sur les liaisons PromotionProduct/PromotionCollection).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  // Le schéma a onDelete: Cascade sur PromotionProduct/PromotionCollection → auto-delete
  await db.promotion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
