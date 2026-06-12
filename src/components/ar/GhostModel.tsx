"use client";

import { useEffect, useMemo, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Color, Mesh, Vector3, type Object3D } from "three";

type Props = {
  productId: string;
  /** Real-world width (metres) to rescale the model to true scale. */
  width: number;
  position: [number, number, number];
  rotationY: number;
  scale: number;
  /** Tint for the ghost (peer color). */
  color?: string;
};

/**
 * A semi-transparent "ghost" of a peer's furniture placement, rendered at the
 * coordinates they shared. Same true-to-scale logic as FurnitureModel, but with
 * a translucent tinted material so it reads as "their" placement.
 */
export default function GhostModel({
  productId,
  width,
  position,
  rotationY,
  scale,
  color = "#6d5efc",
}: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/models?productId=${encodeURIComponent(productId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { url?: string }) => !cancelled && d.url && setUrl(d.url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!url) return null;
  return (
    <Ghost
      url={url}
      width={width}
      position={position}
      rotationY={rotationY}
      scale={scale}
      color={color}
    />
  );
}

type GhostProps = {
  url: string;
  width: number;
  position: [number, number, number];
  rotationY: number;
  scale: number;
  color?: string;
};

function Ghost({ url, width, position, rotationY, scale, color }: GhostProps) {
  const { scene } = useGLTF(url, "/draco/");
  const cloned = useMemo(() => scene.clone(true), [scene]);

  const { fit, yOffset } = useMemo(() => {
    const box = new Box3().setFromObject(cloned);
    const size = box.getSize(new Vector3());
    const fitScale = width / (size.x || 1);
    return { fit: fitScale, yOffset: -box.min.y * fitScale };
  }, [cloned, width]);

  // Make every mesh translucent + tinted.
  useEffect(() => {
    const tint = new Color(color ?? "#6d5efc");
    cloned.traverse((obj: Object3D) => {
      const mesh = obj as Mesh;
      if (mesh.isMesh) {
        const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material)?.clone();
        if (mat) {
          const m = mat as unknown as {
            transparent: boolean;
            opacity: number;
            depthWrite: boolean;
            color?: Color;
            emissive?: Color;
          };
          m.transparent = true;
          m.opacity = 0.4;
          m.depthWrite = false;
          m.color = tint.clone();
          if (m.emissive) m.emissive = tint.clone().multiplyScalar(0.2);
          mesh.material = mat;
        }
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
  }, [cloned, color]);

  const s = fit * (scale ?? 1);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group position={[0, yOffset * (scale ?? 1), 0]} scale={s}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}
