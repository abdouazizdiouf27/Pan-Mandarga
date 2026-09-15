import { db } from "@/lib/db";
import { ShopClient } from "@/components/store/shop-client";

export const metadata = {
  title: "Boutique",
  description:
    "Découvrez le vestiaire complet PAN Mandarga — pièces made in Senegal, confectionnées avec soin.",
};

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    db.product.findMany({
      where: { status: "published" },
      include: { images: { orderBy: { position: "asc" } }, category: true },
      orderBy: { createdAt: "asc" },
    }),
    db.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const productCards = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    code: p.code,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    availability: p.availability,
    categorySlug: p.category?.slug ?? "",
    createdAt: p.createdAt.toISOString(),
    images: p.images.map((i) => ({ url: i.url, alt: i.alt, isMain: i.isMain })),
  }));

  return (
    <div className="py-12 md:py-20 px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs tracking-premium-lg uppercase text-muted-foreground">
          Le vestiaire
        </p>
        <h1 className="font-serif text-3xl md:text-5xl mt-1.5 leading-tight">Boutique</h1>
        <p className="mt-4 max-w-2xl text-foreground/70 text-sm md:text-base leading-relaxed">
          Toutes les pièces PAN Mandarga, pensées et cousues au Sénégal. Filtrez par catégorie, par disponibilité, et trouvez la vôtre.
        </p>

        <div className="mt-10">
          <ShopClient products={productCards} categories={categories} />
        </div>
      </div>
    </div>
  );
}
