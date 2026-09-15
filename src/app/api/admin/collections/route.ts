import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";
import { slugify } from "@/lib/format";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const collections = await db.collection.findMany({
    include: { products: { include: { product: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ collections });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const body = await req.json();
  // Toujours slugifier le slug, même si fourni manuellement, pour garantir
  // qu'il est URL-safe (sans accents, espaces, caractères spéciaux).
  const rawSlug = body.slug?.trim() || body.name;
  const slug = slugify(rawSlug);
  if (!slug) {
    return NextResponse.json(
      { error: "Slug invalide — renseignez un nom ou un slug valide." },
      { status: 400 }
    );
  }
  // Vérifie l'unicité du slug
  const existing = await db.collection.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: `Une collection avec le slug « ${slug} » existe déjà.` },
      { status: 409 }
    );
  }
  const collection = await db.collection.create({
    data: {
      name: body.name,
      slug,
      description: body.description || null,
      image: body.image || null,
      published: body.published !== false,
    },
  });
  return NextResponse.json({ collection });
}
