// ============================================================
// RÉFÉRENTIEL CENTRAL DES TAILLES — PAN Mandarga
// ============================================================
//
// Barème poids → taille commerciale + libellé détaillé.
// Convention de borne : borne basse INCLUSE, borne haute EXCLUE.
//   [50, 60[ → S
//   [60, 66[ → M
//   [66, 76[ → L faible
//   [76, 84[ → L fort
//   [84, 94[ → XL
//   [94, 104[ → XXL (plage 1)
//   [104, 115] → XXL (plage 2, 115 INCLUS — cas terminal)
//
// Pour la dernière plage [104, 115], on inclut 115 car il n'y a pas
// de plage suivante et le prompt stipule explicitement : « À 115 kg : XXL ».
//
// Au-dessus de 115 kg ou en dessous de 50 kg → message contact.
//
// Les tailles commerciales restent S / M / L / XL / XXL.
// Les libellés détaillés ("L faible", "L fort") servent à la RECOMMANDATION
// et à l'affichage, mais n'ajoutent pas de nouvelles variantes produit.
//
// CENTRALISATION :
//   - Toutes les valeurs sont ici. Aucune plage codée en dur ailleurs.
//   - L'admin peut plus tard éditer ces plages via une table Settings
//     (clé "size_guide_json"). Pour l'instant on lit depuis Settings
//     si présent, sinon on fallback sur DEFAULT_SIZE_GUIDE.
// ============================================================

export type SizeGuideEntry = {
  /** Borne basse (incluse) en kg */
  minWeight: number;
  /** Borne haute (exclue) en kg. Pour la dernière plage, 115 est inclus. */
  maxWeight: number;
  /** Taille commerciale : S | M | L | XL | XXL */
  size: string;
  /** Libellé affiché au client (ex: "L faible", "L fort") */
  label: string;
  /** Indique si c'est la dernière plage (maxWeight inclus) */
  isInclusiveMax?: boolean;
};

export const DEFAULT_SIZE_GUIDE: SizeGuideEntry[] = [
  { minWeight: 50, maxWeight: 60, size: "S", label: "S" },
  { minWeight: 60, maxWeight: 66, size: "M", label: "M" },
  { minWeight: 66, maxWeight: 76, size: "L", label: "L faible" },
  { minWeight: 76, maxWeight: 84, size: "L", label: "L fort" },
  { minWeight: 84, maxWeight: 94, size: "XL", label: "XL" },
  { minWeight: 94, maxWeight: 104, size: "XXL", label: "XXL" },
  { minWeight: 104, maxWeight: 115, size: "XXL", label: "XXL", isInclusiveMax: true },
];

// ============================================================
// SEUILS HAUTEUR — alertes de vigilance (PAN Mandarga v2)
// ============================================================
//
// NOUVEAUX SEUILS (prompt v2) :
//   - Hauteur < 175 cm  → signalement "BELOW_175"
//   - Hauteur > 195 cm  → signalement "ABOVE_195"
//   - 175 ≤ hauteur ≤ 195 cm → AUCUN signal
//
// ATTENTION : le seuil haut est 195 cm, PAS 185 cm (l'ancien 1,85 m
// était une erreur d'interprétation — corrigé dans cette version).
//
// Le signal ne modifie JAMAIS la recommandation de taille issue du poids.
// Il ne bloque JAMAIS la commande.
// Il est simplement une information de vigilance transmise avec la commande
// si le client le confirme (checkbox au checkout).
//
// Convention de comparaison :
//   - seuil bas : strictement inférieur (< 175)
//   - seuil haut : strictement supérieur (> 195)
//   - Au seuil exact (175 ou 195) → pas de signal (intervalle inclusif)

export const HEIGHT_ALERTS = {
  /** Seuil bas (strictement inférieur) en cm */
  lowThresholdCm: 175,
  /** Seuil haut (strictement supérieur) en cm */
  highThresholdCm: 195,
  /** Type pour signal < 175 cm (utilisé en DB) */
  lowType: "BELOW_175",
  /** Type pour signal > 195 cm (utilisé en DB) */
  highType: "ABOVE_195",
  /** Message affiché sur la fiche produit si hauteur < 175 cm */
  lowMessage:
    "Votre taille est inférieure à 175 cm. Une vérification de taille peut être nécessaire avant la préparation de votre commande.",
  /** Message affiché sur la fiche produit si hauteur > 195 cm */
  highMessage:
    "Votre taille est supérieure à 195 cm. Une vérification de taille peut être nécessaire avant la préparation de votre commande.",
  /** Libellé court pour le checkout (case à cocher) si < 175 */
  lowCheckboxLabel:
    "Je souhaite signaler que ma taille est inférieure à 175 cm.",
  /** Libellé court pour le checkout (case à cocher) si > 195 */
  highCheckboxLabel:
    "Je souhaite signaler que ma taille est supérieure à 195 cm.",
} as const;

// Rétro-compatibilité : anciens noms de seuils (ancien prompt v1)
// conservés pour ne pas casser les imports éventuels, mais marqués deprecated.
// @deprecated Utiliser HEIGHT_ALERTS.lowThresholdCm / highThresholdCm
export const HEIGHT_ALERTS_LEGACY = {
  lowThreshold: 1.75,
  highThreshold: 1.85,
} as const;

// ============================================================
// MESSAGES HORS PLAGE
// ============================================================

export const OUT_OF_RANGE_MESSAGES = {
  tooLight: "Nous vous recommandons de nous contacter pour confirmer votre taille.",
  tooHeavy: "Nous vous recommandons de nous contacter pour confirmer votre taille.",
} as const;

// ============================================================
// TYPES DE RETOUR DE RECOMMANDATION
// ============================================================

export type SizeRecommendationResult = {
  /** Statut de la recommandation */
  status: "ok" | "too_light" | "too_heavy" | "invalid";
  /** Taille commerciale (S/M/L/XL/XXL) ou null si hors plage */
  size: string | null;
  /** Libellé détaillé ("L faible", etc.) ou null si hors plage */
  label: string | null;
  /** Plage de poids correspondante en kg, ex: "66–76" */
  weightRange: string | null;
  /** Entrée du référentiel, ou null si hors plage */
  entry: SizeGuideEntry | null;
  /** Message éventuel (hors plage) */
  message: string | null;
};

export type HeightAlertResult = {
  /** Aucune alerte | alerte basse | alerte haute */
  status: "none" | "low" | "high" | "invalid";
  /** Message affiché à l'utilisateur, null si aucune alerte */
  message: string | null;
  /** Hauteur normalisée en mètres, ou null si invalide */
  heightM: number | null;
  /** Hauteur normalisée en cm (arrondi entier), ou null si invalide */
  heightCm: number | null;
  /** Type de signal ("BELOW_175" | "ABOVE_195"), ou null si aucune */
  type: "BELOW_175" | "ABOVE_195" | null;
  /** Libellé de la checkbox à afficher au checkout, ou null si pas de signal */
  checkboxLabel: string | null;
};

// ============================================================
// NORMALISATION DES SAISIES
// ============================================================

/**
 * Normalise une saisie de poids en kg.
 * Accepte : "65 kg", "65", "65.5", "65,5", "  66  "
 * Retourne : nombre (kg) ou null si invalide / vide / négatif.
 *
 * @param input Valeur saisie (string ou number)
 * @returns Poids en kg (number >= 0) ou null si invalide
 */
export function parseWeight(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!isFinite(input) || input < 0) return null;
    return input;
  }
  const s = input.trim().toLowerCase();
  if (!s) return null;
  // Retire les unités courantes
  const cleaned = s
    .replace(/kg/g, "")
    .replace(/kgs/g, "")
    .replace(/kilos?/g, "")
    .replace(/\s/g, "")
    // virgule décimale française → point
    .replace(/,/g, ".");
  // N'accepter que chiffres + point décimal
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  if (!isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Normalise une saisie de hauteur en mètres.
 * Accepte : "1,72 m", "1.72m", "172 cm", "172", "1.72"
 * Retourne : hauteur en mètres (number) ou null si invalide.
 *
 * @param input Valeur saisie
 * @returns Hauteur en mètres (number > 0) ou null si invalide
 */
export function parseHeight(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    if (!isFinite(input) || input <= 0) return null;
    // Si nombre > 10, on suppose que c'est des cm
    if (input > 10) return input / 100;
    return input;
  }
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // Détection unité : cm ou m
  const hasCm = /cm/.test(s);
  const hasM = /m\b/.test(s) || /m$/.test(s) || /\.\d/.test(s) === false && /^[1-2](,\d{1,2})?$/.test(s.replace(/\s/g, ""));

  // Nettoyage : retire unités et espaces, virgule → point
  const cleaned = s
    .replace(/cm|m\b|m$/g, "")
    .replace(/mètres?/g, "")
    .replace(/centim[eè]tres?/g, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".");

  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = parseFloat(cleaned);
  if (!isFinite(n) || n <= 0) return null;

  // Conversion
  if (hasCm) return n / 100;
  // Si n > 10 → c'est des cm même sans unité explicite
  if (n > 10) return n / 100;
  // Sinon, c'est des mètres
  return n;
}

// ============================================================
// RECOMMANDATION DE TAILLE
// ============================================================

/**
 * Calcule la taille recommandée pour un poids donné.
 *
 * Convention : [minWeight, maxWeight[ (borne basse incluse, haute exclue),
 * SAUF la dernière plage [104, 115] où 115 est INCLUS (cas terminal,
 * aucune plage suivante).
 *
 * @param weightKg Poids en kg (doit déjà être normalisé via parseWeight)
 * @param guide Référentiel (défaut : DEFAULT_SIZE_GUIDE)
 */
export function recommendSizeByWeight(
  weightKg: number,
  guide: SizeGuideEntry[] = DEFAULT_SIZE_GUIDE
): SizeRecommendationResult {
  if (weightKg === null || weightKg === undefined || !isFinite(weightKg) || weightKg < 0) {
    return {
      status: "invalid",
      size: null,
      label: null,
      weightRange: null,
      entry: null,
      message: "Poids invalide.",
    };
  }

  if (weightKg < 50) {
    return {
      status: "too_light",
      size: null,
      label: null,
      weightRange: null,
      entry: null,
      message: OUT_OF_RANGE_MESSAGES.tooLight,
    };
  }

  // Cas particulier 115 kg (inclus dans la dernière plage)
  if (weightKg === 115) {
    const last = guide[guide.length - 1];
    return {
      status: "ok",
      size: last.size,
      label: last.label,
      weightRange: `${last.minWeight}–${last.maxWeight}`,
      entry: last,
      message: null,
    };
  }

  // Recherche classique [min, max[
  for (const entry of guide) {
    if (weightKg >= entry.minWeight && weightKg < entry.maxWeight) {
      return {
        status: "ok",
        size: entry.size,
        label: entry.label,
        weightRange: `${entry.minWeight}–${entry.maxWeight}`,
        entry,
        message: null,
      };
    }
  }

  // > 115
  if (weightKg > 115) {
    return {
      status: "too_heavy",
      size: null,
      label: null,
      weightRange: null,
      entry: null,
      message: OUT_OF_RANGE_MESSAGES.tooHeavy,
    };
  }

  // Ne devrait pas arriver
  return {
    status: "invalid",
    size: null,
    label: null,
    weightRange: null,
    entry: null,
    message: "Poids non reconnu.",
  };
}

// ============================================================
// ALERTE HAUTEUR (PAN Mandarga v2)
// ============================================================

/**
 * Évalue la hauteur renseignée et retourne le signal éventuel.
 *
 * Nouveaux seuils (cm) :
 *   - < 175 cm → signal BELOW_175
 *   - > 195 cm → signal ABOVE_195
 *   - 175 ≤ hauteur ≤ 195 cm → aucun signal
 *
 * Le signal ne modifie jamais la recommandation de taille issue du poids.
 * Le signal ne bloque jamais la commande : il est purement informatif
 * et doit être confirmé par le client via checkbox au checkout.
 *
 * @param input Hauteur saisie (string ou number). Accepte '172 cm', '1,72 m', '172', 1.72, 175.
 * @returns HeightAlertResult avec status, message, type, checkboxLabel, heightCm, heightM.
 */
export function evaluateHeightAlert(input: string | number | null | undefined): HeightAlertResult {
  const heightM = parseHeight(input);
  if (heightM === null) {
    return {
      status: "invalid",
      message: null,
      heightM: null,
      heightCm: null,
      type: null,
      checkboxLabel: null,
    };
  }
  const heightCm = Math.round(heightM * 100);

  if (heightCm < HEIGHT_ALERTS.lowThresholdCm) {
    return {
      status: "low",
      message: HEIGHT_ALERTS.lowMessage,
      heightM,
      heightCm,
      type: HEIGHT_ALERTS.lowType, // "BELOW_175"
      checkboxLabel: HEIGHT_ALERTS.lowCheckboxLabel,
    };
  }
  if (heightCm > HEIGHT_ALERTS.highThresholdCm) {
    return {
      status: "high",
      message: HEIGHT_ALERTS.highMessage,
      heightM,
      heightCm,
      type: HEIGHT_ALERTS.highType, // "ABOVE_195"
      checkboxLabel: HEIGHT_ALERTS.highCheckboxLabel,
    };
  }
  return {
    status: "none",
    message: null,
    heightM,
    heightCm,
    type: null,
    checkboxLabel: null,
  };
}

// ============================================================
// UTILITAIRES D'AFFICHAGE
// ============================================================

/**
 * Liste les libellés distincts à afficher dans une liste de choix manuel.
 * Conserve l'ordre : S, M, L faible, L fort, XL, XXL.
 * "XXL" n'apparaît qu'une seule fois même s'il y a 2 plages.
 */
export function getDistinctSizeLabels(guide: SizeGuideEntry[] = DEFAULT_SIZE_GUIDE): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const entry of guide) {
    if (!seen.has(entry.label)) {
      seen.add(entry.label);
      labels.push(entry.label);
    }
  }
  return labels;
}

/**
 * Mappe un libellé détaillé vers la taille commerciale (pour la variante produit).
 * "L faible" → "L", "L fort" → "L", "XXL" → "XXL", etc.
 */
export function labelToSize(label: string, guide: SizeGuideEntry[] = DEFAULT_SIZE_GUIDE): string | null {
  const entry = guide.find((e) => e.label === label);
  return entry ? entry.size : null;
}

/**
 * Mappe une taille commerciale vers tous les libellés détaillés possibles.
 * "L" → ["L faible", "L fort"]
 * "XXL" → ["XXL"] (une seule entrée affichée)
 */
export function sizeToLabels(size: string, guide: SizeGuideEntry[] = DEFAULT_SIZE_GUIDE): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const entry of guide) {
    if (entry.size === size && !seen.has(entry.label)) {
      seen.add(entry.label);
      labels.push(entry.label);
    }
  }
  return labels;
}

/**
 * Vérifie si une taille commerciale est compatible avec un libellé détaillé.
 * Utile pour vérifier qu'une recommandation "L faible" correspond bien à
 * une variante "L" disponible côté produit.
 */
export function isLabelCompatibleWithSize(
  label: string,
  size: string,
  guide: SizeGuideEntry[] = DEFAULT_SIZE_GUIDE
): boolean {
  return guide.some((e) => e.label === label && e.size === size);
}
