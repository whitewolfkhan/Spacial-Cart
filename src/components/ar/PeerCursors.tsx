"use client";

import { useSession } from "@/store/session";

/** Renders a glowing marker where each peer is looking (their shared cursor). */
export default function PeerCursors() {
  const cursors = useSession((s) => s.cursors);

  return (
    <>
      {Object.values(cursors).map((c) => (
        <group key={c.id} position={[c.position.x, c.position.y, c.position.z]}>
          {/* Core dot */}
          <mesh>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshBasicMaterial color={c.color} toneMapped={false} />
          </mesh>
          {/* Soft halo ring on the floor */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.05, 0.07, 24]} />
            <meshBasicMaterial color={c.color} transparent opacity={0.6} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}
