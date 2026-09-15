import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";
import { slugify } from "@/lib/format";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const products = await db.product.findMany({
    include: {
      images: { where: { isMain: true }, take: 1 },
      category: true,
      collections: { include: { collection: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json();

    // Generate code if missing
    let code = body.code?.trim();
    if (!code) {
      const count = await db.product.count();
      code = `PAN-${String(count + 1).padStart(3, "0")}`;
    }

    const slug = slugify(body.slug?.trim() || body.name);
  if (!slug) return NextResponse.json({ error: "Slug invalide." }, { status: 400 });

    // Ensure slug/code uniqueness
    const existing = await db.product.findFirst({
      where: { OR: [{ slug }, { code }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Slug ou code déjà utilisé" },
        { status: 400 }
      );
    }

    const product = await db.product.create({
      data: {
        name: body.name,
        slug,
        code,
        description: body.description || "",
        price: Number(body.price) || 0,
        compareAtPrice: body.compareAtPrice ? Number(body.compareAtPrice) : null,
        costPrice: body.costPrice ? Number(body.costPrice) : null,
        status: body.status || "draft",
        availability: body.availability || "made_to_order",
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
        source: body.source || null,
        confidence: body.confidence || null,
        publishedAt: body.status === "published" ? new Date() : null,
        ...(body.collectionIds?.length
          ? {
              collections: {
                create: body.collectionIds.map((cid: string) => ({ collectionId: cid })),
              },
            }
          : {}),
      },
    });

    return NextResponse.json({ product });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || "Erreur" }, { status: 500 });
  }
}
