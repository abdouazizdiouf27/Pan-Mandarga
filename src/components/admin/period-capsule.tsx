"use client";

import * as React from "react";

export type PeriodKey = "7d" | "30d" | "4w" | "month" | "year";

type Option = { key: PeriodKey; label: string };

/**
 * PeriodCapsule — sélecteur de période dans une enveloppe capsule premium.
 *
 * Style :
 *   - Enveloppe commune ovale (rounded-full, fond muted, border subtle)
 *   - Bouton actif : fond accent ou foreground, texte contrasté, slight scale
 *   - Transition fluide 200ms
 *
 * Props :
 *   - options : liste des périodes autorisées (passées par le parent)
 *   - value : période active
 *   - onChange : callback quand on change
 *   - tone : "accent" (gold) par défaut ; "foreground" (noir) pour le financier
 *
 * Réutilisable pour les sélecteurs de période des deux volets
 * (Finance + Fréquentation) afin d'assurer la cohérence visuelle.
 */
export function PeriodCapsule({
  options,
  value,
  onChange,
  tone = "accent",
  ariaLabel = "Sélecteur de période",
}: {
  options: Option[];
  value: PeriodKey;
  onChange: (p: PeriodKey) => void;
  tone?: "accent" | "foreground";
  ariaLabel?: string;
}) {
  const activeBg = tone === "accent" ? "bg-accent text-accent-foreground" : "bg-foreground text-background";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 p-1 rounded-full border border-border/60 bg-muted/40 backdrop-blur-sm"
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            className={
              "px-3 py-1.5 text-[11px] uppercase tracking-premium rounded-full transition-all duration-200 " +
              (active
                ? `${activeBg} shadow-premium-sm font-medium`
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
