# SpatialCart — AR Viewer Slice

See furniture in your real space with WebXR AR, then check out without leaving AR.
This is the **AR viewer vertical slice** of SpatialCart: a Next.js storefront where
**View in My Space** launches an immersive AR session, drops a true-to-scale 3D model
onto the detected floor, and lets you place / rotate / scale it and add to cart from a
floating UI over the camera feed.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| 3D / AR | React Three Fiber 9, @react-three/drei 10, @react-three/xr 6 (WebXR) |
| Catalog | PostgreSQL + Prisma 7 (pg driver adapter) |
| Styling | Tailwind CSS |
| State | Zustand (persisted cart) |
| Checkout | Stripe (test mode) with a keyless **mock fallback** |

> **Dependency alignment matters.** R3F 9 / drei 10 require **React 19**, and Next 15
> ships React 19. Pairing R3F **8** (React 18) with Next 15 causes a runtime
> `ReactCurrentOwner` crash from a mismatched `react-reconciler`. Keep React, react-dom,
> fiber, and drei on the same major.

## Run it

```bash
npm install

# 1. Point DATABASE_URL at a Postgres instance (see .env), then:
npm run db:migrate     # apply migrations (creates the products table)
npm run db:seed        # load the 3 catalog products

npm run dev            # http://localhost:3000
```

Generate the placeholder 3D models (already committed under `public/models/`):

```bash
node scripts/generate-models.mjs
```

### Database (PostgreSQL + Prisma)

The catalog lives in Postgres. Set `DATABASE_URL` in `.env` (gitignored), e.g.:

```
DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/spatialcart?schema=public"
```

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | `prisma migrate dev` — apply / create migrations |
| `npm run db:seed`    | upsert the 3 products from `prisma/seed.ts` (idempotent) |
| `npm run db:reset`   | drop, re-migrate, and re-seed |
| `npm run db:studio`  | open Prisma Studio |

**Prisma 7 notes:** the datasource `url` lives in `prisma.config.ts` (not the schema), and
the runtime `PrismaClient` uses the `@prisma/adapter-pg` driver adapter (see
`src/lib/prisma.ts`). `npm run build` runs `prisma generate` first.

The home page and product pages read the catalog from Postgres on the server
(`src/lib/products.ts`); `generateStaticParams` pulls product IDs from the DB so the
product pages are **statically generated at build time** (the build connects to the DB).
The client cart hydrates line items from a small client-safe snapshot in
`src/data/products.ts` (the browser can't query Prisma); checkout always re-prices against
Postgres server-side.

### AR on a real device

WebXR `immersive-ar` needs an AR-capable device (e.g. Android Chrome). Desktop browsers
show an orbitable 3D **preview** plus a notice that AR isn't available — the storefront,
cart, and checkout all work everywhere. To test AR on your phone, serve over HTTPS / LAN.

### "Will it fit?" guard

Once a model is placed in AR, `FitGuard` (`src/components/ar/FitGuard.tsx`) draws a
**wireframe bounding box** sized from the catalog `length × width × height` (× user scale)
and continuously checks it against WebXR-detected planes (`useXRPlanes("floor" | "wall")`):

- Every footprint corner must lie within a detected **floor** polygon, and stay at least
  10 cm from any **wall** plane (point-in-polygon + perpendicular-distance math in
  `fit-geometry.ts`).
- **Fits** → green box + "✓ Fits perfectly!"; **too close / overhang** → red box +
  "⚠ Too close to wall / Might not fit", shown in the AR DOM overlay.
- If the device reports no planes (many phones lack plane detection), the verdict stays
  `unknown` and no banner is shown — we never flash a false warning.

The desktop orbit preview has no guard. Plane detection only runs in a live AR session, so
this can't be exercised on desktop; the underlying geometry has unit-test coverage.

## 3D asset compression

Uploaded `.glb` files are optimized before they hit storage. `createProduct` writes the
upload to a temp file, runs it through **gltf-transform** (`src/lib/compress-glb.ts`) —
`dedup()` (merge duplicate textures/meshes/accessors) + `draco()` (Draco mesh compression) —
writes the optimized result to a second temp file, uploads that, and always cleans up the
temp dir. If compression throws on an exotic file, it falls back to the original so the
merchant isn't blocked. (Placeholder models compress ~73–78% smaller.)

Draco-compressed models need a decoder at load time. We **self-host** the decoder under
`public/draco/` (copied from `three`) and point `useGLTF(url, "/draco/")` at it, so loading
works offline without the gstatic CDN. A plain (uncompressed) `.glb` still loads fine.

Re-optimize existing models by hand with the generator script:

```bash
node scripts/generate-models.mjs --compress        # regenerate + compress
node scripts/generate-models.mjs --compress-only    # compress existing .glb in place
```

## 3D asset storage (Cloudflare R2)

`.glb` models live in an R2 bucket (S3-compatible). The DB stores only the **object key**
(e.g. `models/sofa.glb`) in `Product.modelUrl`, never a full URL.

`GET /api/models?productId=<id>` looks the key up from Postgres and returns a fetchable URL:

- **R2 configured** (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
  all set): a **time-limited pre-signed GET URL** (AWS SigV4), so the bucket can stay fully
  private. TTL via `R2_SIGNED_URL_TTL` (default 3600s).
- **Not configured (local fallback)**: the key resolved under `/public` (e.g.
  `/models/sofa.glb`), so the demo runs with zero credentials.

`FurnitureModel` fetches this URL, then passes it to R3F's `useGLTF`. The route keys off
`productId` (not a caller-supplied object key) so it can't be used to sign URLs for arbitrary
bucket objects.

**Using real R2:**

1. Create a bucket in the Cloudflare dashboard.
2. Create an R2 API token with **Object Read & Write** access.
3. Fill the `R2_*` vars in `.env` (the account ID is in the endpoint
   `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`).
4. Upload the local models to the bucket:

   ```bash
   npm run upload:models
   ```

   This reads every `.glb` in `public/models/` and uploads it to the `models/` prefix
   (`models/coffee-table.glb`, etc. — the keys the DB already stores) with
   `Content-Type: model/gltf-binary` and `Cache-Control: public, max-age=31536000, immutable`.
   It verifies bucket access first and is safe to re-run (overwrites in place). After this,
   `/api/models` serves pre-signed URLs to these objects.

## Merchant admin (`/admin`)

A minimal merchant dashboard backed by **Next.js Server Actions** (`src/app/admin/actions.ts`):

- **`/admin`** — add a product: name, description, price, dimensions (L/W/H, metres),
  accent color, and a `.glb` upload. On submit the action streams the file to R2 (or
  `/public/models` in fallback mode), creates the Postgres row, and `revalidatePath("/")`
  so it appears on the storefront instantly. If the DB write fails after upload, the
  orphaned asset is rolled back.
- **`/admin/products`** — lists every product with a **Delete** button (a form posting to a
  server action) that removes the DB row and best-effort deletes the model asset.

`.glb` uploads can exceed the 1 MB Server Action default, so `next.config.mjs` raises
`serverActions.bodySizeLimit` to 25 MB.

### Admin auth

All `/admin/*` routes are gated by middleware (`src/middleware.ts`) except `/admin/login`.
The flow:

1. Visiting any admin page without a valid cookie redirects to `/admin/login` (preserving
   the intended destination via `?from=`).
2. `/admin/login` posts to a Server Action that compares the password against
   `ADMIN_PASSWORD`. On success it sets an **HttpOnly, SameSite=Lax** cookie `admin_token`
   whose value is an **HMAC-SHA256 signature** (keyed by `ADMIN_SECRET`) — so the middleware
   can verify it on the Edge with no DB lookup, and it can't be forged without the secret.
   The cookie is `secure` in production and lasts 8 hours.
3. The **Log out** button (in the admin header) clears the cookie and returns to login.

Set `ADMIN_PASSWORD` and `ADMIN_SECRET` in `.env` (see `.env.example`). Rotating
`ADMIN_SECRET` invalidates all existing sessions. Shared `auth.ts` uses the Web Crypto API
so the same signing code runs in both the Edge middleware and Node Server Actions.

## Checkout

`POST /api/checkout` validates the cart against the **server-side** catalog (never trusts
client prices). If `STRIPE_SECRET_KEY` (use `sk_test_…`) is set it creates a real Stripe
Checkout Session; otherwise it returns a local mock success URL so the demo runs with zero
config. Copy `.env.example` to `.env.local` to enable real Stripe.

## Structure

```
prisma/
  schema.prisma            # Product model (flat dimension columns, metres)
  seed.ts                  # upserts the 3 catalog products
  migrations/              # generated SQL migrations
prisma.config.ts           # Prisma 7 config: datasource URL + seed command
src/
  middleware.ts            # gates /admin/* behind the admin_token cookie
  app/                     # routes: home, product/[id], cart, success
    admin/                 # merchant dashboard (add form + products list)
      actions.ts           # "use server" — createProduct / deleteProduct
      login/               # /admin/login page + login/logout actions
    api/checkout/route.ts  # re-prices cart against Postgres, Stripe-or-mock
    api/models/route.ts    # productId -> pre-signed R2 URL (or local fallback)
  components/
    ar/
      ArViewer.tsx         # XR store, <Canvas>, DOM-overlay checkout UI, AR lifecycle
      ArScene.tsx          # desktop orbit preview + AR hit-test / floor placement
      FurnitureModel.tsx   # fetches model URL from /api/models, rescales to true size
      Reticle.tsx          # floor-placement ring driven by XR hit-test
      FitGuard.tsx         # "will it fit?" wireframe box + floor/wall plane checks
      fit-geometry.ts      # point-in-polygon, footprint corners, wall distance
      ArErrorBoundary.tsx  # keeps a WebGL/WebXR failure from crashing the page
  lib/
    auth.ts                # HMAC admin-token sign/verify (Web Crypto, Edge-safe)
    compress-glb.ts        # gltf-transform dedup + Draco compression (server-only)
    prisma.ts              # PrismaClient singleton (pg driver adapter)
    products.ts            # server-only catalog queries (getAllProducts, …)
    r2.ts                  # server-only R2 client: signed GET URL, upload, delete
  data/products.ts         # client-safe Product type, formatPrice, cart snapshot
  store/cart.ts            # Zustand persisted cart
scripts/generate-models.mjs # writes lightweight placeholder .glb models
scripts/upload-models.mjs   # uploads public/models/*.glb to R2 (npm run upload:models)
```

## Next steps (toward full SpatialCart)

- Object storage (R2) for `.glb` on a CDN; merchant upload → DB row
- 3D asset pipeline (gltf-transform compression, LODs, thumbnails)
- "Will it fit?" AR guard, dynamic light estimation, shared AR sessions, merchant dashboard
