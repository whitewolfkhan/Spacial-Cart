"use client";

import { useRef, useState } from "react";
import { useXRHitTest, XROrigin } from "@react-three/xr";
import { OrbitControls, Center, ContactShadows } from "@react-three/drei";
import { Group, Matrix4, Vector3 } from "three";
import type { Product } from "@/data/products";
import FurnitureModel from "./FurnitureModel";
import Reticle from "./Reticle";
import FitGuard from "./FitGuard";
import type { FitVerdict } from "./fit-geometry";

type Props = {
  product: Product;
  userScale: number;
  rotationY: number;
  /** True while an immersive AR session is active. */
  inAR: boolean;
  /** Whether the model has been placed in the room yet (AR only). */
  placed: boolean;
  placedPosition: Vector3 | null;
  onReticleReady: (ready: boolean) => void;
  /** Called with the current reticle world position when the user taps "Place". */
  onPlaceRequested: (registerPlacer: () => Vector3 | null) => void;
  /** Bubble the "will it fit?" verdict up to the DOM overlay. */
  onFitVerdict: (verdict: FitVerdict) => void;
};

/**
 * Lights shared by both the desktop preview and the AR scene. The directional
 * key light casts a grounding shadow so the piece doesn't look pasted on.
 */
function SceneLights() {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[2, 4, 2]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
    </>
  );
}

export default function ArScene({
  product,
  userScale,
  rotationY,
  inAR,
  placed,
  placedPosition,
  onReticleReady,
  onPlaceRequested,
  onFitVerdict,
}: Props) {
  const reticleRef = useRef<Group>(null);
  const hitMatrix = useRef(new Matrix4());
  const [reticleVisible, setReticleVisible] = useState(false);

  // Drive floor hit-testing every frame while in AR and not yet placed.
  useXRHitTest((results, getWorldMatrix) => {
    if (placed) return;
    const reticle = reticleRef.current;
    if (!reticle) return;

    if (results.length > 0) {
      getWorldMatrix(hitMatrix.current, results[0]);
      reticle.visible = true;
      reticle.matrix.copy(hitMatrix.current);
      if (!reticleVisible) {
        setReticleVisible(true);
        onReticleReady(true);
      }
    } else if (reticleVisible) {
      reticle.visible = false;
      setReticleVisible(false);
      onReticleReady(false);
    }
  }, "viewer");

  // Expose a reader so the parent can grab the reticle's spot on "Place".
  onPlaceRequested(() => {
    if (!reticleRef.current) return null;
    return new Vector3().setFromMatrixPosition(reticleRef.current.matrix);
  });

  // --- Desktop / non-AR preview: orbitable, auto-framed model on a ground. ---
  // Lights only, no remote HDR environment, so it works fully offline.
  if (!inAR) {
    return (
      <>
        <color attach="background" args={["#0c0c12"]} />
        <SceneLights />
        <hemisphereLight intensity={0.4} groundColor="#1a1a22" />
        {/* Center the (rescaled) model around the origin for a clean orbit. */}
        <Center position={[0, 0.25, 0]}>
          <FurnitureModel
            product={product}
            userScale={userScale}
            rotationY={rotationY}
          />
        </Center>
        <ContactShadows
          position={[0, -0.0, 0]}
          opacity={0.5}
          scale={6}
          blur={2.4}
          far={3}
          color="#000000"
        />
        <OrbitControls
          makeDefault
          autoRotate
          autoRotateSpeed={0.9}
          enablePan={false}
          minDistance={1.2}
          maxDistance={8}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 2}
        />
      </>
    );
  }

  // --- AR scene: reticle until placed, then the anchored model + shadow. ---
  return (
    <>
      <XROrigin />
      <SceneLights />

      {!placed && <Reticle ref={reticleRef} />}

      {placed && placedPosition && (
        <>
          <group position={[placedPosition.x, placedPosition.y, placedPosition.z]}>
            {/* Invisible plane that only receives the contact shadow. */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0.001, 0]}>
              <planeGeometry args={[6, 6]} />
              <shadowMaterial opacity={0.35} />
            </mesh>
            <FurnitureModel
              product={product}
              userScale={userScale}
              rotationY={rotationY}
            />
          </group>

          {/* "Will it fit?" guard: wireframe box sized from the DB dimensions
              (× userScale), recolored green/red against detected planes. */}
          <FitGuard
            width={product.width * userScale}
            height={product.height * userScale}
            depth={product.length * userScale}
            center={placedPosition}
            rotationY={rotationY}
            onVerdict={onFitVerdict}
          />
        </>
      )}
    </>
  );
}
