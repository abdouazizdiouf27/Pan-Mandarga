import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/api-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/analytics/summary?period=7d|30d|4w|month|year
 *
 * Retourne un résumé agrégé des métriques de fréquentation.
 *
 * Réponse :
 *   {
 *     period: "7d",
 *     range: { start: ISO, end: ISO, label: "7 derniers jours" },
 *     visitors: number,        // visiteurs uniques sur la période
 *     pageViews: number,       // total de page_view sur la période
 *     productViews: number,    // total de product_view
 *     collectionViews: number, // total de collection_view
 *     dailySeries: [{ date, visitors, pageViews }],  // série jour par jour
 *     topProducts: [{ label, path, views, visitors }],  // top 5
 *     topCollections: [...],
 *     topPages: [...]
 *   }
 *
 * Pas de données personnelles — uniquement agrégées.
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
      start.setDate(start.getDate() - 27); // ~4 semaines
      break;
    case "month":
      start.setDate(1); // début du mois courant
      break;
    case "year":
      start.setMonth(0, 1); // 1er janvier
      break;
  }
  return { start, end };
}

// Granularité de la série temporelle selon la période
function getBuckets(period: PeriodKey, start: Date, end: Date): { label: string; start: Date; end: Date }[] {
  const buckets: { label: string; start: Date; end: Date }[] = [];
  if (period === "7d" || period === "30d" || period === "4w") {
    // Groupement par jour
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
  if (period === "month") {
    // Groupement par jour du mois en cours
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
  return buckets;
}

// Libellé humain pour une page
function humanPageLabel(path: string): string {
  if (path === "/" || path === "") return "Accueil";
  if (path === "/shop") return "Boutique";
  if (path === "/collections") return "Collections (liste)";
  if (path.startsWith("/collections/")) return "Collection";
  if (path.startsWith("/products/")) return "Produit";
  if (path === "/cart") return "Panier";
  if (path === "/about") return "À propos";
  if (path === "/search") return "Recherche";
  if (path.startsWith("/admin")) return "Admin";
  return path;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const periodParam = (req.nextUrl.searchParams.get("period") || "7d") as PeriodKey;
  const validPeriods: PeriodKey[] = ["7d", "30d", "4w", "month", "year"];
  const period = validPeriods.includes(periodParam) ? periodParam : "7d";

  const { start, end } = getRange(period);

  // Récupère tous les événements de la période
  // (Pour un site à fort trafic, on devrait utiliser AnalyticsDaily agrégé ;
  //  pour cette V1 on reste sur la table brute qui est petite.)
  const events = await db.analyticsEvent.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    select: {
      type: true,
      path: true,
      label: true,
      visitorId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // === Métriques agrégées ===
  const uniqueVisitors = new Set<string>();
  let pageViews = 0;
  let productViews = 0;
  let collectionViews = 0;

  // Pour les tops : on agrège par path
  const byPathProduct = new Map<string, { views: number; visitors: Set<string>; label: string }>();
  const byPathCollection = new Map<string, { views: number; visitors: Set<string>; label: string }>();
  const byPathPage = new Map<string, { views: number; visitors: Set<string>; label: string }>();

  // Pour la série temporelle : initialise buckets
  const buckets = getBuckets(period, start, end);
  const bucketIndex = new Map<string, { visitors: Set<string>; pageViews: number }>();
  for (const b of buckets) {
    bucketIndex.set(b.label, { visitors: new Set(), pageViews: 0 });
  }

  for (const e of events) {
    if (e.type === "page_view") pageViews++;
    if (e.type === "product_view") productViews++;
    if (e.type === "collection_view") collectionViews++;

    uniqueVisitors.add(e.visitorId);

    // Bucket : on cherche le bucket dont l'intervalle contient e.createdAt
    // (linéaire — pour forte volumétrie on utiliserait un index)
    for (const b of buckets) {
      if (e.createdAt >= b.start && e.createdAt <= b.end) {
        const idx = bucketIndex.get(b.label)!;
        idx.visitors.add(e.visitorId);
        if (e.type === "page_view") idx.pageViews++;
        break;
      }
    }

    // Tops
    if (e.type === "product_view") {
      const key = e.path;
      const cur = byPathProduct.get(key) || { views: 0, visitors: new Set(), label: e.label || humanPageLabel(e.path) };
      cur.views++;
      cur.visitors.add(e.visitorId);
      byPathProduct.set(key, cur);
    } else if (e.type === "collection_view") {
      const key = e.path;
      const cur = byPathCollection.get(key) || { views: 0, visitors: new Set(), label: e.label || humanPageLabel(e.path) };
      cur.views++;
      cur.visitors.add(e.visitorId);
      byPathCollection.set(key, cur);
    } else if (e.type === "page_view") {
      const key = e.path;
      const cur = byPathPage.get(key) || { views: 0, visitors: new Set(), label: e.label || humanPageLabel(e.path) };
      cur.views++;
      cur.visitors.add(e.visitorId);
      byPathPage.set(key, cur);
    }
  }

  // Sérialise les tops (top 5)
  const topProducts = [...byPathProduct.entries()]
    .map(([path, v]) => ({ path, label: v.label, views: v.views, visitors: v.visitors.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const topCollections = [...byPathCollection.entries()]
    .map(([path, v]) => ({ path, label: v.label, views: v.views, visitors: v.visitors.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const topPages = [...byPathPage.entries()]
    .map(([path, v]) => ({ path, label: v.label, views: v.views, visitors: v.visitors.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  // Série temporelle
  const dailySeries = buckets.map((b) => ({
    date: b.start.toISOString(),
    label: b.label,
    visitors: bucketIndex.get(b.label)!.visitors.size,
    pageViews: bucketIndex.get(b.label)!.pageViews,
  }));

  return NextResponse.json({
    period,
    range: {
      start: start.toISOString(),
      end: end.toISOString(),
      label: PERIOD_LABELS[period],
    },
    visitors: uniqueVisitors.size,
    pageViews,
    productViews,
    collectionViews,
    dailySeries,
    topProducts,
    topCollections,
    topPages,
  });
}
