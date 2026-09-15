"use client";

import * as React from "react";
import Image from "next/image";
import { Search, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatFCFA } from "@/lib/format";

type ProductItem = {
  id: string;
  name: string;
  code?: string | null;
  price: number;
  image: string | null;
  categoryName?: string | null;
};

/**
 * ProductPicker — composant de sélection multiple de produits avec recherche.
 *
 * Fonctionnalités :
 *   - Recherche en temps réel (debounce 200ms)
 *   - Sélection multiple (checkbox)
 *   - Désélection sans fermer la fenêtre
 *   - Conservation de la sélection lors du filtrage par recherche
 *   - Compteur "N produits sélectionnés"
 *   - Boutons Annuler / Sélectionner
 *   - Responsive mobile (scroll-area, liste scrollable)
 *
 * Récupère les produits via /api/admin/products?take=100 (charge une fois au montage).
 * La recherche filtre ensuite côté client (rapide même avec 100+ produits).
 */
export function ProductPicker({
  initialSelectedIds,
  onConfirm,
  onCancel,
}: {
  initialSelectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [products, setProducts] = React.useState<ProductItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    new Set(initialSelectedIds)
  );

  // Charge les produits une fois au montage
  React.useEffect(() => {
    fetch("/api/admin/products?take=200")
      .then(async (r) => {
        if (!r.ok) throw new Error("fetch failed");
        const data = await r.json();
        const items: ProductItem[] = (data.products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          price: p.price,
          image: p.images?.[0]?.url || null,
          categoryName: p.category?.name || p.categoryName || null,
        }));
        setProducts(items);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // Filtre la liste selon la recherche (normalise les accents)
  const filtered = React.useMemo(() => {
    if (!search.trim()) return products;
    const q = search
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return products.filter((p) => {
      const hay = (
        p.name +
        " " +
        (p.code || "") +
        " " +
        (p.categoryName || "")
      )
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      return hay.includes(q);
    });
  }, [products, search]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(Array.from(selectedIds));
  }

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Recherche */}
      <div className="p-3 border-b border-border/60">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="pl-9"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-premium">
          {selectedIds.size} produit{selectedIds.size > 1 ? "s" : ""} sélectionné
          {selectedIds.size > 1 ? "s" : ""} · {filtered.length} résultat
          {filtered.length > 1 ? "s" : ""}
        </p>
      </div>

      {/* Liste */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Chargement...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Aucun produit trouvé.
            </p>
          )}
          {!loading &&
            filtered.map((p) => {
              const isSel = selectedIds.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-sm transition-colors text-left",
                    isSel ? "bg-accent/10 hover:bg-accent/15" : "hover:bg-muted/40"
                  )}
                >
                  {/* Checkbox visuel */}
                  <div
                    className={cn(
                      "h-5 w-5 shrink-0 rounded-sm border-2 grid place-items-center transition-colors",
                      isSel
                        ? "bg-accent border-accent text-accent-foreground"
                        : "border-border/60"
                    )}
                  >
                    {isSel && <Check className="h-3.5 w-3.5" />}
                  </div>
                  {/* Image */}
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name}
                      width={40}
                      height={50}
                      className="h-12 w-10 object-cover rounded-sm shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="h-12 w-10 bg-muted rounded-sm shrink-0" />
                  )}
                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{p.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {p.code && <span>{p.code}</span>}
                      {p.categoryName && <span>· {p.categoryName}</span>}
                    </div>
                  </div>
                  <span className="text-sm font-medium shrink-0">{formatFCFA(p.price)}</span>
                </button>
              );
            })}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 p-3 border-t border-border/60">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Annuler
        </Button>
        <Button size="sm" onClick={handleConfirm}>
          Sélectionner ({selectedIds.size})
        </Button>
      </div>
    </div>
  );
}
