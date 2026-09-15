"use client";

import { useAnalytics } from "@/hooks/use-analytics";

/**
 * Composant client qui déclenche le tracking page_view automatiquement
 * à chaque changement de route côté storefront.
 *
 * À placer dans le layout root du storefront (route group `(storefront)`).
 * Ne tracke PAS les routes /admin et /api (filtré dans le hook).
 */
export function AnalyticsTracker() {
  useAnalytics();
  return null;
}
