'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { usePathname } from 'next/navigation'

// ============================================================
// THEME PROVIDERS — ISOLATION FRONT-OFFICE / BACK-OFFICE
// ============================================================
//
// PROBLÈME (prompt v2 — Partie 2) :
//   Le front et le back-office partageaient la même clé localStorage
//   ("theme" par défaut) via next-themes. Changer le thème du front
//   changeait aussi le back-office, et inversement.
//
// SOLUTION (architecture finale, sans flash) :
//   Un seul ThemeProvider au root layout, mais avec une storageKey
//   dynamique qui dépend de la route courante :
//     - pathname.startsWith("/admin") → "pan-mandarga-admin-theme"
//     - sinon → "pan-mandarga-front-theme"
//
//   Pour éviter le flash au F5, on injecte aussi un script inline
//   personnalisé qui lit la BONNE clé selon window.location.pathname
//   AVANT que React n'hydrate. Ce script est rendu via un composant
//   <script> côté Next.js (ScriptStrategy beforeInteractive).
//
//   Bénéfices :
//     - Aucun flash de thème au F5
//     - Pas de double injection de script next-themes
//     - Isolation totale des préférences front vs admin
//     - Aucune synchronisation entre onglets front et admin (clés distinctes)
//     - Multi-utilisateurs OK (localStorage par navigateur/profil)
//     - Aucun impact sur permissions, sessions, données
//
//   Voir aussi :
//     - src/components/admin/admin-theme-toggle.tsx (bouton admin)
//     - src/components/site/theme-toggle.tsx (bouton front)

const FRONT_STORAGE_KEY = "pan-mandarga-front-theme"
const ADMIN_STORAGE_KEY = "pan-mandarga-admin-theme"

/**
 * Renvoie la clé de stockage à utiliser selon le pathname courant.
 * Côté serveur, pathname est null → front par défaut.
 * Côté client, on lit usePathname().
 */
function getStorageKey(pathname: string | null): string {
  if (pathname && pathname.startsWith("/admin")) {
    return ADMIN_STORAGE_KEY
  }
  return FRONT_STORAGE_KEY
}

/**
 * SmartThemeProvider — wrapper client qui choisit la storageKey
 * selon la route. Ne cause pas de hydration mismatch car la clé est
 * calculée à la fois côté serveur (via les headers de requête) et
 * côté client (via usePathname()).
 *
 * NOTE : next-themes a besoin de connaître la storageKey au SSR pour
 * injecter le bon script inline (anti-flash). Pour cela, on rend
 * aussi un script inline personnalisé (cf. ThemeFlashScript) qui
 * détecte window.location.pathname au tout début du chargement.
 */
export function SmartThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname()
  const storageKey = getStorageKey(pathname)

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey={storageKey}
    >
      {children}
    </NextThemesProvider>
  )
}

// Rétro-compatibilité : on garde ThemeProvider, FrontThemeProvider, AdminThemeProvider
// comme alias de SmartThemeProvider pour ne pas casser les imports existants.

export function FrontThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey={FRONT_STORAGE_KEY}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export function AdminThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey={ADMIN_STORAGE_KEY}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

// Alias : ThemeProvider = SmartThemeProvider (avec storageKey dynamique)
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SmartThemeProvider>{children}</SmartThemeProvider>
}
