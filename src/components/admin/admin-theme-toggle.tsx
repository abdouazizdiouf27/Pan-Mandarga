"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================
// AdminThemeToggle — bouton clair/sombre du BACK-OFFICE
// ============================================================
//
// IMPORTANT (prompt v3 — Partie 2, sections 31-37) :
//   Ce bouton est placé DANS le header du back-office (AdminTopbar
//   côté desktop, MobileTopbar côté mobile) — il n'utilise PLUS
//   position:absolute (qui le superposait au bouton "Voir le site").
//
//   Il est maintenant un simple <Button> placé dans le flex container
//   du header, à côté de "Voir le site". Pas de chevauchement possible.
//
//   Indépendance thème front/back (prompt v3 §40-48) :
//   Ce bouton utilise le hook useTheme() de next-themes. Comme il est
//   rendu à l'intérieur du <SmartThemeProvider> du root layout (qui
//   choisit dynamiquement storageKey selon la route via usePathname()),
//   il ne lit/modifie QUE la clé admin "pan-mandarga-admin-theme" car
//   le pathname commence par "/admin". Aucun impact sur le front-office.
//
// Variantes :
//   - size="icon" (défaut, pour usage desktop header)
//   - size="icon-sm" (pour mobile, plus petit)
//   - variant="ghost" par défaut, mais peut être overridé
//
// Pas de flash : on attend le montage avant d'afficher l'icône.

export function AdminThemeToggle({
  className,
  size = "icon",
  variant = "ghost",
}: {
  className?: string;
  size?: "icon" | "icon-sm" | "sm";
  variant?: "ghost" | "outline" | "default";
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const current = theme === "system" ? resolvedTheme : theme;
  const isDark = current === "dark";

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        aria-label="Changer de thème"
        className={className}
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      aria-label={isDark ? "Passer le back-office en mode clair" : "Passer le back-office en mode sombre"}
      title={isDark ? "Mode clair" : "Mode sombre"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={className}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
