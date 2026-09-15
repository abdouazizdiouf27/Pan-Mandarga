import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const channel = url.searchParams.get("channel");
  const takeParam = url.searchParams.get("take");
  // take optionnel — défaut 100, max 200
  let take = 100;
  if (takeParam) {
    const n = parseInt(takeParam, 10);
    if (!isNaN(n) && n > 0 && n <= 200) take = n;
  }

  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(channel ? { channel } : {}),
    },
    include: { orderItems: true, customer: true },
    orderBy: { createdAt: "desc" },
    take,
  });
  return NextResponse.json({ orders });
}
