"use client";

import * as React from "react";
import Image from "next/image";
import { Search, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type CollectionItem = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  productCount: number;
};

/**
 * CollectionPicker — sélection multiple de collections avec recherche.
 * Même logique que ProductPicker mais pour les collections.
 */
export function CollectionPicker({
  initialSelectedIds,
  onConfirm,
  onCancel,
}: {
  initialSelectedIds: string[];
  onConfirm: (ids: string[]) => void;
  onCancel: () => void;
}) {
  const [collections, setCollections] = React.useState<CollectionItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(
    new Set(initialSelectedIds)
  );

  React.useEffect(() => {
    fetch("/api/admin/collections")
      .then(async (r) => {
        if (!r.ok) throw new Error("fetch failed");
        const data = await r.json();
        const items: CollectionItem[] = (data.collections || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          image: c.image || null,
          productCount: c.products?.length ?? 0,
        }));
        setCollections(items);
      })
      .catch(() => setCollections([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return collections;
    const q = search.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return collections.filter((c) =>
      (c.name + " " + c.slug)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .includes(q)
    );
  }, [collections, search]);

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
      <div className="p-3 border-b border-border/60">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une collection..."
            className="pl-9"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-premium">
          {selectedIds.size} collection{selectedIds.size > 1 ? "s" : ""} sélectionnée
          {selectedIds.size > 1 ? "s" : ""} · {filtered.length} résultat
          {filtered.length > 1 ? "s" : ""}
        </p>
      </div>

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
              Aucune collection trouvée.
            </p>
          )}
          {!loading &&
            filtered.map((c) => {
              const isSel = selectedIds.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-2 rounded-sm transition-colors text-left",
                    isSel ? "bg-accent/10 hover:bg-accent/15" : "hover:bg-muted/40"
                  )}
                >
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
                  {c.image ? (
                    <Image
                      src={c.image}
                      alt={c.name}
                      width={50}
                      height={40}
                      className="h-10 w-12 object-cover rounded-sm shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div className="h-10 w-12 bg-muted rounded-sm shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.productCount} produit{c.productCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>
      </ScrollArea>

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
