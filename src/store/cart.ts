import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clientCatalog, type Product } from "@/data/products";

export type CartLine = {
  productId: string;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  add: (productId: string, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (productId, qty = 1) =>
        set((state) => {
          const existing = state.lines.find((l) => l.productId === productId);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === productId ? { ...l, qty: l.qty + qty } : l,
              ),
            };
          }
          return { lines: [...state.lines, { productId, qty }] };
        }),
      remove: (productId) =>
        set((state) => ({
          lines: state.lines.filter((l) => l.productId !== productId),
        })),
      setQty: (productId, qty) =>
        set((state) => ({
          lines:
            qty <= 0
              ? state.lines.filter((l) => l.productId !== productId)
              : state.lines.map((l) =>
                  l.productId === productId ? { ...l, qty } : l,
                ),
        })),
      clear: () => set({ lines: [] }),
    }),
    { name: "spatialcart-cart" },
  ),
);

/** Hydrate cart lines into full product objects with computed totals. */
export function useCartDetails() {
  const lines = useCart((s) => s.lines);
  const detailed = lines
    .map((line) => {
      const product = clientCatalog[line.productId];
      return product ? { product, qty: line.qty } : null;
    })
    .filter((x): x is { product: Product; qty: number } => x !== null);

  const totalCents = detailed.reduce(
    (sum, { product, qty }) => sum + product.priceCents * qty,
    0,
  );
  const count = detailed.reduce((sum, { qty }) => sum + qty, 0);

  return { lines: detailed, totalCents, count };
}
