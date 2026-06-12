import SiteHeader from "@/components/SiteHeader";
import LoginForm from "./LoginForm";

export const metadata = { title: "Admin login · SpatialCart" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const dest = from && from.startsWith("/admin") ? from : "/admin";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-sm px-5 py-16">
        <h1 className="text-2xl font-bold">Merchant sign in</h1>
        <p className="mt-2 mb-6 text-sm text-white/60">
          Enter the admin password to manage products.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <LoginForm from={dest} />
        </div>
      </main>
    </>
  );
}
