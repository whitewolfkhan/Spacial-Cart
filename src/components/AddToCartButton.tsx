"use client";

import { useState } from "react";
import { useCart } from "@/store/cart";
import { formatPrice, type Product } from "@/data/products";

export default function AddToCartButton({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  return (
    <button
      onClick={() => {
        add(product.id, 1);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="w-full rounded-xl border border-white/15 px-5 py-3 font-semibold transition hover:border-white/40"
    >
      {added ? "✓ Added" : `Add to Cart — ${formatPrice(product.priceCents)}`}
    </button>
  );
}
