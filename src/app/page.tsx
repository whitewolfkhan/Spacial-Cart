import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { formatPrice } from "@/data/products";
import { getAllProducts } from "@/lib/products";

export default async function HomePage() {
  const products = await getAllProducts();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-10">
        <section className="mb-10">
          <h1 className="text-3xl font-bold sm:text-4xl">
            See it in your space before you buy.
          </h1>
          <p className="mt-3 max-w-xl text-white/70">
            Tap <span className="font-semibold text-white">View in My Space</span> on any
            product to drop a true-to-scale 3D model into your room with your phone&apos;s
            camera — then add it to your cart without leaving AR.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/30 hover:bg-white/[0.06]"
            >
              <div
                className="mb-4 grid h-40 place-items-center rounded-xl text-5xl"
                style={{ background: `${p.accent}22`, color: p.accent }}
              >
                ◳
              </div>
              <h2 className="font-semibold">{p.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-white/60">{p.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-semibold">{formatPrice(p.priceCents)}</span>
                <span className="text-sm text-brand group-hover:underline">
                  View in My Space →
                </span>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
