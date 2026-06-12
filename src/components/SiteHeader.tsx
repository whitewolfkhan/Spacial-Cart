"use client";

import Link from "next/link";
import { useCartDetails } from "@/store/cart";

export default function SiteHeader() {
  const { count } = useCartDetails();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0c0c12]/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-sm">
            ◧
          </span>
          SpatialCart
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 hover:border-white/40 hover:text-white"
          >
            Admin
          </Link>
          <Link
            href="/cart"
            className="relative rounded-full border border-white/15 px-4 py-1.5 text-sm hover:border-white/40"
          >
            Cart
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs font-bold">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
