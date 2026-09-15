import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/store/product-card";
import { CollectionViewTracker } from "@/components/store/collection-view-tracker";
import { Button } from "@/components/ui/button";
import { getBestPromosForProducts } from "@/lib/promotions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await db.collection.findUnique({ where: { slug } });
  if (!collection) return { title: "Collection" };
  return {
    title: collection.name,
    description: collection.description || `Collection ${collection.name} — PAN Mandarga`,
  };
}

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const collection = await db.collection.findUnique({
    where: { slug },
    include: {
      products: {
        include: {
          product: {
            include: { images: { orderBy: { position: "asc" } } },
          },
        },
      },
    },
  });
  if (!collection || !collection.published) notFound();

  // Récupère les promos actives pour tous les produits de la collection (batch)
  const productsList = collection.products.map(({ product: p }) => ({ id: p.id, price: p.price }));
  const promoMap = await getBestPromosForProducts(productsList);

  return (
    <>
      <CollectionViewTracker slug={collection.slug} name={collection.name} />
      {/* Hero collection — image de fond configurable depuis /admin/collections */}
      <section className="relative h-[55vh] md:h-[70vh] overflow-hidden bg-foreground">
        {collection.image ? (
          <Image
            src={collection.image}
            alt={collection.name}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          // Fallback : motif géométrique sobre si pas d'image configurée
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, var(--surface-1) 0%, var(--surface-2) 50%, var(--foreground) 100%)",
            }}
            aria-hidden="true"
          />
        )}
        {/* Overlay gradient pour lisibilité du texte — contraste suffisant */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/70" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-background text-center px-6">
          <p className="text-xs tracking-premium-lg uppercase opacity-80 mb-3">Collection</p>
          <h1 className="font-serif text-4xl md:text-6xl">{collection.name}</h1>
          {collection.description && (
            <p className="mt-4 max-w-2xl opacity-90 text-sm md:text-base">
              {collection.description}
            </p>
          )}
        </div>
      </section>

      {/* Products */}
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-premium text-muted-foreground mb-6">
            {collection.products.length} pièce{collection.products.length > 1 ? "s" : ""}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-10">
            {collection.products.map(({ product: p }) => {
              const promo = promoMap.get(p.id);
              return (
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
                    promoInfo: promo
                      ? {
                          promoPrice: promo.promoPrice,
                          originalPrice: promo.originalPrice,
                          discountLabel: promo.discountLabel,
                        }
                      : null,
                  }}
                />
              );
            })}
          </div>
          {collection.products.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground">Cette collection est vide pour le moment.</p>
              <Link href="/collections" className="mt-4 inline-block">
                <Button variant="outline" className="">
                  Toutes les collections
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
