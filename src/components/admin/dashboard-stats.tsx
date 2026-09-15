import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFCFA, formatDate, formatDateTime } from "@/lib/format";
import { RecentOrdersChart } from "@/components/admin/recent-orders-chart";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";

async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    todayOrders,
    todayRevenue,
    monthRevenue,
    pendingOrders,
    activeProducts,
    outOfStock,
    newProducts,
    activePromos,
    recentOrders,
    last7Days,
  ] = await Promise.all([
    db.order.count({ where: { createdAt: { gte: today, lt: tomorrow } } }),
    db.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: today, lt: tomorrow },
        status: { not: "cancelled" },
      },
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: {
        createdAt: { gte: monthStart },
        status: { not: "cancelled" },
      },
    }),
    db.order.count({ where: { status: { in: ["new", "to_confirm", "confirmed"] } } }),
    db.product.count({ where: { status: "published" } }),
    db.product.count({ where: { availability: "out_of_stock" } }),
    db.product.count({ where: { isNew: true } }),
    db.promotion.count({ where: { active: true } }),
    db.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { orderItems: true },
    }),
    (async () => {
      // last 7 days buckets
      const days: { date: Date; count: number; revenue: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d0 = new Date(today);
        d0.setDate(d0.getDate() - i);
        const d1 = new Date(d0);
        d1.setDate(d1.getDate() + 1);
        const [count, sum] = await Promise.all([
          db.order.count({
            where: {
              createdAt: { gte: d0, lt: d1 },
              status: { not: "cancelled" },
            },
          }),
          db.order.aggregate({
            _sum: { total: true },
            where: {
              createdAt: { gte: d0, lt: d1 },
              status: { not: "cancelled" },
            },
          }),
        ]);
        days.push({ date: d0, count, revenue: sum._sum.total || 0 });
      }
      return days;
    })(),
  ]);

  return {
    todayOrders,
    todayRevenue: todayRevenue._sum.total || 0,
    monthRevenue: monthRevenue._sum.total || 0,
    pendingOrders,
    activeProducts,
    outOfStock,
    newProducts,
    activePromos,
    recentOrders,
    last7Days: await last7Days,
  };
}

export async function DashboardStats() {
  const s = await getDashboardStats();

  const kpis = [
    { label: "Commandes du jour", value: String(s.todayOrders), tone: "default" as const, delta: null as string | null },
    { label: "CA du jour", value: formatFCFA(s.todayRevenue), tone: "default" as const, delta: null as string | null },
    { label: "CA du mois", value: formatFCFA(s.monthRevenue), tone: "default" as const, delta: null as string | null },
    { label: "Commandes en attente", value: String(s.pendingOrders), tone: "warning" as const, delta: null as string | null },
    { label: "Produits actifs", value: String(s.activeProducts), tone: "default" as const, delta: null as string | null },
    { label: "Ruptures", value: String(s.outOfStock), tone: (s.outOfStock > 0 ? "danger" : "default") as const, delta: null as string | null },
    { label: "Nouveautés", value: String(s.newProducts), tone: "default" as const, delta: null as string | null },
    { label: "Promotions actives", value: String(s.activePromos), tone: "default" as const, delta: null as string | null },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => (
          <Card
            key={kpi.label}
            className="rounded-xl border-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-premium-md"
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] uppercase tracking-premium text-muted-foreground font-medium">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={
                  kpi.tone === "danger"
                    ? "font-serif text-2xl md:text-3xl text-destructive leading-tight"
                    : kpi.tone === "warning"
                    ? "font-serif text-2xl md:text-3xl text-amber-700 dark:text-amber-400 leading-tight"
                    : "font-serif text-2xl md:text-3xl leading-tight"
                }
              >
                {kpi.value}
              </p>
              {kpi.delta && (
                <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                  {kpi.delta}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + Recent orders */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4">
        <Card className="rounded-md border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-premium text-muted-foreground">
              Commandes · 7 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RecentOrdersChart data={s.last7Days} />
          </CardContent>
        </Card>

        <Card className="rounded-md border-border/50">
          <CardHeader>
            <CardTitle className="text-xs uppercase tracking-premium text-muted-foreground">
              5 dernières commandes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {s.recentOrders.length === 0 && (
                <li className="text-xs text-muted-foreground">Aucune commande pour le moment.</li>
              )}
              {s.recentOrders.map((o) => (
                <li key={o.id} className="text-sm">
                  <Link href={`/admin/orders/${o.id}`} className="block hover:bg-muted/30 -mx-2 px-2 py-2 rounded-sm transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{o.orderNumber}</span>
                      <Badge variant="secondary" className="rounded-sm text-[10px] uppercase tracking-premium">{o.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {o.customerName || "—"} · {formatDate(o.createdAt)}
                    </div>
                    <div className="text-xs mt-0.5 font-medium">{formatFCFA(o.total)}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
