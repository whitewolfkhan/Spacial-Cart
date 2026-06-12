"use client";

import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import {
  EV,
  type Placement,
  type Peer,
  type RoomStatePayload,
  type Vec3,
} from "@/lib/realtime-types";

type RemoteCursor = { id: string; color: string; position: Vec3 };

type SessionState = {
  socket: Socket | null;
  roomId: string | null;
  selfId: string | null;
  selfColor: string;
  peers: Peer[];
  /** Furniture placed by a peer (the "ghost" to render). */
  remotePlacement: Placement | null;
  /** Latest cursor per peer id. */
  cursors: Record<string, RemoteCursor>;
  connected: boolean;

  createRoom: () => string;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  sendPlacement: (placement: Placement) => void;
  sendCursor: (position: Vec3) => void;
};

/** Six-char A–Z room code, easy to read aloud. */
function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const useSession = create<SessionState>((set, get) => ({
  socket: null,
  roomId: null,
  selfId: null,
  selfColor: "#6d5efc",
  peers: [],
  remotePlacement: null,
  cursors: {},
  connected: false,

  createRoom: () => {
    const code = randomCode();
    get().joinRoom(code);
    return code;
  },

  joinRoom: (roomId) => {
    roomId = roomId.trim().toUpperCase();
    if (!roomId) return;

    // Reuse or create the socket (connects to same origin / custom server).
    let socket = get().socket;
    if (!socket) {
      socket = io({ transports: ["websocket", "polling"] });
      set({ socket });

      socket.on("connect", () => set({ connected: true }));
      socket.on("disconnect", () => set({ connected: false }));

      socket.on(EV.peerJoined, (peer: Peer) =>
        set((s) => ({ peers: [...s.peers.filter((p) => p.id !== peer.id), peer] })),
      );
      socket.on(EV.peerLeft, ({ id }: { id: string }) =>
        set((s) => {
          const cursors = { ...s.cursors };
          delete cursors[id];
          return { peers: s.peers.filter((p) => p.id !== id), cursors };
        }),
      );
      socket.on(EV.furniturePlaced, (placement: Placement) =>
        set({ remotePlacement: placement }),
      );
      socket.on(EV.cursorMoved, (cursor: RemoteCursor) =>
        set((s) => ({ cursors: { ...s.cursors, [cursor.id]: cursor } })),
      );
    }

    const applyState = (state: RoomStatePayload) =>
      set({
        roomId,
        selfId: state.selfId,
        peers: state.peers,
        remotePlacement: state.placement,
        selfColor:
          state.peers.length === 0 ? "#6d5efc" : get().selfColor,
      });

    // Join with an ack callback to receive current room state immediately.
    socket.emit(EV.joinRoom, roomId, (state: RoomStatePayload) => applyState(state));
    set({ roomId });
  },

  leaveRoom: () => {
    const { socket } = get();
    socket?.disconnect();
    set({
      socket: null,
      roomId: null,
      selfId: null,
      peers: [],
      remotePlacement: null,
      cursors: {},
      connected: false,
    });
  },

  sendPlacement: (placement) => {
    const { socket, roomId } = get();
    if (socket && roomId) socket.emit(EV.placeFurniture, placement);
  },

  sendCursor: (position) => {
    const { socket, roomId } = get();
    if (socket && roomId) socket.emit(EV.moveCursor, { position });
  },
}));
