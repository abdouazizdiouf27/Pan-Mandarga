import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: { orderItems: true, customer: true },
  });
  if (!order) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const { id } = await params;
  const body = await req.json();
  const order = await db.order.update({
    where: { id },
    data: {
      status: body.status,
      notes: body.notes,
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerEmail: body.customerEmail,
      customerCity: body.customerCity,
      customerAddress: body.customerAddress,
    },
  });
  return NextResponse.json({ order });
}
