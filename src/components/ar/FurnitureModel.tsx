"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3 } from "three";
import type { Product } from "@/data/products";

type Props = {
  product: Product;
  /** Uniform scale multiplier applied on top of true-to-scale (user pinch). */
  userScale?: number;
  /** Y-rotation in radians (user drag-to-rotate). */
  rotationY?: number;
};

/**
 * Fetches a fetchable URL for the product's .glb from /api/models (a pre-signed
 * R2 GET URL in production, or a local /public path in fallback mode), then
 * renders the model once the URL resolves.
 *
 * useGLTF needs a concrete URL up front (it loads via Suspense), so we resolve
 * the signed URL in an effect and only mount <Model> after.
 */
export default function FurnitureModel({
  product,
  userScale = 1,
  rotationY = 0,
}: Props) {
  const [modelUrl, setModelUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setModelUrl(null);
    fetch(`/api/models?productId=${encodeURIComponent(product.id)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`model URL request failed (${res.status})`);
        return res.json();
      })
      .then((data: { url?: string }) => {
        if (!cancelled && data.url) setModelUrl(data.url);
      })
      .catch((err) => {
        // Surfaced by the AR error boundary if it bubbles; log for debugging.
        console.error("[FurnitureModel] failed to resolve model URL:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  if (!modelUrl) return null;

  return (
    <Model
      url={modelUrl}
      width={product.width}
      userScale={userScale}
      rotationY={rotationY}
    />
  );
}

type ModelProps = {
  url: string;
  width: number;
  userScale: number;
  rotationY: number;
};

/**
 * Loads a .glb from `url` and normalizes it so the model's real-world footprint
 * matches the catalog width (metres). glTF authoring units vary wildly, so we
 * measure the loaded bounding box and rescale to the known size — that's what
 * makes the AR placement genuinely "true to scale".
 */
function Model({ url, width, userScale, rotationY }: ModelProps) {
  const group = useRef<Group>(null);
  // Models are Draco-compressed by the asset pipeline. Pass the self-hosted
  // decoder path (public/draco/) so loading works offline without the gstatic
  // CDN. (A plain .glb still loads fine — the decoder is only used if needed.)
  const { scene } = useGLTF(url, "/draco/");

  // Clone so the same cached glTF can be reused without sharing transforms.
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Compute the scale factor that maps the model's natural width to the
  // catalog width, and the vertical offset that sits it on the floor (y=0).
  const { fit, yOffset } = useMemo(() => {
    const box = new Box3().setFromObject(cloned);
    const size = box.getSize(new Vector3());
    const naturalWidth = size.x || 1;
    const fitScale = width / naturalWidth;
    // After scaling, lift so the bottom of the box rests on y=0.
    const offset = -box.min.y * fitScale;
    return { fit: fitScale, yOffset: offset };
  }, [cloned, width]);

  useEffect(() => {
    cloned.traverse((obj) => {
      // Enable shadow casting so the piece grounds onto the real floor.
      // (obj is a generic Object3D; the cast is safe for Meshes.)
      const mesh = obj as unknown as { castShadow?: boolean; receiveShadow?: boolean };
      if ("castShadow" in mesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [cloned]);

  const scale = fit * userScale;

  return (
    <group ref={group} rotation={[0, rotationY, 0]}>
      <group position={[0, yOffset * userScale, 0]} scale={scale}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}
