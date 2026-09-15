"use client";

import * as React from "react";
import { useCartStore } from "@/lib/cart-store";

// Forces the cart badge to render 0 on first paint (matching server) then
// update after hydration to avoid mismatch warnings.
export function CartHydration({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  // ensure store is hydrated from localStorage
  React.useEffect(() => {
    void useCartStore.persist?.rehydrate?.();
  }, []);
  if (!mounted) return null;
  return <>{children}</>;
}
