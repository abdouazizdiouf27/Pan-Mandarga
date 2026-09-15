"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Type du signal de hauteur (prompt v3 — Partie 1)
// Seules 2 valeurs possibles, plus null si pas de signal.
export type HeightSignalType = "BELOW_175" | "ABOVE_195" | null;

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  variantId?: string;
  variantName?: string;
  size?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
  customization?: boolean;
  customizationDetails?: string;
  customizationFee: number;
  image: string;
  // unique key for variant+size+customization combination
  lineKey: string;
  // === Signal de hauteur (prompt v3 — Partie 1, §13, §20) ===
  // Stocké par ligne, propagé jusqu'à la commande.
  // heightSignal = "BELOW_175" | "ABOVE_195" | null
  // AUCUNE hauteur exacte n'est stockée (prompt §14, §27).
  heightSignal?: HeightSignalType;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.lineKey === item.lineKey);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.lineKey === item.lineKey
                  ? { ...i, quantity: i.quantity + item.quantity }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (lineKey) =>
        set((state) => ({
          items: state.items.filter((i) => i.lineKey !== lineKey),
        })),
      updateQuantity: (lineKey, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.lineKey === lineKey
              ? { ...i, quantity: Math.max(1, quantity) }
              : i
          ),
        })),
      setQuantity: (lineKey, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.lineKey === lineKey
              ? { ...i, quantity: Math.max(1, quantity) }
              : i
          ),
        })),
      clearCart: () => set({ items: [] }),
    }),
    { name: "pan-mandarga-cart" }
  )
);

// Selectors
export const cartCount = (state: CartState) =>
  state.items.reduce((acc, i) => acc + i.quantity, 0);

export const cartSubtotal = (state: CartState) =>
  state.items.reduce(
    (acc, i) =>
      acc +
      (i.unitPrice + (i.customization ? i.customizationFee : 0)) * i.quantity,
    0
  );
