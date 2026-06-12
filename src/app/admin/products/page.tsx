import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { getAllProducts } from "@/lib/products";
import { formatPrice } from "@/data/products";
import { deleteProduct } from "../actions";
import DeleteButton from "./DeleteButton";
import LogoutButton from "../LogoutButton";

export const metadata = { title: "Admin — Products · SpatialCart" };

// Always reflect the latest DB state (this page mutates via the delete action).
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await getAllProducts();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Products ({products.length})</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold hover:bg-brand-dark"
            >
              + Add product
            </Link>
            <LogoutButton />
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center text-white/60">
            No products yet.{" "}
            <Link href="/admin" className="text-brand hover:underline">
              Add the first one →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {products.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div
                  className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-xl"
                  style={{ background: `${p.accent}22`, color: p.accent }}
                >
                  ◳
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${p.id}`}
                    className="truncate font-semibold hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="truncate text-sm text-white/50">
                    {formatPrice(p.priceCents)} · {p.width}×{p.height}×{p.length} m ·{" "}
                    <span className="font-mono text-white/40">{p.modelUrl}</span>
                  </p>
                </div>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <DeleteButton />
                </form>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
