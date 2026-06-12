import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * The three placeholder products that previously lived in src/data/products.ts.
 * `length` is the front-to-back depth; all dimensions are in metres.
 * `modelUrl` stores the R2 object KEY (e.g. "models/sofa.glb"), not a local
 * path — the /api/models route turns it into a signed URL (or a local /public
 * path when R2 isn't configured).
 */
const products = [
  {
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
  {
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
  {
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
];

async function main() {
  for (const p of products) {
    // Idempotent: re-running the seed updates rather than duplicating.
    await prisma.product.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
    console.log(`seeded ${p.id}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
