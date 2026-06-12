import path from "node:path";
import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 config. Holds the migrate/CLI connection URL (read from .env) and
// the seed command (which moved here from package.json#prisma.seed).
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
