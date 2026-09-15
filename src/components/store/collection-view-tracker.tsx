"use client";

import * as React from "react";

/**
 * CollectionViewTracker — déclenche un événement collection_view
 * au montage. À placer en haut de la page collection (server component).
 */
export function CollectionViewTracker({ slug, name }: { slug: string; name: string }) {
  React.useEffect(() => {
    if (slug) {
      import("@/hooks/use-analytics").then((m) => {
        m.trackCollectionView(slug, name);
      });
    }
  }, [slug, name]);
  return null;
}
