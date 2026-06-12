import { notFound } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import ArViewerClient from "@/components/ar/ArViewerClient";
import AddToCartButton from "@/components/AddToCartButton";
import { formatPrice } from "@/data/products";
import { getProductById, getAllProductIds } from "@/lib/products";

export async function generateStaticParams() {
  const ids = await getAllProductIds();
  return ids.map((id) => ({ id }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const { width, height, length } = product;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-8">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Back to catalog
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <ArViewerClient product={product} />

          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="mt-1 text-xl font-semibold text-brand">
              {formatPrice(product.priceCents)}
            </p>
            <p className="mt-4 text-white/70">{product.description}</p>

            <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
              <Dim label="Width" value={width} />
              <Dim label="Height" value={height} />
              <Dim label="Depth" value={length} />
            </dl>

            <div className="mt-6">
              <AddToCartButton product={product} />
            </div>

            <p className="mt-4 text-xs text-white/40">
              Tip: tap <span className="text-white/70">View in My Space</span> on an
              AR-capable phone to see this piece true-to-scale on your real floor.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

function Dim({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <dt className="text-white/50">{label}</dt>
      <dd className="mt-1 font-semibold">{value} m</dd>
    </div>
  );
}
