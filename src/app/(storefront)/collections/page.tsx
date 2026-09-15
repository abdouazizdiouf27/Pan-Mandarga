import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Collections",
  description:
    "Découvrez les collections PAN Mandarga — pièces made in Senegal, confectionnées avec soin.",
};

export default async function CollectionsPage() {
  const collections = await db.collection.findMany({
    where: { published: true },
    include: {
      products: { include: { product: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <section className="px-4 md:px-6 pt-16 md:pt-24 pb-8 md:pb-12">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-xs tracking-premium-lg uppercase text-muted-foreground mb-3">
            Le vestiaire
          </p>
          <h1 className="font-serif text-4xl md:text-6xl">Collections</h1>
          <p className="mt-4 max-w-2xl mx-auto text-foreground/70 text-sm md:text-base">
            Des pièces pensées et cousues au Sénégal. Découvrez nos collections par saison
            et par thématique.
          </p>
        </div>
      </section>

      <section className="px-4 md:px-6 pb-24">
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
          {collections.map((c) => (
            <Link key={c.id} href={`/collections/${c.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden bg-muted rounded-md">
                {c.image ? (
                  <Image
                    src={c.image}
                    alt={c.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-end text-background p-6 md:p-8 text-center">
                  <h2 className="font-serif text-2xl md:text-3xl">{c.name}</h2>
                  {c.description && (
                    <p className="mt-2 text-sm opacity-85 max-w-md">{c.description}</p>
                  )}
                  <span className="mt-5 inline-block text-[10px] uppercase tracking-premium-lg border-b border-background/70 pb-1">
                    Découvrir — {c.products.length} pièce{(c.products.length > 1 ? "s" : "")}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {collections.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Aucune collection pour le moment.</p>
            <Link href="/" className="mt-4 inline-block">
              <Button variant="outline" className="">
                Retour à l&apos;accueil
              </Button>
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
