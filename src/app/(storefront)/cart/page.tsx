"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle, ArrowRight, ChevronLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore, cartSubtotal } from "@/lib/cart-store";
import { formatFCFA } from "@/lib/format";
import { buildCartWhatsAppMessage, whatsappUrl } from "@/lib/whatsapp";
import { toast } from "sonner";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const [mounted, setMounted] = React.useState(false);
  const [shipping, setShipping] = React.useState(2500);
  const [whatsapp, setWhatsapp] = React.useState("221770000000");
  const [brandName, setBrandName] = React.useState("PAN");

  React.useEffect(() => {
    setMounted(true);
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s.whatsapp_number) setWhatsapp(s.whatsapp_number);
        if (s.brand_name) setBrandName(s.brand_name);
        if (s.shipping_dakar) setShipping(Number(s.shipping_dakar) || 2500);
      })
      .catch(() => {});
  }, []);

  if (!mounted) {
    return (
      <div className="py-20 px-4">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs tracking-premium-lg uppercase text-muted-foreground">Panier</p>
          <h1 className="font-serif text-3xl md:text-4xl mt-1">Chargement...</h1>
        </div>
      </div>
    );
  }

  const subtotal = cartSubtotal({ items } as any);
  const total = subtotal + (items.length > 0 ? shipping : 0);

  // Signal hauteur agrégé au niveau commande (prompt v3 §22)
  // On prend le signal de l'item qui en a un (un client a une seule situation de hauteur).
  // Si plusieurs items ont des signaux, on prend le dernier défini.
  // Le signal est déjà confirmé par clic sur la fiche produit — pas de checkbox ici
  // (prompt v3 §1, §5, §14 : pas de saisie, juste un bouton cliqué).
  const orderHeightWarningType = React.useMemo(() => {
    let sig: "BELOW_175" | "ABOVE_195" | null = null;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].heightSignal) {
        sig = items[i].heightSignal as "BELOW_175" | "ABOVE_195";
        break;
      }
    }
    return sig;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="py-20 md:py-32 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto w-16 h-16 rounded-sm bg-muted flex items-center justify-center">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-6 font-serif text-3xl md:text-4xl">Votre panier est vide</h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            Découvrez nos collections et ajoutez vos pièces préférées — chaque création est pensée et cousue au Sénégal.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/shop">
              <Button className="h-12 uppercase tracking-premium text-xs px-6">
                Visiter la boutique
              </Button>
            </Link>
            <Link href="/collections/collection-nouveautes">
              <Button variant="outline" className="h-12 uppercase tracking-premium text-xs px-6">
                Les nouveautés
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function handleWhatsAppCheckout() {
    const msg = buildCartWhatsAppMessage(
      items.map((i) => ({
        name: i.name,
        variantName: i.variantName,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        customization: i.customization,
        customizationFee: i.customizationFee,
        customizationDetails: i.customizationDetails,
        heightSignal: i.heightSignal,
      })),
      subtotal,
      shipping,
      { whatsapp_number: whatsapp, brand_name: brandName },
      // Signal agrégé au niveau commande (déjà confirmé par clic sur fiche produit)
      orderHeightWarningType
    );

    try {
      await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "WHATSAPP",
          items: items.map((i) => ({
            productId: i.productId,
            productSnapshot: `${i.name}${i.variantName ? ` — ${i.variantName}` : ""}`,
            variantSnapshot: i.variantName,
            size: i.size,
            color: i.color,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            customization: i.customization,
            customizationFee: i.customizationFee,
            lineTotal:
              (i.unitPrice + (i.customization ? i.customizationFee : 0)) * i.quantity,
          })),
          subtotal,
          // Signal de hauteur (prompt v3 §13, §21) — déjà confirmé par clic sur fiche produit
          heightWarningType: orderHeightWarningType,
          heightWarningConfirmed: orderHeightWarningType !== null,
        }),
      });
    } catch (e) {
      console.warn(e);
    }

    const url = whatsappUrl(whatsapp, msg);
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Conversation WhatsApp ouverte", {
      description: "Votre commande a été enregistrée en brouillon.",
    });
  }

  return (
    <div className="py-12 md:py-20 px-4 md:px-6">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-premium-lg uppercase text-muted-foreground">Panier</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-1">Votre panier</h1>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Items — 65% (8/12) */}
          <div className="lg:col-span-8 space-y-3">
            {items.map((item) => {
              const lineTotal =
                (item.unitPrice + (item.customization ? item.customizationFee : 0)) *
                item.quantity;
              return (
                <div
                  key={item.lineKey}
                  className="flex gap-4 border border-border/50 rounded-sm p-4 bg-card transition-shadow hover:shadow-premium-sm"
                >
                  <Link href={`/products/${item.slug}`} className="relative w-20 h-28 shrink-0 overflow-hidden bg-muted rounded-sm">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : null}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.slug}`}
                      className="font-serif text-base hover:underline leading-tight"
                    >
                      {item.name}
                    </Link>
                    {item.variantName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.variantName}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {item.size && <span>Taille : {item.size}</span>}
                      {item.color && <span>Couleur : {item.color}</span>}
                    </div>
                    {/* Signal de hauteur affiché sur la ligne (prompt v3 §24) */}
                    {item.heightSignal && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-accent">
                        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                        {item.heightSignal === "ABOVE_195"
                          ? "Hauteur signalée : supérieure à 195 cm"
                          : "Hauteur signalée : inférieure à 175 cm"}
                      </p>
                    )}
                    {item.customization && (
                      <p className="mt-1 text-xs text-accent">
                        Personnalisation : {item.customizationDetails || "Oui"} (+{formatFCFA(item.customizationFee)})
                      </p>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-border/60 rounded-sm">
                        <button
                          onClick={() => updateQuantity(item.lineKey, item.quantity - 1)}
                          className="h-9 w-9 grid place-items-center hover:bg-muted transition-colors"
                          aria-label="Diminuer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-10 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.lineKey, item.quantity + 1)}
                          className="h-9 w-9 grid place-items-center hover:bg-muted transition-colors"
                          aria-label="Augmenter"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          removeItem(item.lineKey);
                          toast.success("Article retiré du panier");
                        }}
                        className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Retirer
                      </button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium">{formatFCFA(lineTotal)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatFCFA(item.unitPrice)} / unité</p>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between items-center pt-3">
              <Link href="/shop">
                <Button variant="ghost" size="sm">
                  <ChevronLeft className="h-4 w-4" />
                  Continuer mes achats
                </Button>
              </Link>
              <button
                onClick={() => {
                  clearCart();
                  toast.success("Panier vidé");
                }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                Vider le panier
              </button>
            </div>
          </div>

          {/* Summary — 35% (4/12) sticky */}
          <div className="lg:col-span-4">
            <div className="border border-border/50 rounded-sm p-6 bg-card sticky top-24">
              <h2 className="font-serif text-xl mb-5">Récapitulatif</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Sous-total</dt>
                  <dd className="font-medium">{formatFCFA(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Livraison (Dakar)</dt>
                  <dd className="font-medium">{formatFCFA(shipping)}</dd>
                </div>
                <div className="pt-4 border-t border-border/60 flex justify-between items-baseline">
                  <dt className="text-base font-medium">Total</dt>
                  <dd className="font-serif text-2xl">{formatFCFA(total)}</dd>
                </div>
              </dl>

              {/* === Signal de hauteur agrégé (prompt v3 §24) === */}
              {/* Affiché dans le récapitulatif pour information. Pas de checkbox :
                  le signal est déjà confirmé par clic sur la fiche produit. */}
              {orderHeightWarningType && (
                <div className="mt-5 rounded-md border border-accent/40 bg-accent/[0.06] dark:bg-accent/[0.08] p-3 flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                  <p className="text-xs text-foreground/85 leading-relaxed">
                    {orderHeightWarningType === "ABOVE_195"
                      ? "⚠ Hauteur signalée : supérieure à 195 cm"
                      : "⚠ Hauteur signalée : inférieure à 175 cm"}
                    <span className="block text-[10px] uppercase tracking-premium text-muted-foreground mt-1">
                      Signal transmis avec la commande
                    </span>
                  </p>
                </div>
              )}

              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleWhatsAppCheckout}
                  variant="accent"
                  className="w-full h-12 uppercase tracking-premium text-xs gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Commander sur WhatsApp
                </Button>
                <Link href="/shop">
                  <Button
                    variant="outline"
                    className="w-full h-12 uppercase tracking-premium text-xs gap-2"
                  >
                    Continuer mes achats
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted-foreground leading-relaxed">
                Le paiement se finalise sur WhatsApp. Aucune carte requise en ligne.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
