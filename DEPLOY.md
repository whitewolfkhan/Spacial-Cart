# Deploying SpatialCart (Render + Neon Postgres)

SpatialCart runs a **custom Node server** (`server.mjs` = Next.js + Socket.io), so it needs a
host that runs a persistent process with WebSockets — **not** Vercel. These steps use
**Render** (free tier) + a free **Neon** Postgres.

## 1. Create a Postgres database (Neon)

1. Sign up at <https://neon.tech> and create a project (any region).
2. Copy the **pooled** connection string. It looks like:
   `postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require`
3. Keep it handy — you'll paste it as `DATABASE_URL` in Render.

> Supabase works too: use the **Connection string** (URI) from Project Settings → Database.

## 2. Deploy to Render

1. Push this repo to GitHub (already done).
2. At <https://dashboard.render.com> → **New → Blueprint** → connect the repo.
   Render reads `render.yaml` and creates the `spatialcart` web service.
3. When prompted (or under the service's **Environment** tab), set:
   - `DATABASE_URL` → the Neon connection string from step 1
   - `ADMIN_PASSWORD` → your chosen admin password
   - `ADMIN_SECRET` → a long random string (e.g. `openssl rand -hex 32`)
   - *(optional)* `R2_*` for Cloudflare R2, `STRIPE_SECRET_KEY` for real Stripe.
     Leave unset to use the local-model fallback / mock checkout.
4. Click **Apply / Create**. Render runs the build:
   `npm install → prisma migrate deploy → prisma db seed → next build`, then `npm start`.

First build takes a few minutes. When it's live you'll get a URL like
`https://spatialcart.onrender.com`.

## Notes & limitations on the free tier

- **WebSockets** (shared AR sessions) are supported on Render.
- The free instance **sleeps after inactivity**; the first request after a sleep takes ~30 s
  to wake. Shared rooms are in-memory, so they reset if the instance restarts.
- The filesystem is **ephemeral**. Merchant uploads in *local-model fallback* mode won't
  survive a redeploy — configure **R2** for persistent uploads. The seeded demo models are
  committed to the repo, so the storefront always works.
- AR itself needs an **AR-capable device over HTTPS** (Render serves HTTPS by default).

## Updating

`autoDeploy: true` is set, so pushing to `main` triggers a new deploy automatically.
