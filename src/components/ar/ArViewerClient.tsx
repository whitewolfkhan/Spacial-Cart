"use client";

import dynamic from "next/dynamic";
import type { Product } from "@/data/products";
import ArErrorBoundary from "./ArErrorBoundary";
import Loader from "@/components/Loader";

// WebXR + Three.js touch the DOM/WebGL, so this must only run client-side.
const ArViewer = dynamic(() => import("./ArViewer"), {
  ssr: false,
  loading: () => (
    <div className="grid h-[420px] place-items-center rounded-2xl border border-white/10 bg-black/40">
      <Loader label="Loading 3D viewer" size={64} />
    </div>
  ),
});

export default function ArViewerClient({ product }: { product: Product }) {
  return (
    <ArErrorBoundary>
      <ArViewer product={product} />
    </ArErrorBoundary>
  );
}
