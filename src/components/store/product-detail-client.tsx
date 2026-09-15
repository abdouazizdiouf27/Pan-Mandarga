"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Share2, ShoppingBag, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { formatFCFA, safeJsonParse } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
import { SizeRecommender } from "@/components/store/size-recommender";
import { HeightSignalButtons, type HeightSignalType } from "@/components/store/height-signal-buttons";
import {
  buildProductWhatsAppMessage,
  whatsappUrl,
} from "@/lib/whatsapp";

type Variant = {
  id: string;
  name: string;
  price?: number | null;
  stock?: number | null;
  customizationOption?: string | null;
};
type Media = { id: string; url: string; alt: string };
type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  code: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  availability: string;
  stock: number;
  material?: string | null;
  tags: string;
  colors?: string | null;
  sizes?: string | null;
  customizationEnabled: boolean;
  customizationFee: number;
  customizationInstructions?: string | null;
  variants: Variant[];
  images: Media[];
  mainImageId?: string | null;
};

const AVAILABILITY_LABELS: Record<string, { label: string; tone: string }> = {
  in_stock: { label: "En stock", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  made_to_order: { label: "Sur commande", tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  custom: { label: "Sur mesure", tone: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  out_of_stock: { label: "Épuisé", tone: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

export function ProductDetailClient({
  product,
  whatsappNumber,
  brandName,
  promoInfo,
}: {
  product: ProductDetail;
  whatsappNumber: string;
  brandName: string;
  promoInfo?: {
    promoPrice: number;
    originalPrice: number;
    discount: number;
    discountLabel: string;
    promotionName: string;
  } | null;
}) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [activeImage, setActiveImage] = React.useState(0);

  // Gallery navigation — wrap around
  const imageCount = product.images.length;
  const goPrevImage = React.useCallback(() => {
    setActiveImage((i) => (imageCount <= 1 ? 0 : (i - 1 + imageCount) % imageCount));
  }, [imageCount]);
  const goNextImage = React.useCallback(() => {
    setActiveImage((i) => (imageCount <= 1 ? 0 : (i + 1) % imageCount));
  }, [imageCount]);

  // Keyboard navigation (← / →) when gallery is focused or on the section
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (imageCount <= 1) return;
      // Ignore si l'utilisateur tape dans un input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrevImage();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNextImage();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [imageCount, goPrevImage, goNextImage]);

  // Tracking analytics — une seule fois par montage du produit
  React.useEffect(() => {
    if (product.slug) {
      // Import dynamique pour éviter de charger le hook sur les pages admin
      import("@/hooks/use-analytics").then((m) => {
        m.trackProductView(product.slug, product.name);
      });
    }
  }, [product.slug, product.name]);

  const [selectedVariantId, setSelectedVariantId] = React.useState<string | undefined>(
    product.variants[0]?.id
  );
  const [size, setSize] = React.useState<string | null>(null);
  const [color, setColor] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [customization, setCustomization] = React.useState(false);
  const [customizationDetails, setCustomizationDetails] = React.useState("");
  // === Signal de hauteur (prompt v3 — Partie 1) ===
  // AUCUN champ de saisie de hauteur. Le client clique sur un des 2 boutons
  // (BELOW_175 ou ABOVE_195), ou null s'il ne signale rien.
  // La hauteur exacte n'est JAMAIS demandée ni enregistrée (prompt §14, §27).
  // Le signal ne modifie pas la taille recommandée (prompt §3, §16).
  // Le signal ne bloque pas l'achat (prompt §17).
  const [heightSignal, setHeightSignal] = React.useState<HeightSignalType>(null);

  const sizesList = safeJsonParse<string[]>(product.sizes, ["S", "M", "L", "XL"]);
  const colorsList = safeJsonParse<string[]>(product.colors, []);

  // Default first size
  React.useEffect(() => {
    if (sizesList.length > 0 && !size) setSize(sizesList[0]);
  }, [sizesList, size]);

  const variant = product.variants.find((v) => v.id === selectedVariantId);
  const unitPrice = (variant?.price ?? product.price) + (customization ? product.customizationFee : 0);
  const lineTotal = unitPrice * quantity;

  const availInfo = AVAILABILITY_LABELS[product.availability] ?? AVAILABILITY_LABELS.made_to_order;
  const soldOut = product.availability === "out_of_stock";

  function handleAddToCart() {
    if (soldOut) return;
    const lineKey = [
      product.id,
      selectedVariantId ?? "default",
      size ?? "any",
      color ?? "any",
      customization ? "cust" : "nocust",
      heightSignal ?? "nosig",
    ].join("|");
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      variantId: variant?.id,
      variantName: variant?.name,
      size: size ?? undefined,
      color: color ?? undefined,
      quantity,
      unitPrice: promoInfo ? promoInfo.promoPrice : (variant?.price ?? product.price),
      customization,
      customizationDetails: customization ? customizationDetails : undefined,
      customizationFee: product.customizationFee,
      image: product.images[0]?.url ?? "",
      lineKey,
      heightSignal,
    });
    toast.success("Ajouté au panier", {
      description: `${product.name}${variant ? ` — ${variant.name}` : ""} × ${quantity}${heightSignal ? ` · ⚠ ${heightSignal === "ABOVE_195" ? "Hauteur > 195 cm" : "Hauteur < 175 cm"}` : ""}`,
    });
  }

  async function handleWhatsAppOrder() {
    // Si promo active, on passe le prix promo comme prix du produit
    const effectivePrice = promoInfo ? promoInfo.promoPrice : product.price;
    const msg = buildProductWhatsAppMessage(
      {
        product: { name: product.name, slug: product.slug, price: effectivePrice },
        variant: variant
          ? { name: variant.name, price: promoInfo ? null : (variant.price ?? null) }
          : null,
        size,
        color,
        quantity,
        customization,
        customizationDetails: customization ? customizationDetails : undefined,
        customizationFee: product.customizationFee,
        // Signal de hauteur uniquement (pas de hauteur exacte — prompt v3 §14)
        heightWarningType: heightSignal,
      },
      { whatsapp_number: whatsappNumber, brand_name: brandName }
    );

    // Create the order in DB (channel WHATSAPP, status new)
    try {
      await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "WHATSAPP",
          items: [
            {
              productId: product.id,
              productSnapshot: `${product.name} (${product.code})`,
              variantSnapshot: variant?.name ?? null,
              size,
              color,
              quantity,
              unitPrice: variant?.price ?? product.price,
              customization,
              customizationFee: customization ? product.customizationFee : 0,
              lineTotal,
            },
          ],
          subtotal: lineTotal,
          currency: "FCFA",
          // Signal de hauteur transmis avec la commande (prompt v3 §13, §21)
          // Le client a cliqué sur un bouton → c'est une confirmation explicite.
          heightWarningType: heightSignal,
          heightWarningConfirmed: heightSignal !== null,
        }),
      });
    } catch (e) {
      // Non-blocking — WhatsApp link still opens
      console.warn("Order creation failed:", e);
    }

    const url = whatsappUrl(whatsappNumber, msg);
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Conversation WhatsApp ouverte", {
      description: "Votre commande a été enregistrée en brouillon.",
    });
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié", { description: "Le lien du produit a été copié." });
    } catch {
      toast.error("Copie impossible");
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-12">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 text-muted-foreground hover:text-foreground"
        onClick={() => router.back()}
      >
        <ChevronLeft className="h-4 w-4" />
        Retour
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Gallery — 60% (7/12) */}
        <div className="lg:col-span-7">
          <div
            className="relative aspect-[4/5] overflow-hidden bg-muted rounded-md group"
            aria-roledescription="carousel"
            aria-label="Galerie d'images du produit"
          >
            {product.images[activeImage] ? (
              <Image
                src={product.images[activeImage].url}
                alt={product.images[activeImage].alt || product.name}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 60vw"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Image à venir
              </div>
            )}

            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground rounded-sm z-20">
                Promo
              </Badge>
            )}

            {/* Flèches de navigation gauche/droite — visibles si >1 image */}
            {imageCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrevImage}
                  aria-label="Image précédente"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 grid place-items-center rounded-full bg-background/80 backdrop-blur-md text-foreground border border-border/40 shadow-premium-sm hover:bg-background hover:scale-105 transition-all duration-200 opacity-80 group-hover:opacity-100 focus:opacity-100"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNextImage}
                  aria-label="Image suivante"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 grid place-items-center rounded-full bg-background/80 backdrop-blur-md text-foreground border border-border/40 shadow-premium-sm hover:bg-background hover:scale-105 transition-all duration-200 opacity-80 group-hover:opacity-100 focus:opacity-100"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Compteur d'images — discret en bas à droite */}
                <span className="absolute bottom-3 right-3 z-20 inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-md px-2.5 py-1 text-[10px] uppercase tracking-premium text-foreground/80 border border-border/40 shadow-premium-sm">
                  {activeImage + 1} / {imageCount}
                </span>
              </>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImage(idx)}
                  className={cn(
                    "relative aspect-square overflow-hidden bg-muted border-2 rounded-sm transition-all",
                    activeImage === idx ? "border-accent" : "border-transparent hover:border-border/60"
                  )}
                  aria-label={`Voir image ${idx + 1}`}
                  aria-pressed={activeImage === idx}
                >
                  <Image src={img.url} alt={img.alt} fill sizes="15vw" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info — 40% (5/12) — Hiérarchie premium (prompt v5 §5)
            NOM → PRIX → DISPONIBILITÉ → GUIDE → TAILLES → SIGNAL → QTÉ → ACHAT → DESCRIPTION
            Aucun texte explicatif. Sections repliables pour le secondaire. */}
        <div className="lg:col-span-5">
          {/* === ZONE PRIMAIRE : Nom, Prix, Disponibilité === */}
          <div className="space-y-3">
            {/* Code produit — très discret */}
            <p className="text-[10px] tracking-premium-lg uppercase text-muted-foreground/70">
              {product.code}
            </p>

            {/* Nom — dominant */}
            <h1 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.05] tracking-tight">
              {product.name}
            </h1>

            {/* Prix — immédiatement identifiable */}
            <div className="flex items-baseline gap-3 flex-wrap pt-1">
              {promoInfo ? (
                <>
                  <span className="font-serif text-2xl md:text-3xl font-medium text-accent">
                    {formatFCFA(promoInfo.promoPrice)}
                  </span>
                  <span className="text-sm text-muted-foreground line-through">
                    {formatFCFA(promoInfo.originalPrice)}
                  </span>
                  <Badge className="bg-accent text-accent-foreground rounded-sm text-[10px] uppercase tracking-premium font-medium">
                    {promoInfo.discountLabel}
                  </Badge>
                </>
              ) : (
                <>
                  <span className="font-serif text-2xl md:text-3xl font-medium">
                    {formatFCFA(unitPrice)}
                  </span>
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <span className="text-sm text-muted-foreground line-through">
                      {formatFCFA(product.compareAtPrice)}
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Disponibilité — discrète, sur la même ligne */}
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn("rounded-sm text-[10px] uppercase tracking-premium font-medium px-2 py-0.5", availInfo.tone)}
              >
                {availInfo.label}
              </Badge>
              {product.stock > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {product.stock} en stock
                </span>
              )}
            </div>
          </div>

          {/* === ZONE D'ACHAT : Variante, Guide, Tailles, Signal, Quantité, CTA === */}
          {/* Séparateur fin pour annoncer la zone d'achat */}
          <div className="mt-8 pt-6 border-t border-border/40 space-y-6">
            {/* Variante — bloc compact si plusieurs variantes */}
            {product.variants.length > 1 && (
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-premium text-muted-foreground">
                  Variante
                </span>
                <div className="flex flex-col gap-1.5">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 text-left border rounded-sm transition-all duration-200",
                        selectedVariantId === v.id
                          ? "border-foreground bg-foreground/[0.03]"
                          : "border-border/50 hover:border-foreground/60"
                      )}
                    >
                      <span className="text-sm">{v.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {v.price ? formatFCFA(v.price) : "Prix de base"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Guide de taille — compact, sans texte explicatif */}
            {sizesList.length > 0 && (
              <div className="space-y-3">
                <span className="text-[11px] uppercase tracking-premium text-muted-foreground block">
                  Taille
                </span>
                <SizeRecommender
                  availableSizes={sizesList}
                  selectedSize={size}
                  onSizeSelect={setSize}
                />
              </div>
            )}

            {/* Couleurs — compact */}
            {colorsList.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-premium text-muted-foreground block">
                  Couleur
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {colorsList.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={cn(
                        "px-3 h-9 border rounded-sm text-xs transition-all duration-200",
                        color === c
                          ? "border-foreground bg-foreground text-background"
                          : "border-border/60 hover:border-foreground"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Signal de hauteur — très discret, inline (prompt v5 §21, §23) */}
            {sizesList.length > 0 && (
              <HeightSignalButtons
                selected={heightSignal}
                onChange={setHeightSignal}
              />
            )}

            {/* Quantité + Personnalisation — sur une ligne compacte si possible */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase tracking-premium text-muted-foreground block">
                  Quantité
                </span>
                <div className="inline-flex items-center border border-border/60 rounded-sm">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="h-9 w-9 grid place-items-center hover:bg-muted transition-colors"
                    aria-label="Diminuer la quantité"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    min={1}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-12 h-9 text-center text-sm bg-transparent border-x border-border/60 outline-none"
                    aria-label="Quantité"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="h-9 w-9 grid place-items-center hover:bg-muted transition-colors"
                    aria-label="Augmenter la quantité"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Personnalisation — compact, switch inline */}
              {product.customizationEnabled && (
                <div className="space-y-1.5">
                  <span className="text-[11px] uppercase tracking-premium text-muted-foreground block">
                    Personnalisation
                    <span className="ml-2 normal-case tracking-normal text-muted-foreground/70">
                      +{formatFCFA(product.customizationFee)}
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={customization}
                      onCheckedChange={setCustomization}
                      aria-label="Activer la personnalisation"
                    />
                    <span className="text-xs text-muted-foreground">
                      {customization ? "Activée" : "Aucune"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Textarea de personnalisation — repliable quand activé */}
            {product.customizationEnabled && customization && (
              <div className="space-y-1.5">
                {product.customizationInstructions && (
                  <p className="text-[11px] text-muted-foreground">
                    {product.customizationInstructions}
                  </p>
                )}
                <Textarea
                  placeholder="Initiales, broderie, détails..."
                  value={customizationDetails}
                  onChange={(e) => setCustomizationDetails(e.target.value)}
                  rows={2}
                  className="bg-background text-sm"
                />
              </div>
            )}

            {/* CTA — point final visuel de la fiche */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <Button
                onClick={handleAddToCart}
                disabled={soldOut}
                variant="outline"
                className="h-11 rounded-sm uppercase tracking-premium text-xs flex items-center justify-center gap-2 min-w-0"
              >
                <ShoppingBag className="h-4 w-4 shrink-0" />
                <span>Ajouter au panier</span>
              </Button>
              <Button
                onClick={handleWhatsAppOrder}
                disabled={soldOut}
                variant="accent"
                className="h-11 rounded-sm uppercase tracking-premium text-xs flex items-center justify-center gap-2 min-w-0"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span>Commander sur WhatsApp</span>
              </Button>
            </div>

            {/* Partager — lien discret sous les CTA */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 className="h-3 w-3" />
                Partager
              </button>
              <Link
                href="/collections"
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Continuer mes achats
              </Link>
            </div>
          </div>

          {/* === ZONE SECONDAIRE : Description + Détails (sections repliables) === */}
          <div className="mt-10 pt-6 border-t border-border/40">
            <Accordion type="single" collapsible defaultValue="description" className="w-full">
              <AccordionItem value="description" className="border-b">
                <AccordionTrigger className="text-[11px] uppercase tracking-premium text-muted-foreground hover:no-underline py-3">
                  Description
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-4">
                  <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="details" className="border-b">
                <AccordionTrigger className="text-[11px] uppercase tracking-premium text-muted-foreground hover:no-underline py-3">
                  Détails
                </AccordionTrigger>
                <AccordionContent className="pt-3 pb-4">
                  <ul className="space-y-1.5 text-sm">
                    <li className="flex gap-2 text-foreground/85">
                      <span className="text-muted-foreground min-w-[80px] text-xs uppercase tracking-premium mt-0.5">
                        Matière
                      </span>
                      <span>{product.material || "à valider"}</span>
                    </li>
                    <li className="flex gap-2 text-foreground/85">
                      <span className="text-muted-foreground min-w-[80px] text-xs uppercase tracking-premium mt-0.5">
                        Origine
                      </span>
                      <span>Made in Senegal 🇸🇳</span>
                    </li>
                    <li className="flex gap-2 text-foreground/85">
                      <span className="text-muted-foreground min-w-[80px] text-xs uppercase tracking-premium mt-0.5">
                        Tailles
                      </span>
                      <span>{sizesList.join(", ")}</span>
                    </li>
                    {variant?.customizationOption && (
                      <li className="flex gap-2 text-foreground/85">
                        <span className="text-muted-foreground min-w-[80px] text-xs uppercase tracking-premium mt-0.5">
                          Option
                        </span>
                        <span>{variant.customizationOption}</span>
                      </li>
                    )}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </div>
  );
}
