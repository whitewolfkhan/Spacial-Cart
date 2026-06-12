import "server-only";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/data/products";

// Server-only catalog access backed by Postgres. The `server-only` import makes
// the build fail loudly if this is ever pulled into a client bundle.

const SELECT = {
  id: true,
  name: true,
  description: true,
  priceCents: true,
  length: true,
  width: true,
  height: true,
  modelUrl: true,
  accent: true,
} as const;

export async function getAllProducts(): Promise<Product[]> {
  try {
    return await prisma.product.findMany({
      select: SELECT,
      orderBy: { priceCents: "asc" },
    });
  } catch (err) {
    // During a build the DB may not be migrated/seeded yet. Don't crash the
    // build — render an empty catalog; it fills in once the DB is ready.
    console.warn("[products] getAllProducts failed (DB not ready?):", err);
    return [];
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  return prisma.product.findUnique({
    where: { id },
    select: SELECT,
  });
}

/** Just the IDs — used by generateStaticParams to prerender product pages. */
export async function getAllProductIds(): Promise<string[]> {
  try {
    const rows = await prisma.product.findMany({ select: { id: true } });
    return rows.map((r) => r.id);
  } catch (err) {
    // No DB tables yet at build time → no static params; pages render on demand.
    console.warn("[products] getAllProductIds failed (DB not ready?):", err);
    return [];
  }
}
