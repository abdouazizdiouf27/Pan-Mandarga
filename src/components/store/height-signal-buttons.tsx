"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, X } from "lucide-react";

// ============================================================
// HeightSignalButtons — 2 boutons de signalement de hauteur
// ============================================================
//
// RECONCEPTION UX/UI (prompt v5 §21, §23, §41) :
//   - Très discret : visuellement secondaire
//   - Ne doit pas concurrencer taille / prix / acheter
//   - Compact : 2 petits boutons inline, pas de gros bloc
//   - Libellé court : "Hauteur < 175 cm" / "Hauteur > 195 cm"
//   - Une fois cliqué : juste une bordure dorée + petit X pour annuler
//
// AUCUN champ de saisie (prompt §22).

export type HeightSignalType = "BELOW_175" | "ABOVE_195" | null;

export type HeightSignalButtonsProps = {
  selected?: HeightSignalType;
  onChange: (signal: HeightSignalType) => void;
  className?: string;
};

export function HeightSignalButtons({
  selected,
  onChange,
  className,
}: HeightSignalButtonsProps) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      <SignalButton
        label="Hauteur < 175 cm"
        type="BELOW_175"
        selected={selected === "BELOW_175"}
        onClick={() => onChange(selected === "BELOW_175" ? null : "BELOW_175")}
      />
      <SignalButton
        label="Hauteur > 195 cm"
        type="ABOVE_195"
        selected={selected === "ABOVE_195"}
        onClick={() => onChange(selected === "ABOVE_195" ? null : "ABOVE_195")}
      />
    </div>
  );
}

function SignalButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  type: HeightSignalType;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group inline-flex items-center gap-1 h-8 px-2.5 border rounded-sm text-[11px] transition-all duration-200",
        selected
          ? "border-accent text-accent bg-accent/5"
          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      <AlertTriangle
        className={cn("h-3 w-3 shrink-0", selected ? "text-accent" : "text-muted-foreground/60")}
        aria-hidden="true"
      />
      <span className="leading-tight">{label}</span>
      {selected && (
        <X
          className="h-3 w-3 ml-0.5 shrink-0 opacity-70 group-hover:opacity-100"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
