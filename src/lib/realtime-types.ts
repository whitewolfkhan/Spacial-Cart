// Shared Socket.io event protocol for co-op AR sessions. Imported by both the
// server (server.js reads the string names) and the client hook.

export type Vec3 = { x: number; y: number; z: number };

/** A furniture placement broadcast to the room. */
export type Placement = {
  productId: string;
  /** Real-world width (metres) so the receiver can rescale to true scale. */
  width: number;
  position: Vec3;
  /** Y-axis rotation in radians. */
  rotationY: number;
  /** Uniform user scale applied on top of true-to-scale. */
  scale: number;
};

/** Where a peer is looking — the AR camera ray hit / cursor in shared space. */
export type Cursor = {
  position: Vec3;
};

/** A peer in the room (for presence). */
export type Peer = {
  id: string;
  color: string;
};

// --- Event names (kept as constants to avoid typos across server/client) ---
export const EV = {
  joinRoom: "room:join",
  roomState: "room:state", // server -> client on join (current placement + peers)
  peerJoined: "room:peerJoined",
  peerLeft: "room:peerLeft",
  placeFurniture: "furniture:place", // client -> server -> broadcast
  furniturePlaced: "furniture:placed", // server -> other clients
  moveCursor: "cursor:move",
  cursorMoved: "cursor:moved",
} as const;

export type RoomStatePayload = {
  selfId: string;
  peers: Peer[];
  placement: Placement | null;
};
