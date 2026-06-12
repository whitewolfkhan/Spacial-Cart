import { Matrix4, Vector3 } from "three";

// Geometry helpers for the "Will it fit?" guard. WebXR plane detection gives us
// each plane as a local-space polygon plus a pose (transform). We test the
// furniture footprint against the floor polygon and measure proximity to walls.

export type FitVerdict = "fits" | "tooClose" | "unknown";

/** A detected plane reduced to what the guard needs. */
export type PlaneInfo = {
  /** Plane-local polygon points (XZ in the plane's own space). */
  polygon: { x: number; z: number }[];
  /** Plane -> world transform. */
  matrix: Matrix4;
  /** Inverse (world -> plane-local), precomputed. */
  inverse: Matrix4;
  semantic: string | undefined;
};

/** 2D point-in-polygon (ray casting) in the XZ plane. */
function pointInPolygon(
  px: number,
  pz: number,
  poly: { x: number; z: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      zi = poly[i].z;
    const xj = poly[j].x,
      zj = poly[j].z;
    const intersect =
      zi > pz !== zj > pz &&
      px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Project a world point onto a plane's local space and test if it lies within
 * the plane polygon (used for "is this footprint corner still on the floor?").
 */
export function worldPointOnPlane(
  world: Vector3,
  plane: PlaneInfo,
): boolean {
  const local = world.clone().applyMatrix4(plane.inverse);
  return pointInPolygon(local.x, local.z, plane.polygon);
}

/**
 * Shortest horizontal distance (metres) from a world point to a wall plane,
 * measured along the wall's local normal (the plane's local +Y axis maps to its
 * world normal). Returns the absolute perpendicular distance to the wall plane.
 */
export function distanceToWall(world: Vector3, wall: PlaneInfo): number {
  const local = world.clone().applyMatrix4(wall.inverse);
  // For a vertical (wall) plane, the plane lies in local XZ; perpendicular
  // offset from the plane is the local Y component.
  return Math.abs(local.y);
}

/**
 * The four corners of the furniture footprint in world space, given the centre,
 * half-extents (after scale), and Y-rotation.
 */
export function footprintCorners(
  center: Vector3,
  halfWidth: number,
  halfDepth: number,
  rotationY: number,
): Vector3[] {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const corners: Vector3[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const lx = sx * halfWidth;
      const lz = sz * halfDepth;
      // rotate around Y, then translate by center
      corners.push(
        new Vector3(
          center.x + lx * cos - lz * sin,
          center.y,
          center.z + lx * sin + lz * cos,
        ),
      );
    }
  }
  return corners;
}
