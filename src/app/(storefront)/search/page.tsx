import Link from "next/link";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/store/product-card";
import { SearchClient } from "@/components/store/search-client";

export const metadata = {
  title: "Recherche",
  description: "Recherchez un produit dans le vestiaire PAN Mandarga.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || "").trim();
  const cat = sp.cat || "";

  // Normalize: strip accents + lowercase so "gainde" matches "GAINDÉ"
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const qNorm = q ? normalize(q) : "";

  const products = await db.product.findMany({
    where: {
      status: "published",
      ...(cat ? { category: { slug: cat } } : {}),
    },
    include: { images: { orderBy: { position: "asc" } }, category: true },
    orderBy: { createdAt: "desc" },
  });

  // Filter by normalized match (accent-insensitive, case-insensitive)
  const filtered = qNorm
    ? products.filter((p) => {
        const hay = [p.name, p.code, p.description].filter(Boolean).join(" ");
        return normalize(hay).includes(qNorm);
      })
    : products;

  const categories = await db.category.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="py-12 md:py-20 px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs tracking-premium-lg uppercase text-muted-foreground">Recherche</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-1 leading-tight">
          {q ? `Résultats pour « ${q} »` : "Rechercher un produit"}
        </h1>

        <SearchClient categories={categories} initialQ={q} initialCat={cat} />

        <p className="mt-8 text-xs uppercase tracking-premium text-muted-foreground mb-4">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Aucun produit trouvé.</p>
            <Link href="/shop" className="mt-4 inline-block">
              <button className="text-sm uppercase tracking-premium border-b border-foreground pb-0.5">
                Visiter la boutique
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-10">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  slug: p.slug,
                  name: p.name,
                  code: p.code,
                  price: p.price,
                  compareAtPrice: p.compareAtPrice,
                  isNew: p.isNew,
                  availability: p.availability,
                  images: p.images.map((i) => ({ url: i.url, alt: i.alt, isMain: i.isMain })),
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
