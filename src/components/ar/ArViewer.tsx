"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR, type XRStore } from "@react-three/xr";
import { Vector3 } from "three";
import type { Product } from "@/data/products";
import { formatPrice } from "@/data/products";
import { useCart } from "@/store/cart";
import { useSession } from "@/store/session";
import ArScene from "./ArScene";
import type { FitVerdict } from "./fit-geometry";

type Props = { product: Product };

export default function ArViewer({ product }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const add = useCart((s) => s.add);

  // The XR store must know the DOM-overlay root, which only exists after the
  // first render — so we create it in an effect once the overlay div is live.
  const [store, setStore] = useState<XRStore | null>(null);

  const [supported, setSupported] = useState<boolean | null>(null);
  const [inAR, setInAR] = useState(false);
  const [reticleReady, setReticleReady] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [placedPosition, setPlacedPosition] = useState<Vector3 | null>(null);
  const [userScale, setUserScale] = useState(1);
  const [rotationY, setRotationY] = useState(0);
  const [added, setAdded] = useState(false);
  const [fitVerdict, setFitVerdict] = useState<FitVerdict>("unknown");

  // A ref to the scene's "read current reticle position" function.
  const placerRef = useRef<(() => Vector3 | null) | null>(null);
  const registerPlacer = useCallback((fn: () => Vector3 | null) => {
    placerRef.current = fn;
  }, []);

  // Create the store once, after mount, wiring the DOM overlay + hit-test.
  useEffect(() => {
    const s = createXRStore({
      hitTest: true,
      // Pass the overlay element so our HTML checkout UI renders over the
      // camera feed via the WebXR dom-overlay feature.
      domOverlay: overlayRef.current ?? true,
      // We drive our own UI, so suppress the library's default offer button.
      offerSession: false,
    });
    setStore(s);
    return () => s.destroy();
  }, []);

  // Feature-detect WebXR immersive-ar support once on mount.
  useEffect(() => {
    let cancelled = false;
    const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
    if (!xr || !xr.isSessionSupported) {
      setSupported(false);
      return;
    }
    xr
      .isSessionSupported("immersive-ar")
      .then((ok) => !cancelled && setSupported(ok))
      .catch(() => !cancelled && setSupported(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Track session lifecycle to toggle the overlay UI.
  useEffect(() => {
    if (!store) return;
    return store.subscribe((state) => {
      setInAR(state.session != null);
    });
  }, [store]);

  const enterAR = useCallback(() => {
    if (!store) return;
    setPlaced(false);
    setPlacedPosition(null);
    setAdded(false);
    // Session features (hit-test, dom-overlay) come from createXRStore above.
    store.enterAR();
  }, [store]);

  const sendPlacement = useSession((s) => s.sendPlacement);
  const inRoom = useSession((s) => s.roomId !== null);

  const broadcastPlacement = useCallback(
    (pos: Vector3, rot: number, scl: number) => {
      sendPlacement({
        productId: product.id,
        width: product.width,
        position: { x: pos.x, y: pos.y, z: pos.z },
        rotationY: rot,
        scale: scl,
      });
    },
    [sendPlacement, product.id, product.width],
  );

  const place = useCallback(() => {
    const pos = placerRef.current?.();
    if (pos) {
      setPlacedPosition(pos);
      setPlaced(true);
      broadcastPlacement(pos, rotationY, userScale);
    }
  }, [broadcastPlacement, rotationY, userScale]);

  // Re-broadcast whenever the placed model is rotated/scaled, so peers see the
  // live transform in their ghost.
  useEffect(() => {
    if (placed && placedPosition && inRoom) {
      broadcastPlacement(placedPosition, rotationY, userScale);
    }
  }, [rotationY, userScale, placed, placedPosition, inRoom, broadcastPlacement]);

  const reset = useCallback(() => {
    setPlaced(false);
    setPlacedPosition(null);
    setUserScale(1);
    setRotationY(0);
    setFitVerdict("unknown");
  }, []);

  const addToCart = useCallback(() => {
    add(product.id, 1);
    setAdded(true);
  }, [add, product.id]);

  const endSession = useCallback(() => {
    store?.getState().session?.end();
  }, [store]);

  return (
    <div className="relative">
      {/* The Three.js / WebXR canvas. Transparent so the camera shows through. */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        <Canvas
          shadows
          camera={{ position: [0, 1.4, 2.5], fov: 50 }}
          style={{ height: 420, touchAction: "none" }}
          gl={{ alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            // Recover gracefully if the GPU drops the context (tab switch,
            // GPU reset, or a software-rendering host). Prevent default so the
            // browser attempts a restore instead of giving up.
            gl.domElement.addEventListener(
              "webglcontextlost",
              (e) => e.preventDefault(),
              false,
            );
          }}
        >
          {store && (
            <XR store={store}>
              <ArScene
                product={product}
                userScale={userScale}
                rotationY={rotationY}
                inAR={inAR}
                placed={placed}
                placedPosition={placedPosition}
                onReticleReady={setReticleReady}
                onPlaceRequested={registerPlacer}
                onFitVerdict={setFitVerdict}
              />
            </XR>
          )}
        </Canvas>
      </div>

      {/* Launch button (shown outside AR). */}
      {!inAR && (
        <div className="mt-4">
          {supported === false ? (
            <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
              Your browser/device doesn&apos;t support WebXR AR. Open this page on an
              AR-capable phone (Android Chrome, or a WebXR-enabled iOS browser) to drop{" "}
              {product.name} into your room. The 3D preview above still works on desktop.
            </p>
          ) : (
            <button
              onClick={enterAR}
              disabled={supported === null || !store}
              className="w-full rounded-xl bg-brand px-5 py-3 font-semibold transition hover:bg-brand-dark disabled:opacity-50"
            >
              {supported === null ? "Checking AR support…" : "View in My Space"}
            </button>
          )}
        </div>
      )}

      {/*
        DOM overlay UI: WebXR renders this HTML on top of the live camera feed
        while in AR. Kept mounted (so the overlay root element is stable) but
        only painted when a session is active.
      */}
      <div
        ref={overlayRef}
        className={inAR ? "fixed inset-0 z-50" : "pointer-events-none fixed inset-0 -z-10 opacity-0"}
      >
        {inAR && (
          <div className="pointer-events-none flex h-full flex-col justify-between p-4">
            {/* Top bar */}
            <div className="flex justify-between">
              <span className="pointer-events-auto rounded-full bg-black/55 px-3 py-1.5 text-sm backdrop-blur">
                {product.name}
              </span>
              <button
                onClick={endSession}
                className="pointer-events-auto rounded-full bg-black/55 px-3 py-1.5 text-sm backdrop-blur"
              >
                Exit AR ✕
              </button>
            </div>

            {/* Bottom controls */}
            <div className="space-y-3">
              {!placed ? (
                <button
                  onClick={place}
                  disabled={!reticleReady}
                  className="pointer-events-auto w-full rounded-xl bg-brand px-5 py-3 font-semibold backdrop-blur disabled:opacity-40"
                >
                  {reticleReady
                    ? `Place ${product.name} here`
                    : "Point at your floor…"}
                </button>
              ) : (
                <>
                  {/* "Will it fit?" verdict banner */}
                  {fitVerdict !== "unknown" && (
                    <div
                      className={`pointer-events-none flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold backdrop-blur ${
                        fitVerdict === "fits"
                          ? "bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/40"
                          : "bg-red-500/25 text-red-100 ring-1 ring-red-400/40"
                      }`}
                    >
                      {fitVerdict === "fits"
                        ? "✓ Fits perfectly!"
                        : "⚠ Too close to wall / Might not fit"}
                    </div>
                  )}

                  <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-black/55 p-2 backdrop-blur">
                    <button
                      onClick={() => setRotationY((r) => r - Math.PI / 12)}
                      className="flex-1 rounded-lg bg-white/10 py-2"
                    >
                      ⟲ Rotate
                    </button>
                    <button
                      onClick={() => setUserScale((s) => Math.max(0.5, s - 0.1))}
                      className="rounded-lg bg-white/10 px-4 py-2"
                    >
                      −
                    </button>
                    <button
                      onClick={() => setUserScale((s) => Math.min(2, s + 0.1))}
                      className="rounded-lg bg-white/10 px-4 py-2"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setRotationY((r) => r + Math.PI / 12)}
                      className="flex-1 rounded-lg bg-white/10 py-2"
                    >
                      Rotate ⟳
                    </button>
                  </div>

                  <div className="pointer-events-auto flex gap-2">
                    <button
                      onClick={reset}
                      className="rounded-xl bg-black/55 px-4 py-3 backdrop-blur"
                    >
                      Reset
                    </button>
                    <button
                      onClick={addToCart}
                      className="flex-1 rounded-xl bg-brand px-5 py-3 font-semibold backdrop-blur"
                    >
                      {added
                        ? "✓ Added to cart"
                        : `Add to Cart — ${formatPrice(product.priceCents)}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
