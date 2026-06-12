import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type IncomingItem = { id: string; qty: number };

/**
 * Creates a checkout session.
 *
 * - If STRIPE_SECRET_KEY is set, this builds a real Stripe Checkout Session in
 *   whatever mode your key is (use a test key: sk_test_...).
 * - Otherwise it falls back to a local mock so the demo runs with no keys.
 */
export async function POST(req: Request) {
  let items: IncomingItem[] = [];
  try {
    const body = await req.json();
    items = Array.isArray(body.items) ? body.items : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Resolve + validate against the trusted Postgres catalog in one query
  // (never trust client-supplied prices).
  const ids = items.map((it) => it.id);
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, priceCents: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lineItems = items
    .map((it) => {
      const product = byId.get(it.id);
      const qty = Math.max(1, Math.floor(Number(it.qty) || 1));
      return product ? { product, qty } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const secret = process.env.STRIPE_SECRET_KEY;

  // ---- Mock mode (no Stripe key) ----
  if (!secret) {
    const total = lineItems.reduce(
      (sum, l) => sum + l.product.priceCents * l.qty,
      0,
    );
    const url = `${origin}/success?mock=1&total=${total}`;
    return NextResponse.json({ url });
  }

  // ---- Real Stripe mode ----
  try {
    // Optional dependency: load `stripe` only when a key is configured. The
    // specifier is computed so the bundler doesn't try to resolve it at build
    // time (keeps `stripe` a truly optional install).
    const mod = "stripe";
    const Stripe = (await import(/* webpackIgnore: true */ mod)).default;
    const stripe = new Stripe(secret);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: "usd",
          unit_amount: l.product.priceCents,
          product_data: { name: l.product.name },
        },
      })),
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Stripe checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
