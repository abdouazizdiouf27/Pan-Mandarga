"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, SlidersHorizontal, PackageOpen } from "lucide-react";
import { ProductCard, type ProductCardData } from "@/components/store/product-card";
import { cn } from "@/lib/utils";

type Cat = { id: string; name: string; slug: string };

type Props = {
  products: ProductCardData[];
  categories: Cat[];
};

type SortKey = "relevance" | "price-asc" | "price-desc" | "newest";
type AvailabilityFilter = "all" | "in_stock" | "made_to_order" | "custom" | "out_of_stock";

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Pertinence",
  "price-asc": "Prix croissant",
  "price-desc": "Prix décroissant",
  newest: "Nouveautés",
};

const AVAIL_LABELS: Record<AvailabilityFilter, string> = {
  all: "Toutes disponibilités",
  in_stock: "En stock",
  made_to_order: "Sur commande",
  custom: "Sur mesure",
  out_of_stock: "Épuisé",
};

const PAGE_SIZE = 12;

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function ShopClient({ products, categories }: Props) {
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<string>("");
  const [avail, setAvail] = React.useState<AvailabilityFilter>("all");
  const [sort, setSort] = React.useState<SortKey>("relevance");
  const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);
  const [showFiltersMobile, setShowFiltersMobile] = React.useState(false);

  const filtered = React.useMemo(() => {
    let list = [...products];

    // Search
    if (q.trim()) {
      const qn = normalize(q);
      list = list.filter((p) => {
        const hay = [p.name, p.code].filter(Boolean).join(" ");
        return normalize(hay).includes(qn);
      });
    }

    // Category
    if (cat) {
      list = list.filter((p) => (p as any).categorySlug === cat);
    }

    // Availability
    if (avail !== "all") {
      list = list.filter((p) => p.availability === avail);
    }

    // Sort
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        list.sort((a, b) => ((p as any).createdAt || "").localeCompare((b as any).createdAt || ""));
        // newest first
        list.reverse();
        break;
      case "relevance":
      default:
        // Keep default order
        break;
    }

    return list;
  }, [products, q, cat, avail, sort]);

  // Reset pagination when filters change
  React.useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [q, cat, avail, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  function resetFilters() {
    setQ("");
    setCat("");
    setAvail("all");
    setSort("relevance");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10">
      {/* Sidebar filters — desktop */}
      <aside className="hidden lg:block lg:col-span-3">
        <div className="sticky top-24 space-y-6 rounded-xl border border-border/50 bg-card/55 p-5 shadow-premium-sm">
          <div>
            <p className="text-xs uppercase tracking-premium text-muted-foreground mb-3">
              Catégories
            </p>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setCat("")}
                className={cn(
                  "text-left text-sm px-3 py-2 rounded-sm transition-colors",
                  !cat ? "bg-foreground text-background" : "hover:bg-muted"
                )}
              >
                Toutes
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCat(c.slug)}
                  className={cn(
                    "text-left text-sm px-3 py-2 rounded-sm transition-colors",
                    cat === c.slug ? "bg-foreground text-background" : "hover:bg-muted"
                  )}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-premium text-muted-foreground mb-3">
              Disponibilité
            </p>
            <div className="flex flex-col gap-1">
              {(Object.keys(AVAIL_LABELS) as AvailabilityFilter[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setAvail(key)}
                  className={cn(
                    "text-left text-sm px-3 py-2 rounded-sm transition-colors",
                    avail === key ? "bg-foreground text-background" : "hover:bg-muted"
                  )}
                >
                  {AVAIL_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {(q || cat || avail !== "all") && (
            <button
              onClick={resetFilters}
              className="text-xs uppercase tracking-premium text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕ Réinitialiser les filtres
            </button>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="lg:col-span-9">
        {/* Search + sort + count */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher dans la boutique..."
              className="pl-10"
              aria-label="Recherche dans la boutique"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Effacer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Mobile filters trigger */}
          <Button
            variant="outline"
            className="lg:hidden"
            onClick={() => setShowFiltersMobile((v) => !v)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtres
          </Button>

          {/* Sort */}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Trier par" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile filters panel */}
        {showFiltersMobile && (
          <div className="lg:hidden mb-5 p-4 border border-border/60 rounded-sm space-y-4 bg-card">
            <div>
              <p className="text-xs uppercase tracking-premium text-muted-foreground mb-2">Catégories</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCat("")}
                  className={cn(
                    "px-3 py-1.5 text-xs uppercase tracking-premium border rounded-sm transition-colors",
                    !cat ? "border-foreground bg-foreground text-background" : "border-border/60 hover:border-foreground"
                  )}
                >
                  Toutes
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCat(c.slug)}
                    className={cn(
                      "px-3 py-1.5 text-xs uppercase tracking-premium border rounded-sm transition-colors",
                      cat === c.slug ? "border-foreground bg-foreground text-background" : "border-border/60 hover:border-foreground"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-premium text-muted-foreground mb-2">Disponibilité</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(AVAIL_LABELS) as AvailabilityFilter[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setAvail(key)}
                    className={cn(
                      "px-3 py-1.5 text-xs uppercase tracking-premium border rounded-sm transition-colors",
                      avail === key ? "border-foreground bg-foreground text-background" : "border-border/60 hover:border-foreground"
                    )}
                  >
                    {AVAIL_LABELS[key]}
                  </button>
                ))}
              </div>
            </div>
            {(q || cat || avail !== "all") && (
              <button
                onClick={resetFilters}
                className="text-xs uppercase tracking-premium text-muted-foreground hover:text-foreground transition-colors"
              >
                ✕ Réinitialiser les filtres
              </button>
            )}
          </div>
        )}

        {/* Count */}
        <p className="text-xs uppercase tracking-premium text-muted-foreground mb-5">
          {filtered.length} produit{filtered.length > 1 ? "s" : ""}
        </p>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 md:py-32">
            <div className="mx-auto w-16 h-16 rounded-sm bg-muted flex items-center justify-center">
              <PackageOpen className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mt-6 font-serif text-2xl md:text-3xl">Aucun produit trouvé</h2>
            <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
              Essayez d&apos;élargir vos filtres ou de modifier votre recherche pour découvrir tout le vestiaire.
            </p>
            <div className="mt-8">
              <Button onClick={resetFilters} variant="outline">
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-x-3 sm:gap-x-5 md:gap-x-6 gap-y-8 md:gap-y-10">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 text-center">
                <Button
                  variant="outline"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="h-12 uppercase tracking-premium text-xs px-8"
                >
                  Charger plus de produits
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">
                  {visible.length} / {filtered.length} affichés
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
