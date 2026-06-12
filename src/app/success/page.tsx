"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { useCart } from "@/store/cart";
import { formatPrice } from "@/data/products";

function SuccessContent() {
  const clear = useCart((s) => s.clear);
  const params = useSearchParams();

  useEffect(() => {
    clear();
  }, [clear]);

  const isMock = params.get("mock") === "1";
  const totalRaw = params.get("total");
  const total = totalRaw ? parseInt(totalRaw, 10) : null;

  return (
    <main className="mx-auto max-w-lg px-5 py-20 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-3xl">
        ✓
      </div>
      <h1 className="mt-6 text-2xl font-bold">Order confirmed</h1>
      <p className="mt-2 text-white/60">
        Thanks for shopping with SpatialCart.
        {isMock && total !== null && (
          <>
            {" "}
            You were charged{" "}
            <span className="font-semibold text-white">{formatPrice(total)}</span>{" "}
            (mock checkout — no real payment).
          </>
        )}
      </p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-xl bg-brand px-6 py-3 font-semibold hover:bg-brand-dark"
      >
        Keep shopping
      </Link>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <>
      <SiteHeader />
      {/* useSearchParams requires a Suspense boundary during prerender. */}
      <Suspense fallback={<div className="py-20 text-center text-white/50">…</div>}>
        <SuccessContent />
      </Suspense>
    </>
  );
}
