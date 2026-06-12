// Custom server: wraps Next.js and hosts the Socket.io server for co-op AR
// sessions on the same port. Run with `npm run dev` / `npm start`.
import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
// Bind to all interfaces so cloud hosts (Render, etc.) can route to us.
const hostname = process.env.HOST ?? "0.0.0.0";

// Event names (mirrors src/lib/realtime-types.ts EV).
const EV = {
  joinRoom: "room:join",
  roomState: "room:state",
  peerJoined: "room:peerJoined",
  peerLeft: "room:peerLeft",
  placeFurniture: "furniture:place",
  furniturePlaced: "furniture:placed",
  moveCursor: "cursor:move",
  cursorMoved: "cursor:moved",
};

const PEER_COLORS = [
  "#6d5efc",
  "#22c55e",
  "#f59e0b",
  "#ec4899",
  "#06b6d4",
  "#ef4444",
];

// In-memory room state. roomId -> { placement, colorIdx }.
const rooms = new Map();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { placement: null, colorIdx: 0 });
  }
  return rooms.get(roomId);
}

// In production (cloud), ensure the DB schema exists and is seeded before we
// start serving — runs regardless of how the host configured the build step.
// Idempotent: migrate deploy + upsert seed are safe to run on every boot.
async function ensureDatabase() {
  if (dev || !process.env.DATABASE_URL) return;
  const { execSync } = await import("node:child_process");
  try {
    console.log("> Applying database migrations…");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("> Seeding catalog…");
    execSync("npx prisma db seed", { stdio: "inherit" });
  } catch (err) {
    // Don't crash the server if migrate/seed fails — log and continue so the
    // app still boots (e.g. DB already migrated by a prior deploy).
    console.error("> DB setup step failed (continuing):", err?.message ?? err);
  }
}

await ensureDatabase();

const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => handle(req, res));

const io = new SocketIOServer(httpServer, {
  cors: { origin: true },
});

io.on("connection", (socket) => {
  let joinedRoom = null;
  let color = PEER_COLORS[0];

  socket.on(EV.joinRoom, (roomId, ack) => {
    if (typeof roomId !== "string" || !roomId.trim()) return;
    roomId = roomId.trim().toUpperCase();
    joinedRoom = roomId;
    socket.join(roomId);

    const room = getRoom(roomId);
    color = PEER_COLORS[room.colorIdx % PEER_COLORS.length];
    room.colorIdx += 1;
    socket.data.color = color;

    // Existing peers (everyone in the room except this socket).
    const peers = [];
    for (const id of io.sockets.adapter.rooms.get(roomId) ?? []) {
      if (id === socket.id) continue;
      const s = io.sockets.sockets.get(id);
      peers.push({ id, color: s?.data?.color ?? "#6d5efc" });
    }

    // Send current state to the joiner.
    const statePayload = { selfId: socket.id, peers, placement: room.placement };
    if (typeof ack === "function") ack(statePayload);
    else socket.emit(EV.roomState, statePayload);

    // Tell others someone joined.
    socket.to(roomId).emit(EV.peerJoined, { id: socket.id, color });
  });

  socket.on(EV.placeFurniture, (placement) => {
    if (!joinedRoom || !placement || typeof placement.productId !== "string") return;
    getRoom(joinedRoom).placement = placement;
    socket.to(joinedRoom).emit(EV.furniturePlaced, placement);
  });

  socket.on(EV.moveCursor, (cursor) => {
    if (!joinedRoom || !cursor) return;
    socket.to(joinedRoom).emit(EV.cursorMoved, { id: socket.id, color, ...cursor });
  });

  socket.on("disconnect", () => {
    if (joinedRoom) {
      socket.to(joinedRoom).emit(EV.peerLeft, { id: socket.id });
      // Clean up empty rooms.
      const remaining = io.sockets.adapter.rooms.get(joinedRoom);
      if (!remaining || remaining.size === 0) rooms.delete(joinedRoom);
    }
  });
});

httpServer.listen(port, hostname, () => {
  const shown = hostname === "0.0.0.0" ? "localhost" : hostname;
  console.log(`> Ready on http://${shown}:${port} (Next + Socket.io)`);
});
