"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { formatFCFA } from "@/lib/format";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { toast } from "sonner";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  code: string;
  price: number;
  compareAtPrice?: number | null;
  isNew?: boolean;
  isFeatured?: boolean;
  availability?: string;
  images?: { url: string; alt: string; isMain?: boolean }[];
  mainImage?: { url: string; alt: string } | null;
  // Promotion active (calculée côté serveur)
  promoInfo?: {
    promoPrice: number;
    originalPrice: number;
    discountLabel: string;
  } | null;
};

const AVAIL_LABELS: Record<string, { label: string; tone: string }> = {
  in_stock: { label: "En stock", tone: "text-emerald-700 dark:text-emerald-400" },
  made_to_order: { label: "Sur commande", tone: "text-amber-700 dark:text-amber-400" },
  custom: { label: "Sur mesure", tone: "text-amber-700 dark:text-amber-400" },
  out_of_stock: { label: "Épuisé", tone: "text-destructive" },
};

function AddToCartButton({ product }: { product: ProductCardData }) {
  const addItem = useCartStore((s) => s.addItem);
  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (product.availability === "out_of_stock") {
      toast.error("Produit épuisé");
      return;
    }
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantId: undefined,
      variantName: undefined,
      size: undefined,
      color: undefined,
      quantity: 1,
      unitPrice: product.promoInfo ? product.promoInfo.promoPrice : product.price,
      customization: false,
      customizationDetails: undefined,
      customizationFee: 0,
      image: product.images?.[0]?.url ?? "",
      lineKey: `${product.id}|default|any|any|nocust`,
    });
    toast.success("Ajouté au panier", {
      description: `${product.name} × 1`,
    });
  }
  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={`Ajouter ${product.name} au panier`}
      className="absolute bottom-3 right-3 inline-flex items-center justify-center h-9 w-9 rounded-sm bg-background/95 backdrop-blur text-foreground shadow-premium-md hover:bg-foreground hover:text-background transition-all duration-200 hover:-translate-y-0.5"
    >
      <ShoppingBag className="h-4 w-4" />
    </button>
  );
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const img = product.images?.find((i) => i.isMain) || product.images?.[0] || product.mainImage;
  const href = `/products/${product.slug}`;
  const avail = product.availability ? AVAIL_LABELS[product.availability] : null;
  const soldOut = product.availability === "out_of_stock";

  return (
    <Link
      href={href}
      className="group block min-w-0"
      aria-label={`Voir le produit ${product.name}`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-muted/70 rounded-xl">
        {img ? (
          <Image
            src={img.url}
            alt={img.alt || product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Image à venir
          </div>
        )}

        {/* Top-left badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isNew && (
            <Badge variant="default" className="bg-foreground text-background rounded-sm px-2.5 py-0.5 text-[10px] tracking-premium uppercase font-medium">
              Nouveau
            </Badge>
          )}
          {product.promoInfo ? (
            <Badge className="bg-accent text-accent-foreground rounded-sm px-2.5 py-0.5 text-[10px] tracking-premium uppercase font-medium">
              {product.promoInfo.discountLabel}
            </Badge>
          ) : product.compareAtPrice && product.compareAtPrice > product.price ? (
            <Badge className="bg-accent text-accent-foreground rounded-sm px-2.5 py-0.5 text-[10px] tracking-premium uppercase font-medium">
              Promo
            </Badge>
          ) : null}
        </div>

        {/* Hover overlay with CTA */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex items-end justify-between">
          <span className="inline-block bg-background/95 backdrop-blur text-foreground text-[10px] uppercase tracking-premium px-4 py-2.5 rounded-sm shadow-premium-sm">
            Voir le produit
          </span>
        </div>

        {/* Add to cart — quick action */}
        {!soldOut && <AddToCartButton product={product} />}
      </div>

      <div className="pt-3.5 sm:pt-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-serif text-[0.98rem] sm:text-base md:text-lg leading-snug">{product.name}</h3>
          {avail && product.availability !== "in_stock" && (
            <span className={`text-[10px] uppercase tracking-premium whitespace-nowrap ${avail.tone}`}>
              {avail.label}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground tracking-premium-lg uppercase mt-0.5">{product.code}</p>
        <div className="mt-2 flex items-baseline gap-2">
          {product.promoInfo ? (
            <>
              <span className="text-sm font-medium text-accent">{formatFCFA(product.promoInfo.promoPrice)}</span>
              <span className="text-xs text-muted-foreground line-through">{formatFCFA(product.promoInfo.originalPrice)}</span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium">{formatFCFA(product.price)}</span>
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">{formatFCFA(product.compareAtPrice)}</span>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
