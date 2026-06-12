"use client";

import { useState } from "react";
import { useSession } from "@/store/session";

/**
 * Create / Join a shared AR room. Two people who enter the same code see each
 * other's furniture placements and cursors in real time.
 */
export default function CoopSession() {
  const roomId = useSession((s) => s.roomId);
  const peers = useSession((s) => s.peers);
  const connected = useSession((s) => s.connected);
  const createRoom = useSession((s) => s.createRoom);
  const joinRoom = useSession((s) => s.joinRoom);
  const leaveRoom = useSession((s) => s.leaveRoom);

  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  if (roomId) {
    return (
      <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/50">
              Shared room {connected ? "· live" : "· connecting…"}
            </p>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(roomId);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="mt-1 font-mono text-2xl font-bold tracking-widest hover:text-brand"
              title="Copy code"
            >
              {roomId} {copied ? "✓" : "⧉"}
            </button>
          </div>
          <button
            onClick={leaveRoom}
            className="rounded-full border border-white/15 px-3 py-1.5 text-sm hover:border-white/40"
          >
            Leave
          </button>
        </div>
        <p className="mt-2 text-sm text-white/60">
          {peers.length === 0
            ? "Waiting for someone to join… share this code."
            : `${peers.length} other ${peers.length === 1 ? "person is" : "people are"} in the room.`}
        </p>
        <div className="mt-2 flex gap-1.5">
          {peers.map((p) => (
            <span
              key={p.id}
              className="h-3 w-3 rounded-full ring-2 ring-white/20"
              style={{ background: p.color }}
              title={`peer ${p.id.slice(0, 4)}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="font-semibold">View together</p>
      <p className="mt-1 text-sm text-white/60">
        Start a shared room and place furniture in AR with a friend in real time.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          onClick={() => createRoom()}
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold hover:bg-brand-dark"
        >
          Create room
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) joinRoom(code);
          }}
          className="flex flex-1 gap-2"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="Enter code"
            className="w-full rounded-xl border border-white/15 bg-transparent px-3 py-2.5 text-sm font-mono uppercase tracking-widest outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={!code.trim()}
            className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold hover:border-white/40 disabled:opacity-40"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  );
}
