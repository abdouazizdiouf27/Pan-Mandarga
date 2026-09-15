import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const customers = await db.customer.findMany({
    include: { _count: { select: { orders: true } }, orders: { select: { total: true, createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });
  const enriched = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    city: c.city,
    address: c.address,
    createdAt: c.createdAt,
    orderCount: c._count.orders,
    totalSpent: c.orders.reduce((acc, o) => acc + o.total, 0),
  }));
  return NextResponse.json({ customers: enriched });
}
