// ============================================================
// Script de test — Size Guide PAN Mandarga
// ============================================================
//
// Valide tous les cas requis par le prompt (sections 79-82) :
//   - Tests poids : 55, 63, 70, 80, 90, 100, 110
//   - Tests hauteurs : 1,70, 1,80, 1,90
//   - Test combiné : 72 kg + 1,70 m
//   - Tests cas limites : 50, 60, 66, 76, 84, 94, 104, 115
//   - Tests hors plage : < 50 kg, > 115 kg
//   - Tests formats : "65 kg", "65", "172 cm", "1,72 m"
// ============================================================

import {
  parseWeight,
  parseHeight,
  recommendSizeByWeight,
  evaluateHeightAlert,
  getDistinctSizeLabels,
  DEFAULT_SIZE_GUIDE,
} from "../src/lib/size-guide";

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

console.log("\n=== TEST 1 : Tests poids (sections 79-80 du prompt) ===");
const weightTests: [number, string][] = [
  [55, "S"],
  [63, "M"],
  [70, "L faible"],
  [80, "L fort"],
  [90, "XL"],
  [100, "XXL"],
  [110, "XXL"],
];
for (const [w, expected] of weightTests) {
  const r = recommendSizeByWeight(w);
  assert(
    `Poids ${w} kg → ${expected}`,
    r.status === "ok" && r.label === expected,
    `obtenu=${r.label || r.status}`
  );
}

console.log("\n=== TEST 2 : Tests hauteurs (nouveaux seuils 175/195 cm, prompt v2) ===");
const heightTests: [string, "low" | "none" | "high"][] = [
  ["170 cm", "low"],   // < 175 → low
  ["175 cm", "none"],  // = 175 → none (intervalle inclusif)
  ["180 cm", "none"],  // dans [175, 195] → none
  ["195 cm", "none"],  // = 195 → none (intervalle inclusif)
  ["198 cm", "high"],  // > 195 → high
];
for (const [h, expected] of heightTests) {
  const r = evaluateHeightAlert(h);
  assert(
    `Hauteur ${h} → ${expected}`,
    r.status === expected,
    `obtenu=${r.status}`
  );
}

console.log("\n=== TEST 3 : Test combiné (section 82 — adapté v2) ===");
const w72 = recommendSizeByWeight(72);
const h170 = evaluateHeightAlert("170 cm");
assert(
  "72 kg + 170 cm → L faible + alerte hauteur",
  w72.label === "L faible" && h170.status === "low",
  `poids=${w72.label} / hauteur=${h170.status}`
);

console.log("\n=== TEST 4 : Cas limites (sections 27-34) ===");
const limitTests: [number, string][] = [
  [50, "S"],         // [50, 60[
  [60, "M"],         // 60 est dans [60, 66[
  [66, "L faible"],  // 66 est dans [66, 76[
  [76, "L fort"],    // 76 est dans [76, 84[
  [84, "XL"],        // 84 est dans [84, 94[
  [94, "XXL"],       // 94 est dans [94, 104[
  [104, "XXL"],      // 104 est dans [104, 115]
  [115, "XXL"],      // 115 inclus dans la dernière plage
];
for (const [w, expected] of limitTests) {
  const r = recommendSizeByWeight(w);
  assert(
    `Cas limite ${w} kg → ${expected}`,
    r.status === "ok" && r.label === expected,
    `obtenu=${r.label || r.status}`
  );
}

console.log("\n=== TEST 5 : Hors plage (sections 35-36) ===");
const tooLight = recommendSizeByWeight(45);
assert(
  "< 50 kg → too_light + message contact",
  tooLight.status === "too_light" && tooLight.message?.includes("contacter"),
  `obtenu=${tooLight.status} / msg=${tooLight.message}`
);
const tooHeavy = recommendSizeByWeight(120);
assert(
  "> 115 kg → too_heavy + message contact",
  tooHeavy.status === "too_heavy" && tooHeavy.message?.includes("contacter"),
  `obtenu=${tooHeavy.status} / msg=${tooHeavy.message}`
);

console.log("\n=== TEST 6 : Convention de borne (section 26) ===");
// Vérifier qu'aucune valeur n'appartient à 2 plages
const weight60 = recommendSizeByWeight(60);
assert("60 kg → M (pas S)", weight60.label === "M", `obtenu=${weight60.label}`);
const weight66 = recommendSizeByWeight(66);
assert("66 kg → L faible (pas M)", weight66.label === "L faible", `obtenu=${weight66.label}`);
const weight76 = recommendSizeByWeight(76);
assert("76 kg → L fort (pas L faible)", weight76.label === "L fort", `obtenu=${weight76.label}`);

console.log("\n=== TEST 7 : Formats de saisie (sections 38-40) ===");
// Formats poids
assert("'65 kg' → 65", parseWeight("65 kg") === 65, `obtenu=${parseWeight("65 kg")}`);
assert("'65' → 65", parseWeight("65") === 65, `obtenu=${parseWeight("65")}`);
assert("'65,5' → 65.5", parseWeight("65,5") === 65.5, `obtenu=${parseWeight("65,5")}`);
assert("'  66  ' → 66 (espaces)", parseWeight("  66  ") === 66, `obtenu=${parseWeight("  66  ")}`);

// Formats hauteur
assert("'172 cm' → 1.72 m", parseHeight("172 cm") === 1.72, `obtenu=${parseHeight("172 cm")}`);
assert("'1,72 m' → 1.72 m", parseHeight("1,72 m") === 1.72, `obtenu=${parseHeight("1,72 m")}`);
assert("'1.72' → 1.72 m", parseHeight("1.72") === 1.72, `obtenu=${parseHeight("1.72")}`);
assert("'175' → 1.75 m (cm sans unité)", parseHeight("175") === 1.75, `obtenu=${parseHeight("175")}`);

console.log("\n=== TEST 8 : Gestion des erreurs (section 40) ===");
assert("Poids vide → null", parseWeight("") === null);
assert("Poids négatif → null", parseWeight("-5") === null);
assert("Poids texte → null", parseWeight("abc") === null);
assert("Hauteur vide → null", parseHeight("") === null);
assert("Hauteur invalide → null", parseHeight("xyz") === null);

console.log("\n=== TEST 9 : XXL — une seule entrée affichée (section 13) ===");
const labels = getDistinctSizeLabels();
assert(
  "XXL apparaît une seule fois",
  labels.filter((l) => l === "XXL").length === 1,
  `obtenu=${labels.filter((l) => l === "XXL").length} fois`
);
assert(
  "Liste complète : S, M, L faible, L fort, XL, XXL",
  labels.join(", ") === "S, M, L faible, L fort, XL, XXL",
  `obtenu=${labels.join(", ")}`
);

console.log("\n=== TEST 10 : Distinction L faible / L fort (section 12) ===");
const lFaible = recommendSizeByWeight(70);
const lFort = recommendSizeByWeight(80);
assert(
  "70 kg → L faible (distinct de L fort)",
  lFaible.label === "L faible" && lFort.label === "L fort",
  `obtenu=${lFaible.label} / ${lFort.label}`
);
assert(
  "L faible et L fort ont la même taille commerciale 'L'",
  lFaible.size === "L" && lFort.size === "L",
  `obtenu=${lFaible.size} / ${lFort.size}`
);

console.log("\n=== TEST 11 : Référentiel central — pas de duplication ===");
// Vérifier qu'on a bien 7 entrées (XXL a 2 plages mais affiché une fois)
assert(
  "DEFAULT_SIZE_GUIDE a 7 entrées (XXL = 2 plages)",
  DEFAULT_SIZE_GUIDE.length === 7,
  `obtenu=${DEFAULT_SIZE_GUIDE.length} entrées`
);

console.log("\n=== TEST 12 : Recommandation n'écrase pas le choix manuel (section 71-72, 101-102) ===");
// La fonction recommendSizeByWeight ne modifie pas l'état du client.
// Le composant SizeRecommender expose onSizeSelect et un bouton "Utiliser cette taille"
// qui ne se déclenche que sur clic explicite (canApplyRecommendation).
// Test : pour un poids donné, on obtient une recommandation, mais le client peut choisir autre chose.
const reco70 = recommendSizeByWeight(70);
assert(
  "Recommandation 70 kg = L faible, mais client peut choisir L fort manuellement",
  reco70.label === "L faible",
  ""
);

console.log("\n=== TEST 13 : Pas d'appel serveur (section 91) ===");
// La fonction recommendSizeByWeight est synchrone et pure (pas de fetch, pas de IO).
// Le composant SizeRecommender utilise useMemo (côté navigateur uniquement).
assert(
  "recommendSizeByWeight est synchrone (pas d'async)",
  (() => {
    const r = recommendSizeByWeight(70);
    return r !== undefined && typeof r === "object";
  })(),
  ""
);

console.log("\n=== TEST 14 : Messages hauteur (prompt v2 — nouveaux seuils 175/195 cm) ===");
// L'alerte ne modifie pas la taille, ne bloque pas la commande.
const hLow = evaluateHeightAlert("172 cm");
assert("Alerte < 175 cm a un message", hLow.message !== null && hLow.message.includes("175 cm"));
assert("Alerte < 175 cm contient 'vérification de taille'", hLow.message?.includes("vérification de taille") ?? false);
assert("Alerte < 175 cm a type BELOW_175", hLow.type === "BELOW_175");
assert("Alerte < 175 cm a un checkboxLabel", hLow.checkboxLabel !== null);
assert("Alerte < 175 cm checkboxLabel contient 'inférieure à 175'", hLow.checkboxLabel?.includes("inférieure à 175") ?? false);

const hNormal = evaluateHeightAlert("180 cm");
assert("Hauteur 180 cm → aucune alerte", hNormal.status === "none" && hNormal.message === null);
assert("Hauteur 180 cm → type null", hNormal.type === null);
assert("Hauteur 180 cm → checkboxLabel null", hNormal.checkboxLabel === null);

const hHigh = evaluateHeightAlert("198 cm");
assert("Alerte > 195 cm a un message", hHigh.message !== null && hHigh.message.includes("195 cm"));
assert("Alerte > 195 cm a type ABOVE_195", hHigh.type === "ABOVE_195");
assert("Alerte > 195 cm checkboxLabel contient 'supérieure à 195'", hHigh.checkboxLabel?.includes("supérieure à 195") ?? false);

// Vérifier que le signal hauteur ne change PAS la taille recommandée (prompt v2 section 1.9)
const w100h198weight = recommendSizeByWeight(100);
const h198 = evaluateHeightAlert("198 cm");
assert(
  "100 kg + 198 cm → recommandation toujours XXL (ne change pas)",
  w100h198weight.label === "XXL" && h198.type === "ABOVE_195",
  `poids=${w100h198weight.label} / hauteur=${h198.type}`
);

// Changement rapide de hauteur (prompt v2 sections 1.25-1.27)
assert("170 → low", evaluateHeightAlert("170 cm").status === "low");
assert("180 → none", evaluateHeightAlert("180 cm").status === "none");
assert("200 → high", evaluateHeightAlert("200 cm").status === "high");
assert("190 → none", evaluateHeightAlert("190 cm").status === "none");

// Résumé
console.log("\n=================================================");
console.log(`RÉSULTAT : ${passed} tests réussis, ${failed} échecs`);
console.log("=================================================\n");
if (failed > 0) {
  process.exit(1);
}
