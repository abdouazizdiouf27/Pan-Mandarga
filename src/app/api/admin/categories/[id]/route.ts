import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";
import { slugify } from "@/lib/format";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const body = await req.json();
  const slug = slugify(body.slug?.trim() || body.name);
  if (!slug) return NextResponse.json({ error: "Slug invalide." }, { status: 400 });
  const category = await db.category.update({
    where: { id },
    data: {
      name: body.name,
      slug,
      description: body.description || null,
      parentId: body.parentId || null,
    },
  });
  return NextResponse.json({ category });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  await db.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
