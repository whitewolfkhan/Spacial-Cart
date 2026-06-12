"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useXRPlanes, useGetXRSpaceMatrix } from "@react-three/xr";
import { BoxGeometry, EdgesGeometry, Matrix4, Vector3 } from "three";
import {
  type FitVerdict,
  type PlaneInfo,
  footprintCorners,
  worldPointOnPlane,
  distanceToWall,
} from "./fit-geometry";

// Minimum gap we want between the furniture and a wall before warning (metres).
const WALL_CLEARANCE = 0.1;

type Props = {
  /** Box dimensions in metres (already include userScale). */
  width: number;
  height: number;
  depth: number;
  /** World-space centre of the placed model (floor contact at y = center.y). */
  center: Vector3;
  rotationY: number;
  /** Bubble the verdict to the DOM overlay text. */
  onVerdict: (verdict: FitVerdict) => void;
};

/**
 * Captures one detected plane's live world matrix into a shared store. Rendered
 * once per plane so we can call the useGetXRSpaceMatrix hook legally (per plane).
 */
function PlaneMatrixProbe({
  plane,
  store,
}: {
  plane: XRPlane;
  store: Map<XRPlane, Matrix4>;
}) {
  const getMatrix = useGetXRSpaceMatrix(plane.planeSpace);
  const matrix = useRef(new Matrix4());

  useFrame((_state, _delta, frame) => {
    if (getMatrix && getMatrix(matrix.current, frame as XRFrame | undefined)) {
      store.set(plane, matrix.current);
    }
  });

  return null;
}

export default function FitGuard({
  width,
  height,
  depth,
  center,
  rotationY,
  onVerdict,
}: Props) {
  // Detected planes by semantic label. Empty on devices without plane detection.
  const floorPlanes = useXRPlanes("floor");
  const wallPlanes = useXRPlanes("wall");

  // Live world matrices for each plane, refreshed every frame by the probes.
  const floorMatrices = useRef(new Map<XRPlane, Matrix4>());
  const wallMatrices = useRef(new Map<XRPlane, Matrix4>());

  // Wireframe edges for a unit box; we scale via the group below.
  const edges = useMemo(() => new EdgesGeometry(new BoxGeometry(1, 1, 1)), []);

  const lastVerdict = useRef<FitVerdict>("unknown");
  const colorRef = useRef<{ setHex: (h: number) => void } | null>(null);

  useFrame(() => {
    const verdict = computeVerdict();
    // Recolor the wireframe.
    if (colorRef.current) {
      colorRef.current.setHex(
        verdict === "fits" ? 0x29cc6a : verdict === "tooClose" ? 0xff4d4d : 0xaaaaaa,
      );
    }
    if (verdict !== lastVerdict.current) {
      lastVerdict.current = verdict;
      onVerdict(verdict);
    }
  });

  function toPlaneInfos(
    planes: readonly XRPlane[],
    matrices: Map<XRPlane, Matrix4>,
    semantic: string,
  ): PlaneInfo[] {
    const out: PlaneInfo[] = [];
    for (const plane of planes) {
      const matrix = matrices.get(plane);
      if (!matrix || !plane.polygon?.length) continue;
      out.push({
        polygon: plane.polygon.map((p) => ({ x: p.x, z: p.z })),
        matrix,
        inverse: new Matrix4().copy(matrix).invert(),
        semantic,
      });
    }
    return out;
  }

  function computeVerdict(): FitVerdict {
    const floors = toPlaneInfos(floorPlanes, floorMatrices.current, "floor");
    const walls = toPlaneInfos(wallPlanes, wallMatrices.current, "wall");

    // No plane data (common on phones w/o plane detection): can't assert a
    // problem, so stay optimistic rather than show a false warning.
    if (floors.length === 0 && walls.length === 0) return "unknown";

    const corners = footprintCorners(center, width / 2, depth / 2, rotationY);

    // 1) Every footprint corner must lie on some floor plane.
    if (floors.length > 0) {
      for (const c of corners) {
        const onAnyFloor = floors.some((f) => worldPointOnPlane(c, f));
        if (!onAnyFloor) return "tooClose";
      }
    }

    // 2) No corner may be closer than WALL_CLEARANCE to any wall plane.
    if (walls.length > 0) {
      for (const c of corners) {
        for (const w of walls) {
          if (distanceToWall(c, w) < WALL_CLEARANCE) return "tooClose";
        }
      }
    }

    return "fits";
  }

  return (
    <>
      {/* Invisible probes that harvest each plane's live world matrix. */}
      {floorPlanes.map((p, i) => (
        <PlaneMatrixProbe key={`f${i}`} plane={p} store={floorMatrices.current} />
      ))}
      {wallPlanes.map((p, i) => (
        <PlaneMatrixProbe key={`w${i}`} plane={p} store={wallMatrices.current} />
      ))}

      {/* Wireframe bounding box, centred on the box's vertical middle. */}
      <group
        position={[center.x, center.y + height / 2, center.z]}
        rotation={[0, rotationY, 0]}
        scale={[width, height, depth]}
      >
        <lineSegments geometry={edges}>
          <lineBasicMaterial ref={colorRef} color={0xaaaaaa} toneMapped={false} />
        </lineSegments>
      </group>
    </>
  );
}
