import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { formatWhatsAppDisplay } from "@/lib/whatsapp";
import { getBestPromosForProducts } from "@/lib/promotions";
import { HeroSection, getHeroSettings } from "@/components/site/hero-section";

export default async function HomePage() {
  const [news, featured, collections, settings, hero] = await Promise.all([
    db.product.findMany({
      where: { isNew: true, status: "published" },
      include: { images: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.product.findMany({
      where: { isFeatured: true, status: "published" },
      include: { images: { orderBy: { position: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    db.collection.findMany({
      where: { published: true },
      orderBy: { createdAt: "asc" },
      take: 4,
    }),
    getSettings(),
    getHeroSettings(),
  ]);

  const whatsapp = settings.whatsapp_number || "221770000000";
  const whatsappDisplay = formatWhatsAppDisplay(whatsapp);

  // Récupère les promos actives pour les produits affichés (news + featured)
  const allProducts = [...news, ...featured];
  const promoMap = await getBestPromosForProducts(
    allProducts.map((p) => ({ id: p.id, price: p.price }))
  );

  return (
    <>
      {/* HERO — image or video, configurable from /admin/settings */}
      <HeroSection settings={hero} />

      {/* NOUVEAUTÉS */}
      <section className="py-section md:py-section-lg px-4 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between mb-8 md:mb-12 gap-4">
            <div>
              <p className="text-xs tracking-premium-lg uppercase text-muted-foreground mb-2">
                Nouveautés
              </p>
              <h2 className="font-serif text-3xl md:text-4xl leading-tight">À découvrir en priorité</h2>
            </div>
            <Link
              href="/collections/collection-nouveautes"
              className="hidden md:inline-flex items-center gap-2 text-xs uppercase tracking-premium text-foreground/70 hover:text-foreground transition-colors"
            >
              Tout voir <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-10">
            {news.map((p) => {
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
            {news.length === 0 && (
              <p className="col-span-full text-muted-foreground text-sm">
                Aucune nouveauté pour le moment.
              </p>
            )}
          </div>
          <div className="mt-10 md:hidden text-center">
            <Link href="/collections/collection-nouveautes">
              <Button variant="outline" className="tracking-premium uppercase text-xs">
                Tout voir
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* STORYTELLING */}
      <section className="py-section md:py-section-lg px-4 md:px-6 bg-surface-1 border-y border-border/40">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs tracking-premium-lg uppercase text-muted-foreground mb-4">
            La maison
          </p>
          <h2 className="font-serif text-4xl md:text-5xl leading-tight">S&apos;habiller c&apos;est s&apos;aimer</h2>
          <div className="mx-auto mt-8 w-16 h-px bg-accent" />
          <p className="mt-8 text-base md:text-lg text-foreground/80 leading-relaxed">
            PAN Mandarga est une maison de mode sénégalaise. Chaque pièce est pensée,
            coupée et cousue au Sénégal, dans la lignée d&apos;un savoir-faire textile ancien.
            Nous croyons à des vêtements qui durent, qui flattent, qui parlent — sans esbroufe,
            avec exigence.
          </p>
          <p className="mt-4 text-base md:text-lg text-foreground/70 leading-relaxed">
            Discrétion, matière, geste : voilà nos seules signatures.
          </p>
          <div className="mt-10">
            <Link href="/about">
              <Button variant="outline" className="tracking-premium uppercase text-xs px-8 h-11">
                Notre histoire
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="py-section md:py-section-lg px-4 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 md:mb-12 text-center">
            <p className="text-xs tracking-premium-lg uppercase text-muted-foreground mb-2">
              Nos collections
            </p>
            <h2 className="font-serif text-3xl md:text-4xl">Le vestiaire PAN Mandarga</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {collections.map((c) => (
              <Link key={c.id} href={`/collections/${c.slug}`} className="group block">
                <div className="relative aspect-[16/10] overflow-hidden bg-muted rounded-md">
                  {c.image ? (
                    <Image
                      src={c.image}
                      alt={c.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-background p-6">
                    <h3 className="font-serif text-2xl md:text-3xl">{c.name}</h3>
                    {c.description && (
                      <p className="mt-2 max-w-md text-sm opacity-85 text-center">
                        {c.description}
                      </p>
                    )}
                    <span className="mt-5 inline-block text-[10px] uppercase tracking-premium-lg border-b border-background/70 pb-1">
                      Découvrir
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAIRES */}
      {featured.length > 0 && (
        <section className="py-section md:py-section-lg px-4 md:px-6 bg-surface-1 border-y border-border/40">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 md:mb-12 text-center">
              <p className="text-xs tracking-premium-lg uppercase text-muted-foreground mb-2">
                Produits populaires
              </p>
              <h2 className="font-serif text-3xl md:text-4xl">Les pièces signatures</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-6 gap-y-10">
              {featured.map((p) => {
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
          </div>
        </section>
      )}

      {/* MADE IN SENEGAL */}
      <section className="py-section md:py-section-lg px-4 md:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-5xl md:text-6xl">🇸🇳</p>
          <h2 className="mt-6 font-serif text-3xl md:text-4xl">Made in Senegal</h2>
          <p className="mt-4 text-base md:text-lg text-foreground/70 leading-relaxed max-w-2xl mx-auto">
            Toutes nos pièces sont confectionnées au Sénégal, dans le respect d&apos;un savoir-faire
            couture hérité et vivant. Acheter PAN Mandarga, c&apos;est soutenir un atelier local,
            une matière noble, et le geste de celles et ceux qui cousent.
          </p>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-accent text-accent-foreground">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-14 md:py-20 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="font-serif text-2xl md:text-4xl">Une question, une commande ?</h2>
            <p className="mt-2 opacity-85 text-sm md:text-base">
              Discutons directement sur WhatsApp — réponse rapide pendant les heures ouvrées.
            </p>
            <p className="mt-1 text-sm font-medium tracking-wide">
              {whatsappDisplay}
            </p>
          </div>
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-background text-foreground px-6 md:px-8 h-12 rounded-sm uppercase tracking-premium text-xs font-medium hover:bg-foreground hover:text-background transition-all duration-200 hover:-translate-y-0.5"
          >
            <MessageCircle className="h-4 w-4" />
            Commander sur WhatsApp
          </a>
        </div>
      </section>
    </>
  );
}
