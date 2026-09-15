"use client";

import * as React from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Users, Eye, Package, FolderTree, FileText } from "lucide-react";
import { PeriodCapsule, type PeriodKey } from "@/components/admin/period-capsule";

// Mêmes 4 périodes que la vue financière pour cohérence visuelle (4 semaines supprimé).
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
];

type TopItem = {
  path: string;
  label: string;
  views: number;
  visitors: number;
};

type SummaryData = {
  period: PeriodKey;
  range: { start: string; end: string; label: string };
  visitors: number;
  pageViews: number;
  productViews: number;
  collectionViews: number;
  dailySeries: { date: string; label: string; visitors: number; pageViews: number }[];
  topProducts: TopItem[];
  topCollections: TopItem[];
  topPages: TopItem[];
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n);
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = React.useState<PeriodKey>("7d");
  const [data, setData] = React.useState<SummaryData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/admin/analytics/summary?period=${period}`, { cache: "no-store" })
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
          setError(e.message || "Erreur de chargement");
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
          {error || "Impossible de charger les données de fréquentation."}
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

  const mainKpis = [
    {
      label: "Visiteurs uniques",
      value: formatNumber(data.visitors),
      icon: Users,
    },
    {
      label: "Pages vues",
      value: formatNumber(data.pageViews),
      icon: Eye,
    },
    {
      label: "Produits consultés",
      value: formatNumber(data.productViews),
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Section heading + period selector */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl md:text-2xl tracking-tight">
            Métriques de fréquentation
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visiteurs, pages vues et contenus les plus consultés — données agrégées anonymes
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <PeriodCapsule
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            tone="accent"
            ariaLabel="Sélecteur de période — métriques de fréquentation"
          />
        </div>
      </div>

      {/* Main KPIs (3 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {mainKpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-xl border border-border/50 bg-card p-4 md:p-6 transition-all duration-300 hover:shadow-premium-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-premium text-muted-foreground font-medium">
                  {kpi.label}
                </p>
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <p className="mt-2 font-serif text-2xl md:text-3xl leading-tight break-words">
                {kpi.value}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground/70">
                {data.range.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Fréquentation chart */}
      <div className="rounded-md border border-border/50 bg-card p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs uppercase tracking-premium text-muted-foreground">
            Visiteurs & pages vues · {data.range.label}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {data.dailySeries.length} points
          </p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.dailySeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--muted-foreground)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--muted-foreground)" stopOpacity={0} />
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
                allowDecimals={false}
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
                  if (name === "Visiteurs") return [formatNumber(Number(value)), "Visiteurs"];
                  return [formatNumber(Number(value)), "Pages vues"];
                }}
              />
              <Area
                type="monotone"
                dataKey="pageViews"
                name="Pages vues"
                stroke="var(--muted-foreground)"
                strokeWidth={1.5}
                fill="url(#colorPageViews)"
              />
              <Area
                type="monotone"
                dataKey="visitors"
                name="Visiteurs"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#colorVisitors)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top products + collections + pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <TopList
          title="Produits les plus consultés"
          icon={Package}
          items={data.topProducts}
          basePath="/products"
          linkPrefix="/admin/products"
          emptyText="Pas encore de consultation de produit sur cette période."
        />
        <TopList
          title="Collections les plus consultées"
          icon={FolderTree}
          items={data.topCollections}
          basePath="/collections"
          linkPrefix="/admin/collections"
          emptyText="Pas encore de consultation de collection sur cette période."
        />
        <TopList
          title="Pages les plus consultées"
          icon={FileText}
          items={data.topPages}
          basePath=""
          linkPrefix=""
          emptyText="Pas encore de consultation de page sur cette période."
          showPath
        />
      </div>

      {/* Privacy note */}
      <p className="text-[10px] text-muted-foreground/60 text-center">
        🔒 Données strictement agrégées et anonymes — aucun nom, email ni identité de visiteur n&apos;est stocké ou affiché.
      </p>
    </div>
  );
}

function TopList({
  title,
  icon: Icon,
  items,
  linkPrefix,
  emptyText,
  showPath = false,
}: {
  title: string;
  icon: any;
  items: TopItem[];
  linkPrefix: string;
  emptyText: string;
  showPath?: boolean;
}) {
  return (
    <div className="rounded-md border border-border/50 bg-card p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="text-xs uppercase tracking-premium text-muted-foreground">
          {title}
        </h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 italic">{emptyText}</p>
      ) : (
        <ol className="space-y-2.5">
          {items.map((item, idx) => (
            <li key={item.path + idx}>
              {linkPrefix ? (
                <Link
                  href={`${linkPrefix}`}
                  className="group flex items-center justify-between gap-3 -mx-1.5 px-1.5 py-1.5 rounded-sm hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-serif text-muted-foreground w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <span className="text-sm truncate group-hover:text-accent transition-colors">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {formatNumber(item.visitors)} uniq.
                    </span>
                    <span className="text-sm font-medium">{formatNumber(item.views)}</span>
                  </div>
                </Link>
              ) : (
                <div className="group flex items-center justify-between gap-3 -mx-1.5 px-1.5 py-1.5 rounded-sm hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-serif text-muted-foreground w-5 shrink-0">
                      {idx + 1}.
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm truncate">{item.label}</div>
                      {showPath && (
                        <div className="text-[9px] text-muted-foreground/70 truncate">
                          {item.path}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium shrink-0">{formatNumber(item.views)}</span>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
