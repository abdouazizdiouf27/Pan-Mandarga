import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";
import { slugify } from "@/lib/format";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const categories = await db.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const body = await req.json();
  const slug = slugify(body.slug?.trim() || body.name);
  if (!slug) return NextResponse.json({ error: "Slug invalide." }, { status: 400 });
  const category = await db.category.create({
    data: {
      name: body.name,
      slug,
      description: body.description || null,
      parentId: body.parentId || null,
    },
  });
  return NextResponse.json({ category });
}
