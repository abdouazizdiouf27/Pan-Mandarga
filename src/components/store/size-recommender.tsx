"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  parseWeight,
  recommendSizeByWeight,
  getDistinctSizeLabels,
  DEFAULT_SIZE_GUIDE,
  type SizeRecommendationResult,
} from "@/lib/size-guide";

// ============================================================
// SizeRecommender — composant réutilisable (PAN Mandarga v5)
// ============================================================
//
// RECONCEPTION UX/UI (prompt v5) :
//   - Très compact, sans textes explicatifs
//   - Hiérarchie claire : Poids → Recommandation (badge) → Tailles
//   - Aucun paragraphe du type "Choisissez manuellement..." ou
//     "Votre choix est conservé"
//   - Boutons de taille compacts (proportionnels à la fiche)
//   - Padding réduit, espaces respirants mais sans excès
//
// AUCUN champ de hauteur ici (prompt v3/v5 §22) — le signal de hauteur
// est géré par <HeightSignalButtons /> placé APRÈS les tailles.

export type SizeRecommenderProps = {
  availableSizes?: string[];
  selectedSize?: string | null;
  onSizeSelect: (size: string | null) => void;
  className?: string;
};

export function SizeRecommender({
  availableSizes,
  selectedSize,
  onSizeSelect,
  className,
}: SizeRecommenderProps) {
  const [weightInput, setWeightInput] = React.useState("");

  const weightKg = React.useMemo(() => parseWeight(weightInput), [weightInput]);
  const recommendation: SizeRecommendationResult | null = React.useMemo(() => {
    if (weightKg === null) return null;
    return recommendSizeByWeight(weightKg);
  }, [weightKg]);

  // Tous les libellés du guide (S, M, L faible, L fort, XL, XXL).
  //
  // NOTE (prompt v6) : on affiche TOUS les intervalles du guide, même si le
  // produit n'a pas toutes les tailles en stock. L'objectif est que le client
  // puisse voir la correspondance complète taille↔poids. Le client peut
  // cliquer sur n'importe quelle taille pour la sélectionner manuellement.
  //
  // Si availableSizes est fourni ET restrictif (pas de XXL par ex.), on filtre
  // quand même pour ne pas montrer une taille que le produit ne propose pas.
  // Mais on n'enlève jamais les intervalles des tailles qui SONT dispo.
  const detailedLabels = React.useMemo(() => {
    const allLabels = getDistinctSizeLabels(DEFAULT_SIZE_GUIDE);
    if (!availableSizes || availableSizes.length === 0) return allLabels;
    return allLabels.filter((label) => {
      const entry = DEFAULT_SIZE_GUIDE.find((e) => e.label === label);
      return entry && availableSizes.includes(entry.size);
    });
  }, [availableSizes]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Champ poids compact — label et input sur une seule ligne sur desktop */}
      <div className="flex items-center gap-3">
        <label htmlFor="size-rec-weight" className="text-[11px] uppercase tracking-premium text-muted-foreground whitespace-nowrap">
          Poids
        </label>
        <Input
          id="size-rec-weight"
          type="text"
          inputMode="decimal"
          placeholder="72 kg"
          value={weightInput}
          onChange={(e) => setWeightInput(e.target.value)}
          autoComplete="off"
          aria-label="Votre poids en kilogrammes"
          className="h-9 max-w-[120px] text-sm"
        />
      </div>

      {/* Recommandation — badge simple, sans phrase explicative */}
      {recommendation?.status === "ok" && recommendation.label && (
        <button
          type="button"
          onClick={() => onSizeSelect(recommendation.label)}
          className="inline-flex items-baseline gap-2 text-xs group"
          aria-label={`Sélectionner la taille recommandée : ${recommendation.label}`}
        >
          <span className="uppercase tracking-premium text-muted-foreground">
            Recommandé
          </span>
          <span className="font-serif text-base font-medium text-accent underline-offset-4 group-hover:underline">
            {recommendation.label}
          </span>
        </button>
      )}
      {(recommendation?.status === "too_light" || recommendation?.status === "too_heavy") && (
        <p className="text-xs text-muted-foreground italic">
          {recommendation.message}
        </p>
      )}

      {/* Tailles — boutons avec intervalle de poids affiché dessous (prompt v6)
          Disposition : grille compacte, chaque "cellule" contient le bouton +
          l'intervalle en dessous. Reste lisible sur mobile et desktop. */}
      {detailedLabels.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {detailedLabels.map((label) => {
            const entry = DEFAULT_SIZE_GUIDE.find((e) => e.label === label);
            const rangeText = entry ? `${entry.minWeight}–${entry.maxWeight} kg` : "";
            const isSelected = selectedSize === label;
            const isRecommended = recommendation?.status === "ok" && recommendation.label === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => onSizeSelect(label)}
                aria-pressed={isSelected}
                title={rangeText}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 border rounded-sm text-xs transition-all duration-200 min-w-0",
                  isSelected
                    ? "border-foreground bg-foreground text-background font-medium"
                    : isRecommended
                    ? "border-accent text-accent hover:bg-accent/10"
                    : "border-border/60 hover:border-foreground"
                )}
              >
                <span className="leading-tight">{label}</span>
                {rangeText && (
                  <span
                    className={cn(
                      "text-[10px] leading-tight tracking-tight",
                      isSelected
                        ? "text-background/70"
                        : isRecommended
                        ? "text-accent/80"
                        : "text-muted-foreground/80"
                    )}
                  >
                    {rangeText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
