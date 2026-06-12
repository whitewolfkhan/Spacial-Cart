import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { isR2Configured } from "@/lib/r2";
import AddProductForm from "./AddProductForm";
import LogoutButton from "./LogoutButton";

export const metadata = { title: "Admin — Add product · SpatialCart" };

export default function AdminPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Add a product</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="rounded-full border border-white/15 px-4 py-1.5 text-sm hover:border-white/40"
            >
              Manage products →
            </Link>
            <LogoutButton />
          </div>
        </div>

        <p className="mb-6 text-sm text-white/60">
          Upload a <code className="text-white/80">.glb</code> model and its real-world
          dimensions. It&apos;s stored in{" "}
          {isR2Configured ? (
            <span className="text-emerald-300">Cloudflare R2</span>
          ) : (
            <span className="text-amber-300">local /public/models (R2 not configured)</span>
          )}{" "}
          and appears on the storefront immediately.
        </p>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <AddProductForm />
        </div>
      </main>
    </>
  );
}
