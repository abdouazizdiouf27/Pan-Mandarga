// WhatsApp message builder — PAN Mandarga
// Formats order messages exactly as expected, then opens wa.me URL.

export type WhatsAppSettings = {
  whatsapp_number: string;
  brand_name?: string;
};

export type WhatsAppProductPayload = {
  product: {
    name: string;
    slug?: string;
    price: number;
  };
  variant?: { name: string; price?: number | null } | null;
  size?: string | null;
  color?: string | null;
  quantity: number;
  customization?: boolean;
  customizationDetails?: string;
  customizationFee?: number;
  // === Signal de hauteur (prompt v3 — Partie 1, §22, §23) ===
  // UNIQUEMENT le signal (BELOW_175 | ABOVE_195 | null).
  // AUCUNE hauteur exacte n'est transmise (prompt §14).
  heightWarningType?: "BELOW_175" | "ABOVE_195" | null;
};

export function productUnitPrice(p: WhatsAppProductPayload): number {
  const base = p.variant?.price ?? p.product.price;
  const fee = p.customization ? p.customizationFee ?? 0 : 0;
  return base + fee;
}

export function formatFCFAInline(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " FCFA";
}

export function buildProductWhatsAppMessage(
  p: WhatsAppProductPayload,
  settings: WhatsAppSettings
): string {
  const brand = settings.brand_name || "PAN";
  const lines: string[] = [];
  lines.push(`Bonjour ${brand},`);
  lines.push("");
  lines.push("Je souhaite commander :");
  lines.push(`Produit : ${p.product.name}`);
  if (p.variant && p.variant.name) {
    lines.push(`Variante : ${p.variant.name}`);
  }
  if (p.size) lines.push(`Taille : ${p.size}`);
  if (p.color) lines.push(`Couleur : ${p.color}`);
  lines.push(`Quantité : ${p.quantity}`);
  // Signal de hauteur uniquement (prompt v3 §22, §23)
  // Pas de hauteur exacte transmise — seulement le signal.
  if (p.heightWarningType) {
    const signal =
      p.heightWarningType === "ABOVE_195"
        ? "⚠ Signal : hauteur supérieure à 195 cm"
        : p.heightWarningType === "BELOW_175"
        ? "⚠ Signal : hauteur inférieure à 175 cm"
        : null;
    if (signal) lines.push(signal);
  }
  if (p.customization) {
    lines.push("Personnalisation : Oui");
    if (p.customizationDetails) {
      lines.push(`Détail personnalisation : ${p.customizationDetails}`);
    }
  } else {
    lines.push("Personnalisation : Non");
  }
  lines.push(`Prix : ${formatFCFAInline(productUnitPrice(p) * p.quantity)}`);
  lines.push("");
  lines.push("Nom :");
  lines.push("Téléphone :");
  lines.push("Ville :");
  lines.push("Adresse :");
  return lines.join("\n");
}

export type CartItemForWhatsApp = {
  name: string;
  variantName?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  customizationFee?: number;
  customization?: boolean;
  customizationDetails?: string;
  // Signal de hauteur par ligne (prompt v3)
  heightSignal?: "BELOW_175" | "ABOVE_195" | null;
};

export function buildCartWhatsAppMessage(
  items: CartItemForWhatsApp[],
  subtotal: number,
  shipping: number,
  settings: WhatsAppSettings,
  // Signal agrégé au niveau commande (prompt v3 §22, §23)
  orderHeightWarningType?: "BELOW_175" | "ABOVE_195" | null
): string {
  const brand = settings.brand_name || "PAN";
  const lines: string[] = [];
  lines.push(`Bonjour ${brand},`);
  lines.push("");
  lines.push("Je souhaite commander :");
  lines.push("");
  items.forEach((it, i) => {
    const line = it.unitPrice * it.quantity + (it.customization ? it.customizationFee ?? 0 : 0) * it.quantity;
    lines.push(`${i + 1}. ${it.name}`);
    if (it.variantName) lines.push(`   Variante : ${it.variantName}`);
    if (it.size) lines.push(`   Taille : ${it.size}`);
    if (it.color) lines.push(`   Couleur : ${it.color}`);
    lines.push(`   Quantité : ${it.quantity}`);
    if (it.customization) {
      lines.push("   Personnalisation : Oui");
      if (it.customizationDetails) lines.push(`   Détail : ${it.customizationDetails}`);
    }
    lines.push(`   Prix ligne : ${formatFCFAInline(line)}`);
    lines.push("");
  });
  // Signal hauteur agrégé (prompt v3 §22)
  if (orderHeightWarningType) {
    const signal =
      orderHeightWarningType === "ABOVE_195"
        ? "⚠ Signal : hauteur supérieure à 195 cm"
        : orderHeightWarningType === "BELOW_175"
        ? "⚠ Signal : hauteur inférieure à 175 cm"
        : null;
    if (signal) lines.push(signal);
  }
  lines.push(`Sous-total : ${formatFCFAInline(subtotal)}`);
  if (shipping > 0) lines.push(`Livraison : ${formatFCFAInline(shipping)}`);
  lines.push(`Total : ${formatFCFAInline(subtotal + shipping)}`);
  lines.push("");
  lines.push("Nom :");
  lines.push("Téléphone :");
  lines.push("Ville :");
  lines.push("Adresse :");
  return lines.join("\n");
}

export function whatsappUrl(phone: string, message: string): string {
  const clean = (phone || "").replace(/[^0-9]/g, "");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

/**
 * Formate un numéro WhatsApp stocké (ex: "221711402020") pour affichage user-facing.
 * Détecte le Sénégal (indicatif 221) et applique le format +221 XX XXX XX XX.
 * Sinon, ajoute juste un + devant.
 *
 * Exemples :
 *   "221711402020" → "+221 71 140 20 20"
 *   "221770000000" → "+221 77 000 00 00"
 *   "33612345678"  → "+33 6 12 34 56 78"  (fallback générique par groupes)
 */
export function formatWhatsAppDisplay(phone: string): string {
  const clean = (phone || "").replace(/[^0-9]/g, "");
  if (!clean) return "";
  // Sénégal : 221 + 9 chiffres (XX XXX XX XX)
  if (clean.startsWith("221") && clean.length === 12) {
    const rest = clean.slice(3); // 9 chiffres
    const g1 = rest.slice(0, 2);
    const g2 = rest.slice(2, 5);
    const g3 = rest.slice(5, 7);
    const g4 = rest.slice(7, 9);
    return `+221 ${g1} ${g2} ${g3} ${g4}`;
  }
  // Fallback générique : + puis groupes de 3
  const withPlus = `+${clean}`;
  return withPlus.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}
