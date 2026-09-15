import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/dashboard/stats?period=7d|30d|4w|month|year
 *
 * Retourne :
 *   - KPIs financiers fixes (aujourd'hui, mois, total, en attente, produits, promos, etc.)
 *   - Série temporelle financière (commandes + CA) selon la période sélectionnée
 *
 * La période n'affecte QUE la série du graphique. Les KPIs "aujourd'hui" / "mois en cours"
 * restent constants — ce sont des indicateurs fixes.
 */

type PeriodKey = "7d" | "30d" | "4w" | "month" | "year";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  "4w": "4 dernières semaines",
  month: "Mois en cours",
  year: "Année en cours",
};

function getRange(period: PeriodKey): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  switch (period) {
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      break;
    case "4w":
      start.setDate(start.getDate() - 27);
      break;
    case "month":
      start.setDate(1);
      break;
    case "year":
      start.setMonth(0, 1);
      break;
  }
  return { start, end };
}

function getBuckets(period: PeriodKey, start: Date, end: Date): { label: string; start: Date; end: Date }[] {
  const buckets: { label: string; start: Date; end: Date }[] = [];
  if (period === "year") {
    // Groupement par mois
    const cur = new Date(start.getFullYear(), 0, 1);
    while (cur <= end) {
      const bStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
      const bEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = bStart.toLocaleDateString("fr-FR", { month: "short" });
      buckets.push({ label, start: bStart, end: bEnd });
      cur.setMonth(cur.getMonth() + 1);
    }
    return buckets;
  }
  // Par jour pour 7d, 30d, 4w, month
  const cur = new Date(start);
  while (cur <= end) {
    const bStart = new Date(cur);
    bStart.setHours(0, 0, 0, 0);
    const bEnd = new Date(cur);
    bEnd.setHours(23, 59, 59, 999);
    const label = bStart.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    buckets.push({ label, start: bStart, end: bEnd });
    cur.setDate(cur.getDate() + 1);
  }
  return buckets;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const periodParam = (req.nextUrl.searchParams.get("period") || "7d") as PeriodKey;
  const validPeriods: PeriodKey[] = ["7d", "30d", "4w", "month", "year"];
  const period = validPeriods.includes(periodParam) ? periodParam : "7d";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // === KPIs fixes (inchangés par période) ===
  const [
    todayOrders,
    todayRevenue,
    monthRevenue,
    pendingOrders,
    activeProducts,
    outOfStock,
    newProducts,
    activePromos,
    totalCustomers,
    totalOrders,
  ] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    db.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: today, lt: tomorrow }, status: { not: "cancelled" } },
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: monthStart }, status: { not: "cancelled" } },
    }),
    db.order.count({ where: { status: { in: ["new", "to_confirm", "confirmed"] } } }),
    db.product.count({ where: { status: "published" } }),
    db.product.count({ where: { availability: "out_of_stock" } }),
    db.product.count({ where: { isNew: true } }),
    db.promotion.count({ where: { active: true } }),
    db.customer.count(),
    db.order.count(),
  ]);

  // === Série financière selon période ===
  const { start, end } = getRange(period);
  const buckets = getBuckets(period, start, end);

  // Récupère toutes les commandes de la période (exclut les annulées)
  const ordersInRange = await db.order.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      status: { not: "cancelled" },
    },
    select: { total: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Agrège par bucket
  const bucketData = buckets.map((b) => {
    const count = ordersInRange.filter(
      (o) => o.createdAt >= b.start && o.createdAt <= b.end
    ).length;
    const revenue = ordersInRange
      .filter((o) => o.createdAt >= b.start && o.createdAt <= b.end)
      .reduce((acc, o) => acc + o.total, 0);
    return {
      date: b.start.toISOString(),
      label: b.label,
      count,
      revenue,
    };
  });

  // Total CA + commandes sur la période
  const periodRevenue = ordersInRange.reduce((acc, o) => acc + o.total, 0);
  const periodOrders = ordersInRange.length;

  return NextResponse.json({
    // KPIs fixes
    todayOrders,
    todayRevenue: todayRevenue._sum.total || 0,
    monthRevenue: monthRevenue._sum.total || 0,
    pendingOrders,
    activeProducts,
    outOfStock,
    newProducts,
    activePromos,
    totalCustomers,
    totalOrders,
    // Série graphique
    period,
    periodLabel: PERIOD_LABELS[period],
    periodRevenue,
    periodOrders,
    series: bucketData,
  });
}
