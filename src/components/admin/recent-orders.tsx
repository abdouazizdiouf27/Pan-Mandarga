"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFCFA, formatDate } from "@/lib/format";

type RecentOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  status: string;
  total: number;
  createdAt: string;
};

/**
 * RecentOrders — liste des 5 dernières commandes (client component).
 *
 * Charge les données depuis /api/admin/orders?take=5 au montage.
 * Affiché sous le bloc financier du dashboard.
 */
export function RecentOrders() {
  const [orders, setOrders] = React.useState<RecentOrder[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/admin/orders?take=5", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error("fetch failed");
        const data = await r.json();
        setOrders(data.orders || []);
      })
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="rounded-md border-border/50">
      <CardHeader>
        <CardTitle className="text-xs uppercase tracking-premium text-muted-foreground">
          5 dernières commandes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {loading && (
            <li className="text-xs text-muted-foreground">Chargement...</li>
          )}
          {!loading && orders.length === 0 && (
            <li className="text-xs text-muted-foreground">Aucune commande pour le moment.</li>
          )}
          {orders.map((o) => (
            <li key={o.id} className="text-sm">
              <Link
                href={`/admin/orders/${o.id}`}
                className="block hover:bg-muted/30 -mx-2 px-2 py-2 rounded-sm transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{o.orderNumber}</span>
                  <Badge
                    variant="secondary"
                    className="rounded-sm text-[10px] uppercase tracking-premium"
                  >
                    {o.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {o.customerName || "—"} · {formatDate(new Date(o.createdAt))}
                </div>
                <div className="text-xs mt-0.5 font-medium">{formatFCFA(o.total)}</div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
