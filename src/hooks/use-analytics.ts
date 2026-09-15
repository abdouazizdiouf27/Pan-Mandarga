"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * Hook useAnalytics — déclenche un événement page_view à chaque changement de route.
 *
 * - Non bloquant : utilise `navigator.sendBeacon` si dispo, fallback `fetch` keepalive.
 * - Déduplique les appels multiples sur la même route (React 18 strict mode).
 * - Pas de données personnelles : le visitorId est géré par le serveur via cookie HTTP-only.
 *
 * À utiliser dans le layout root du front-office public (storefront).
 */

// Map globale pour dédupliquer en strict mode (double render)
const lastSent: Record<string, number> = {};

export function trackPageView(pathname: string, label?: string) {
  if (typeof window === "undefined") return;
  if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) {
    // On ne tracke pas les pages admin ni les routes API
    return;
  }

  // Déduplication : pas plus d'un événement par path/seconde
  const key = pathname + "|" + (label || "");
  const now = Date.now();
  if (lastSent[key] && now - lastSent[key] < 1000) return;
  lastSent[key] = now;

  const payload = JSON.stringify({
    type: "page_view",
    path: pathname,
    label: label || null,
    sessionId: getSessionId(),
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
      return;
    }
  } catch {
    // ignore
  }

  // Fallback fetch keepalive
  try {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore — non bloquant
  }
}

export function trackProductView(slug: string, label?: string) {
  if (typeof window === "undefined") return;
  const key = "product:" + slug + "|" + (label || "");
  const now = Date.now();
  if (lastSent[key] && now - lastSent[key] < 2000) return;
  lastSent[key] = now;

  const payload = JSON.stringify({
    type: "product_view",
    path: "/products/" + slug,
    label: label || null,
    sessionId: getSessionId(),
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
      return;
    }
  } catch {}
  try {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function trackCollectionView(slug: string, label?: string) {
  if (typeof window === "undefined") return;
  const key = "collection:" + slug + "|" + (label || "");
  const now = Date.now();
  if (lastSent[key] && now - lastSent[key] < 2000) return;
  lastSent[key] = now;

  const payload = JSON.stringify({
    type: "collection_view",
    path: "/collections/" + slug,
    label: label || null,
    sessionId: getSessionId(),
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/track", blob);
      return;
    }
  } catch {}
  try {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

// Session ID côté client — pour dédupliquer les événements
// Le serveur émet aussi un cookie session, mais celui-ci est pour le payload.
function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let sid = sessionStorage.getItem("pan_session");
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem("pan_session", sid);
    }
    return sid;
  } catch {
    return null;
  }
}

/**
 * Hook qui automatise le tracking page_view sur chaque changement de route.
 * À placer dans le layout root du storefront.
 */
export function useAnalytics() {
  const pathname = usePathname();
  React.useEffect(() => {
    if (pathname) trackPageView(pathname);
  }, [pathname]);
}
