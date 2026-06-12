"use client";

import Link from "next/link";
import { useState } from "react";
import SiteHeader from "@/components/SiteHeader";
import { useCart, useCartDetails } from "@/store/cart";
import { formatPrice } from "@/data/products";

export default function CartPage() {
  const { lines, totalCents } = useCartDetails();
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const [loading, setLoading] = useState(false);

  async function checkout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Checkout failed");
        setLoading(false);
      }
    } catch {
      alert("Checkout request failed.");
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold">Your cart</h1>

        {lines.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
            Your cart is empty.{" "}
            <Link href="/" className="text-brand hover:underline">
              Browse the catalog →
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {lines.map(({ product, qty }) => (
                <li
                  key={product.id}
                  className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div
                    className="grid h-16 w-16 shrink-0 place-items-center rounded-xl text-2xl"
                    style={{ background: `${product.accent}22`, color: product.accent }}
                  >
                    ◳
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{product.name}</p>
                    <p className="text-sm text-white/50">
                      {formatPrice(product.priceCents)}
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) =>
                      setQty(product.id, parseInt(e.target.value || "1", 10))
                    }
                    className="w-16 rounded-lg border border-white/15 bg-transparent px-2 py-1 text-center"
                  />
                  <button
                    onClick={() => remove(product.id)}
                    className="text-sm text-white/40 hover:text-white"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <span className="text-white/60">Total</span>
              <span className="text-xl font-bold">{formatPrice(totalCents)}</span>
            </div>

            <button
              onClick={checkout}
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-brand px-5 py-3 font-semibold transition hover:bg-brand-dark disabled:opacity-50"
            >
              {loading ? "Redirecting to checkout…" : "Checkout with Stripe"}
            </button>
          </>
        )}
      </main>
    </>
  );
}
