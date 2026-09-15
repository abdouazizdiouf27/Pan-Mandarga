import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";
import { slugify } from "@/lib/format";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
      category: true,
      collections: { include: { collection: true } },
    },
  });
  if (!product) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ product });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  try {
    const body = await req.json();
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    const slug = slugify(body.slug?.trim() || body.name);
  if (!slug) return NextResponse.json({ error: "Slug invalide." }, { status: 400 });
    // Check uniqueness (excluding self)
    const conflict = await db.product.findFirst({
      where: { AND: [{ OR: [{ slug }, { code: body.code }] }, { id: { not: id } }] },
    });
    if (conflict) {
      return NextResponse.json({ error: "Slug ou code déjà utilisé" }, { status: 400 });
    }

    // Re-link collections
    if (Array.isArray(body.collectionIds)) {
      await db.productCollection.deleteMany({ where: { productId: id } });
    }

    const product = await db.product.update({
      where: { id },
      data: {
        name: body.name,
        slug,
        code: body.code,
        description: body.description || "",
        price: Number(body.price) || 0,
        compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : null,
        costPrice: body.costPrice ? Number(body.costPrice) : null,
        status: body.status,
        availability: body.availability,
        stock: Number(body.stock) || 0,
        isFeatured: Boolean(body.isFeatured),
        isNew: Boolean(body.isNew),
        categoryId: body.categoryId || null,
        tags: JSON.stringify(body.tags || []),
        material: body.material || "",
        colors: JSON.stringify(body.colors || []),
        sizes: JSON.stringify(body.sizes || ["S", "M", "L", "XL"]),
        customizationEnabled: Boolean(body.customizationEnabled),
        customizationFee: Number(body.customizationFee) || 0,
        customizationInstructions: body.customizationInstructions || null,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        canonicalUrl: body.canonicalUrl || null,
        publishedAt: body.status === "published" && !existing.publishedAt ? new Date() : existing.publishedAt,
        ...(Array.isArray(body.collectionIds)
          ? {
              collections: {
                create: body.collectionIds.map((cid: string) => ({ collectionId: cid })),
              },
            }
          : {}),
      },
      include: { collections: true },
    });

    // Replace variants if provided
    if (Array.isArray(body.variants)) {
      await db.productVariant.deleteMany({ where: { productId: id } });
      for (const v of body.variants) {
        await db.productVariant.create({
          data: {
            productId: id,
            name: v.name,
            sku: v.sku || null,
            price: v.price ? Number(v.price) : null,
            stock: v.stock != null ? Number(v.stock) : null,
            size: v.size || null,
            color: v.color || null,
            customizationOption: v.customizationOption || null,
          },
        });
      }
    }

    return NextResponse.json({ product });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Erreur" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  try {
    await db.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
