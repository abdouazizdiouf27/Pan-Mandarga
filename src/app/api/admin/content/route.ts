import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const contents = await db.content.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ contents });
}

export async function PUT(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const body = await req.json();
  const slug = body.slug || "about";
  const content = await db.content.upsert({
    where: { slug },
    update: { title: body.title, body: body.body },
    create: { slug, title: body.title, body: body.body },
  });
  return NextResponse.json({ content });
}
