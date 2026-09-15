"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

type Cat = { id: string; name: string; slug: string };

export function SearchClient({
  categories,
  initialQ,
  initialCat,
}: {
  categories: Cat[];
  initialQ: string;
  initialCat: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(initialQ);
  const [cat, setCat] = React.useState(initialCat);

  React.useEffect(() => {
    setQ(initialQ);
    setCat(initialCat);
  }, [initialQ, initialCat]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (cat) params.set("cat", cat);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={submit} className="flex gap-2 max-w-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un produit, un code..."
            className="pl-10"
            aria-label="Recherche"
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
        <Button type="submit" className="uppercase tracking-premium text-xs">
          Rechercher
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setCat("");
            const params = new URLSearchParams();
            if (q.trim()) params.set("q", q.trim());
            router.push(`/search?${params.toString()}`);
          }}
          className={`px-3.5 py-1.5 text-xs uppercase tracking-premium border rounded-sm transition-all duration-200 ${
            !cat ? "border-foreground bg-foreground text-background" : "border-border/60 hover:border-foreground"
          }`}
        >
          Toutes
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCat(c.slug);
              const params = new URLSearchParams();
              if (q.trim()) params.set("q", q.trim());
              params.set("cat", c.slug);
              router.push(`/search?${params.toString()}`);
            }}
            className={`px-3.5 py-1.5 text-xs uppercase tracking-premium border rounded-sm transition-all duration-200 ${
              cat === c.slug ? "border-foreground bg-foreground text-background" : "border-border/60 hover:border-foreground"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
