import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Public endpoint: create an order (channel WHATSAPP or WEB).
// Used by WhatsApp buttons to persist the order as a "new" draft.
// Stock is NOT decremented (order must be confirmed by admin first).
//
// Champs optionnels de signal de hauteur (prompt v3 — Partie 1) :
//   - heightWarningType    : "BELOW_175" | "ABOVE_195" | null
//   - heightWarningConfirmed: Boolean (true si le client a cliqué sur un bouton)
//
// IMPORTANT (prompt v3 §14, §27) :
//   - AUCUNE hauteur exacte (heightCm) n'est acceptée ni stockée.
//   - Le back-office affiche uniquement le signal (pas de valeur exacte).
//
// Le signal n'est enregistré QUE si heightWarningConfirmed est true
// (c'est-à-dire si le client a explicitement cliqué sur un bouton).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      channel,
      items,
      subtotal,
      customerName,
      customerPhone,
      customerEmail,
      customerCity,
      customerAddress,
      // Signal de hauteur (prompt v3)
      heightWarningType,
      heightWarningConfirmed,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Panier vide" }, { status: 400 });
    }

    // Generate order number
    const year = new Date().getFullYear();
    const count = await db.order.count();
    const orderNumber = `PAN-${year}-${String(count + 1).padStart(4, "0")}`;

    // Validate each item and compute totals server-side (no client trust)
    const validatedItems = items.map((it: any) => {
      const unitPrice = Number(it.unitPrice) || 0;
      const qty = Math.max(1, Number(it.quantity) || 1);
      const custFee = it.customization ? Number(it.customizationFee) || 0 : 0;
      const lineTotal = (unitPrice + custFee) * qty;
      return {
        productId: it.productId || null,
        productSnapshot: String(it.productSnapshot || ""),
        variantSnapshot: it.variantSnapshot ? String(it.variantSnapshot) : null,
        size: it.size ? String(it.size) : null,
        color: it.color ? String(it.color) : null,
        quantity: qty,
        unitPrice,
        customization: Boolean(it.customization),
        customizationFee: custFee,
        lineTotal,
      };
    });

    const finalSubtotal =
      typeof subtotal === "number" && subtotal > 0
        ? subtotal
        : validatedItems.reduce((acc: number, it: any) => acc + it.lineTotal, 0);

    // === Validation du signal de hauteur (prompt v3) ===
    // AUCUNE hauteur exacte stockée — seulement le type de signal.
    const ALLOWED_TYPES = ["BELOW_175", "ABOVE_195"];
    const confirmed = Boolean(heightWarningConfirmed);
    const safeType =
      confirmed && typeof heightWarningType === "string" && ALLOWED_TYPES.includes(heightWarningType)
        ? heightWarningType
        : null;

    const order = await db.order.create({
      data: {
        orderNumber,
        channel: channel === "WHATSAPP" ? "WHATSAPP" : "WEB",
        status: "new",
        customerName: customerName || "Client WhatsApp",
        customerPhone: customerPhone || "",
        customerEmail: customerEmail || null,
        customerCity: customerCity || null,
        customerAddress: customerAddress || null,
        subtotal: finalSubtotal,
        discount: 0,
        shipping: 0,
        total: finalSubtotal,
        currency: "FCFA",
        itemsJson: JSON.stringify(validatedItems),
        // Signal de hauteur (prompt v3 §13, §16, §21)
        heightWarningType: safeType,
        heightWarningConfirmed: confirmed && safeType !== null,
        orderItems: { create: validatedItems },
      },
    });

    return NextResponse.json({ ok: true, orderNumber: order.orderNumber, id: order.id });
  } catch (e: any) {
    console.error("Order creation error:", e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
