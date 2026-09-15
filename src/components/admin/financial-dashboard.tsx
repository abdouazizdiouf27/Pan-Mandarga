"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { PeriodCapsule, type PeriodKey } from "@/components/admin/period-capsule";

type SeriesPoint = {
  date: string;
  label: string;
  count: number;
  revenue: number;
};

type StatsData = {
  todayOrders: number;
  todayRevenue: number;
  monthRevenue: number;
  pendingOrders: number;
  activeProducts: number;
  outOfStock: number;
  newProducts: number;
  activePromos: number;
  totalCustomers: number;
  totalOrders: number;
  period: PeriodKey;
  periodLabel: string;
  periodRevenue: number;
  periodOrders: number;
  series: SeriesPoint[];
};

// 4 périodes seulement pour la vue financière (4 semaines supprimé).
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
];

function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function formatFCFACompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return String(n);
}

/**
 * FinancialDashboard — bloc Métriques Financières.
 *
 * Affiche :
 *   - 3 KPIs principaux (CA période, Commandes période, Panier moyen)
 *   - KPIs secondaires en grille (aujourd'hui, mois, en attente, etc.)
 *   - Sélecteur de période (7j/30j/4sem/mois/année)
 *   - Graphique d'évolution du CA + Commandes
 *
 * Charge les données depuis /api/admin/dashboard/stats?period=
 * et se met à jour sans recharger la page quand on change de période.
 */
export function FinancialDashboard() {
  const [period, setPeriod] = React.useState<PeriodKey>("7d");
  const [data, setData] = React.useState<StatsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/dashboard/stats?period=${period}`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new Error(e.error || `Erreur ${r.status}`);
        }
        return r.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || "Erreur lors du chargement");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border-border/50 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
        <div className="h-72 rounded-md border-border/50 bg-muted/30 animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">
          {error || "Impossible de charger les données financières."}
        </p>
        <button
          onClick={() => setPeriod(period)}
          className="mt-3 text-xs uppercase tracking-premium underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const panierMoyen = data.periodOrders > 0 ? data.periodRevenue / data.periodOrders : 0;

  const mainKpis = [
    {
      label: `CA · ${data.periodLabel}`,
      value: formatFCFACompact(data.periodRevenue) + " FCFA",
      full: formatFCFALong(data.periodRevenue),
    },
    {
      label: `Commandes · ${data.periodLabel}`,
      value: formatNumber(data.periodOrders),
    },
    {
      label: "Panier moyen",
      value: formatFCFACompact(panierMoyen) + " FCFA",
      full: formatFCFALong(Math.round(panierMoyen)),
    },
  ];

  const secondaryKpis = [
    { label: "Commandes du jour", value: String(data.todayOrders) },
    { label: "CA du jour", value: formatFCFACompact(data.todayRevenue) + " FCFA" },
    { label: "CA du mois", value: formatFCFACompact(data.monthRevenue) + " FCFA" },
    { label: "En attente", value: String(data.pendingOrders) },
    { label: "Produits actifs", value: String(data.activeProducts) },
    { label: "Ruptures", value: String(data.outOfStock) },
  ];

  return (
    <div className="space-y-6">
      {/* Section heading + period selector */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl md:text-2xl tracking-tight">
            Métriques financières
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Performance commerciale et revenus
          </p>
        </div>
        <PeriodCapsule
          options={PERIODS}
          value={period}
          onChange={setPeriod}
          tone="foreground"
          ariaLabel="Sélecteur de période — métriques financières"
        />
      </div>

      {/* Main KPIs (3 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {mainKpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-border/50 bg-card p-4 md:p-6 transition-all duration-300 hover:shadow-premium-sm"
          >
            <p className="text-[10px] uppercase tracking-premium text-muted-foreground font-medium">
              {kpi.label}
            </p>
            <p className="mt-2 font-serif text-2xl md:text-3xl leading-tight break-words">
              {kpi.value}
            </p>
            {kpi.full && (
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                {kpi.full}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-md border border-border/50 bg-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-premium text-muted-foreground">
            Évolution · {data.periodLabel}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {data.series.length} points
          </p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.3} />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatFCFACompact(Number(v))}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "4px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(value: any, name: string) => {
                  if (name === "CA") return [formatFCFALong(Number(value)) + " FCFA", "CA"];
                  return [formatNumber(Number(value)), "Commandes"];
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="CA"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#colorRev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Secondary KPIs grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {secondaryKpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-md border border-border/40 bg-card/50 p-3 text-center"
          >
            <p className="text-[9px] uppercase tracking-premium text-muted-foreground">
              {kpi.label}
            </p>
            <p className="mt-1 font-serif text-base md:text-lg leading-tight break-words">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatFCFALong(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}
