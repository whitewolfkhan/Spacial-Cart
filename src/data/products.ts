// Client-safe product shape + helpers. This module contains NO Prisma imports
// so it can be used from client components (cart store, AR viewer). The actual
// catalog is read from Postgres via src/lib/products.ts on the server.

/**
 * Mirrors the Prisma `Product` row (minus DB-only timestamps). Dimensions are
 * flat metres: `length` is front-to-back depth, used for true-to-scale AR.
 */
export type Product = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  length: number;
  width: number;
  height: number;
  /** R2 object key for the .glb, e.g. "models/sofa.glb". Resolve to a fetchable
   *  URL via GET /api/models?productId=… (signed in prod, /public locally). */
  modelUrl: string;
  accent: string;
};

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/**
 * Lightweight client-side catalog snapshot. The cart store runs in the browser
 * and can't query Prisma, so it hydrates persisted cart line IDs into display
 * metadata from here. Kept in sync with the DB seed; the server pages and
 * checkout always read the authoritative catalog from Postgres.
 */
export const clientCatalog: Record<string, Product> = {
  "coffee-table-oak": {
    id: "coffee-table-oak",
    name: "Aalto Oak Coffee Table",
    description:
      "Solid white-oak top on a powder-coated steel frame. The classic SpatialCart demo piece.",
    priceCents: 29900,
    length: 0.6,
    width: 1.1,
    height: 0.45,
    modelUrl: "models/coffee-table.glb",
    accent: "#b8895b",
  },
  "sofa-cloud": {
    id: "sofa-cloud",
    name: "Cloud Modular Sofa",
    description:
      "Three-seat modular sofa with deep feather-blend cushions. See if it really fits next to your TV.",
    priceCents: 149900,
    length: 0.95,
    width: 2.2,
    height: 0.85,
    modelUrl: "models/sofa.glb",
    accent: "#7b8a99",
  },
  "floor-lamp-arc": {
    id: "floor-lamp-arc",
    name: "Arc Floor Lamp",
    description:
      "Brushed-brass arc lamp with a marble base. Casts a warm, true-to-scale glow in AR.",
    priceCents: 18900,
    length: 1.2,
    width: 0.5,
    height: 1.8,
    modelUrl: "models/lamp.glb",
    accent: "#caa84a",
  },
};
