"use client";

import { forwardRef } from "react";
import { Group } from "three";

/**
 * A flat ring drawn on the detected floor plane to show where the model will
 * drop. Its world matrix is driven directly by the XR hit-test result, so we
 * disable automatic matrix updates and let the hit-test write to it.
 */
const Reticle = forwardRef<Group>(function Reticle(_props, ref) {
  return (
    <group ref={ref} matrixAutoUpdate={false} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.1, 32]} />
        <meshBasicMaterial color="#6d5efc" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.02, 24]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
});

export default Reticle;
