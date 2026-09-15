import { db } from "@/lib/db";

// ============================================================
// PROMOTIONS — logique de ciblage et calcul de prix
// ============================================================
//
// Principes (conformément au prompt de refonte) :
//
// 1. Une promotion a un targetType : "product" ou "collection".
//    - "product" : s'applique uniquement aux produits listés dans PromotionProduct
//    - "collection" : s'applique aux produits des collections listées dans PromotionCollection
//    - "all" (legacy targetType + pas de liaisons) : s'applique à tous les produits
//
// 2. Le calcul est INDIVIDUEL par produit :
//    - type "percentage" : nouveauPrix = prix - (prix × value / 100)
//    - type "fixed"      : nouveauPrix = prix - value  (jamais négatif, jamais le même pour tous)
//    - type "price_override" : nouveauPrix = value (prix forcé)
//
// 3. Une seule promotion est appliquée par produit (pas de cumul).
//    Si plusieurs promotions actives ciblent le même produit, on prend la
//    meilleure réduction pour le client (prix final le plus bas).
//
// 4. Dates : startsAt/endsAt respectées. Une promotion expirée n'est pas appliquée.
//
// 5. Dédoublonnage : si un produit est ciblé directement ET via une collection,
//    il ne reçoit qu'une seule réduction (la meilleure).
// ============================================================

export type PromotionData = {
  id: string;
  name: string;
  type: "percentage" | "fixed" | "price_override";
  value: number;
  targetType: string;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
};

export type ProductPromoInfo = {
  promoPrice: number;        // prix après réduction
  originalPrice: number;    // prix catalogue
  discount: number;         // montant de la réduction en FCFA
  discountLabel: string;    // ex: "-20 %" ou "-20 000 FCFA"
  promotionName: string;    // nom de la promo appliquée
  promotionId: string;
};

/**
 * Calcule le prix promotionnel d'un produit selon une promotion.
 *
 * @param originalPrice Prix catalogue du produit (FCFA)
 * @param promo Promotion à appliquer
 * @returns { promoPrice, discount, discountLabel } ou null si non applicable
 */
export function computePromoPrice(
  originalPrice: number,
  promo: PromotionData
): { promoPrice: number; discount: number; discountLabel: string } | null {
  if (!promo.active) return null;

  // Vérifie les dates
  const now = new Date();
  if (promo.startsAt && now < promo.startsAt) return null;
  if (promo.endsAt && now > promo.endsAt) return null;

  let promoPrice = originalPrice;
  let discount = 0;
  let discountLabel = "";

  if (promo.type === "percentage") {
    const pct = Math.max(0, Math.min(100, promo.value));
    discount = Math.round((originalPrice * pct) / 100);
    promoPrice = originalPrice - discount;
    discountLabel = `-${pct} %`;
  } else if (promo.type === "fixed") {
    discount = Math.min(promo.value, originalPrice); // ne pas dépasser le prix
    promoPrice = originalPrice - discount;
    discountLabel = `-${formatFCFA(promo.value)}`;
  } else if (promo.type === "price_override") {
    promoPrice = promo.value;
    discount = originalPrice - promoPrice;
    discountLabel = formatFCFA(promo.value);
  }

  // Garde-fou : prix négatif → 0
  if (promoPrice < 0) promoPrice = 0;
  // Si pas de réduction effective, on ignore
  if (discount <= 0 && promo.type !== "price_override") return null;

  return { promoPrice, discount, discountLabel };
}

function formatFCFA(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " FCFA";
}

/**
 * Récupère toutes les promotions actives pour un produit donné.
 *
 * Inclut :
 *   - promotions targetType="all" (legacy)
 *   - promotions targetType="product" qui ciblent ce produit via PromotionProduct
 *   - promotions targetType="collection" dont une collection ciblée contient ce produit
 *
 * Dédoublonnage : si le produit est ciblé par plusieurs promotions (direct + collection),
 * on retourne toutes les promos applicables (le caller choisira la meilleure).
 */
export async function getActivePromotionsForProduct(
  productId: string
): Promise<PromotionData[]> {
  const now = new Date();

  // 1. Promotions "all" (legacy targetType + pas de liaisons)
  const allPromos = await db.promotion.findMany({
    where: {
      active: true,
      targetType: "all",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: promoSelect,
  });

  // 2. Promotions ciblant ce produit directement
  const productPromos = await db.promotion.findMany({
    where: {
      active: true,
      targetType: "product",
      products: { some: { productId } },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: promoSelect,
  });

  // 3. Promotions ciblant une collection qui contient ce produit
  const collectionPromos = await db.promotion.findMany({
    where: {
      active: true,
      targetType: "collection",
      collections: {
        some: {
          collection: {
            products: { some: { productId } },
          },
        },
      },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: promoSelect,
  });

  // Dédoublonnage par ID (un produit peut être visé par plusieurs chemins)
  const byId = new Map<string, PromotionData>();
  for (const p of [...allPromos, ...productPromos, ...collectionPromos]) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }
  return Array.from(byId.values());
}

const promoSelect = {
  id: true,
  name: true,
  type: true,
  value: true,
  targetType: true,
  startsAt: true,
  endsAt: true,
  active: true,
} as const;

/**
 * Sélectionne la MEILLEURE promotion pour un produit.
 *
 * Stratégie : la promotion qui donne le prix final le plus bas.
 * En cas d'égalité, la première trouvée.
 *
 * @returns { promoPrice, originalPrice, discount, discountLabel, promotionName, promotionId } | null
 */
export async function getBestPromoForProduct(
  productId: string,
  originalPrice: number
): Promise<ProductPromoInfo | null> {
  const promos = await getActivePromotionsForProduct(productId);
  if (promos.length === 0) return null;

  let best: ProductPromoInfo | null = null;
  for (const promo of promos) {
    const computed = computePromoPrice(originalPrice, promo);
    if (!computed) continue;
    if (!best || computed.promoPrice < best.promoPrice) {
      best = {
        promoPrice: computed.promoPrice,
        originalPrice,
        discount: computed.discount,
        discountLabel: computed.discountLabel,
        promotionName: promo.name,
        promotionId: promo.id,
      };
    }
  }
  return best;
}

/**
 * Batch : récupère les meilleures promos pour une liste de produits.
 *
 * Utilise une seule requête groupée par catégorie de ciblage (all, product, collection)
 * puis déduplique et calcule la meilleure promo par produit.
 *
 * @param products Liste de { id, price }
 * @returns Map<productId, ProductPromoInfo>
 */
export async function getBestPromosForProducts(
  products: { id: string; price: number }[]
): Promise<Map<string, ProductPromoInfo>> {
  if (products.length === 0) return new Map();
  const now = new Date();
  const productIds = products.map((p) => p.id);
  const priceById = new Map(products.map((p) => [p.id, p.price]));

  // 1. Promotions "all" (legacy targetType="all")
  const allPromos = await db.promotion.findMany({
    where: {
      active: true,
      targetType: "all",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: promoSelect,
  });

  // 2. Promotions ciblant des produits spécifiques (parmi notre liste)
  const productPromos = await db.promotion.findMany({
    where: {
      active: true,
      targetType: "product",
      products: { some: { productId: { in: productIds } } },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: { ...promoSelect, products: { select: { productId: true } } },
  });

  // 3. Promotions ciblant des collections qui contiennent au moins un de nos produits
  const collectionPromos = await db.promotion.findMany({
    where: {
      active: true,
      targetType: "collection",
      collections: {
        some: {
          collection: {
            products: { some: { productId: { in: productIds } } },
          },
        },
      },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    select: {
      ...promoSelect,
      collections: {
        select: {
          collection: {
            select: {
              products: { select: { productId: true }, where: { productId: { in: productIds } } },
            },
          },
        },
      },
    },
  });

  // Index : pour chaque productId, la liste des promos applicables
  const promosByProduct = new Map<string, PromotionData[]>();

  // Promotions "all" → applicables à tous
  for (const p of allPromos) {
    for (const pid of productIds) {
      if (!promosByProduct.has(pid)) promosByProduct.set(pid, []);
      promosByProduct.get(pid)!.push(p);
    }
  }

  // Promotions produit spécifique
  for (const p of productPromos) {
    const pids = (p as any).products?.map((pp: any) => pp.productId) || [];
    for (const pid of pids) {
      if (!promosByProduct.has(pid)) promosByProduct.set(pid, []);
      // Dédoublonnage par ID
      const arr = promosByProduct.get(pid)!;
      if (!arr.find((x) => x.id === p.id)) arr.push(p);
    }
  }

  // Promotions collection
  for (const p of collectionPromos) {
    const cols = (p as any).collections || [];
    const pidsInThisPromo = new Set<string>();
    for (const col of cols) {
      const prods = col.collection?.products || [];
      for (const pp of prods) pidsInThisPromo.add(pp.productId);
    }
    for (const pid of pidsInThisPromo) {
      if (!promosByProduct.has(pid)) promosByProduct.set(pid, []);
      const arr = promosByProduct.get(pid)!;
      if (!arr.find((x) => x.id === p.id)) arr.push(p);
    }
  }

  // Calcul de la meilleure promo pour chaque produit
  const result = new Map<string, ProductPromoInfo>();
  for (const [pid, promos] of promosByProduct) {
    const originalPrice = priceById.get(pid) || 0;
    let best: ProductPromoInfo | null = null;
    for (const promo of promos) {
      const computed = computePromoPrice(originalPrice, promo);
      if (!computed) continue;
      if (!best || computed.promoPrice < best.promoPrice) {
        best = {
          promoPrice: computed.promoPrice,
          originalPrice,
          discount: computed.discount,
          discountLabel: computed.discountLabel,
          promotionName: promo.name,
          promotionId: promo.id,
        };
      }
    }
    if (best) result.set(pid, best);
  }

  return result;
}
