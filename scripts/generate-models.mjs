/**
 * Generates lightweight placeholder .glb models for the demo catalog so the
 * AR/3D viewer works with zero external assets.
 *
 * Each model is a small composition of boxes (legs, top, cushions, …) written
 * as a single binary glTF (.glb).
 *
 * Usage:
 *   node scripts/generate-models.mjs              # regenerate placeholders
 *   node scripts/generate-models.mjs --compress   # also Draco-compress output
 *   node scripts/generate-models.mjs --compress-only  # compress existing .glb,
 *                                                       don't regenerate
 *
 * --compress / --compress-only run the SAME pipeline as the upload Server Action
 * (gltf-transform: dedup + Draco), so you can re-optimize existing models by hand.
 */
import { mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "models");
mkdirSync(outDir, { recursive: true });

const args = process.argv.slice(2);
const COMPRESS = args.includes("--compress") || args.includes("--compress-only");
const COMPRESS_ONLY = args.includes("--compress-only");

/**
 * Compress a .glb buffer: dedup duplicate textures/data + Draco mesh
 * compression. Mirrors src/lib/compress-glb.ts (this standalone script can't
 * import the server-only module).
 */
async function compressGlb(input) {
  const { NodeIO } = await import("@gltf-transform/core");
  const { KHRDracoMeshCompression } = await import("@gltf-transform/extensions");
  const { dedup, draco } = await import("@gltf-transform/functions");
  const draco3d = (await import("draco3dgltf")).default;

  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      "draco3d.decoder": await draco3d.createDecoderModule(),
      "draco3d.encoder": await draco3d.createEncoderModule(),
    });

  const document = await io.readBinary(input);
  await document.transform(dedup(), draco());
  return io.writeBinary(document);
}

// --- tiny box-mesh builder -------------------------------------------------

/** A box centered at [cx,cy,cz] with size [sx,sy,sz] and an RGB color. */
function box(cx, cy, cz, sx, sy, sz, color) {
  const hx = sx / 2,
    hy = sy / 2,
    hz = sz / 2;
  // 8 corners
  const c = [
    [cx - hx, cy - hy, cz - hz],
    [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz],
    [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz],
    [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz],
    [cx - hx, cy + hy, cz + hz],
  ];
  // 12 triangles (6 faces)
  const faces = [
    [0, 1, 2, 3], // back
    [5, 4, 7, 6], // front
    [4, 0, 3, 7], // left
    [1, 5, 6, 2], // right
    [3, 2, 6, 7], // top
    [4, 5, 1, 0], // bottom
  ];
  const positions = [];
  const colors = [];
  const indices = [];
  let base = 0;
  for (const f of faces) {
    for (const vi of f) {
      positions.push(...c[vi]);
      colors.push(...color, 1);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    base += 4;
  }
  return { positions, colors, indices };
}

function merge(parts) {
  const positions = [];
  const colors = [];
  const indices = [];
  let offset = 0;
  for (const p of parts) {
    positions.push(...p.positions);
    colors.push(...p.colors);
    for (const i of p.indices) indices.push(i + offset);
    offset += p.positions.length / 3;
  }
  return { positions, colors, indices };
}

// --- glb writer ------------------------------------------------------------

function buildGlb({ positions, colors, indices }) {
  const pos = new Float32Array(positions);
  const col = new Float32Array(colors);
  const idx = new Uint16Array(indices);

  // pad each chunk to 4-byte alignment
  const pad4 = (n) => (n + 3) & ~3;
  const posBytes = pos.byteLength;
  const colBytes = col.byteLength;
  const idxBytes = idx.byteLength;

  const posOffset = 0;
  const colOffset = pad4(posOffset + posBytes);
  const idxOffset = pad4(colOffset + colBytes);
  const binLength = pad4(idxOffset + idxBytes);

  const bin = new Uint8Array(binLength);
  bin.set(new Uint8Array(pos.buffer), posOffset);
  bin.set(new Uint8Array(col.buffer), colOffset);
  bin.set(new Uint8Array(idx.buffer), idxOffset);

  // min/max for POSITION accessor
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k]);
      max[k] = Math.max(max[k], positions[i + k]);
    }
  }

  const gltf = {
    asset: { version: "2.0", generator: "spatialcart-placeholder" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, COLOR_0: 1 },
            indices: 2,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0.0,
          roughnessFactor: 0.85,
        },
      },
    ],
    buffers: [{ byteLength: binLength }],
    bufferViews: [
      { buffer: 0, byteOffset: posOffset, byteLength: posBytes, target: 34962 },
      { buffer: 0, byteOffset: colOffset, byteLength: colBytes, target: 34962 },
      { buffer: 0, byteOffset: idxOffset, byteLength: idxBytes, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126, // FLOAT
        count: pos.length / 3,
        type: "VEC3",
        min,
        max,
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: col.length / 4,
        type: "VEC4",
      },
      {
        bufferView: 2,
        componentType: 5123, // UNSIGNED_SHORT
        count: idx.length,
        type: "SCALAR",
      },
    ],
  };

  const jsonStr = JSON.stringify(gltf);
  const jsonBuf = Buffer.from(jsonStr, "utf8");
  const jsonPad = pad4(jsonBuf.length) - jsonBuf.length;
  const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]); // pad with spaces

  const binChunk = Buffer.from(bin.buffer, bin.byteOffset, bin.byteLength);

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4); // version
  const totalLength =
    12 + 8 + jsonChunk.length + 8 + binChunk.length;
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4); // "JSON"

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4); // "BIN\0"

  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}

// --- model definitions (roughly natural-scale; viewer rescales anyway) -----

const oak = [0.72, 0.52, 0.34];
const steel = [0.25, 0.25, 0.28];
const fabric = [0.48, 0.54, 0.6];
const brass = [0.79, 0.66, 0.29];
const marble = [0.85, 0.85, 0.88];

function coffeeTable() {
  const top = box(0, 0.42, 0, 1.1, 0.06, 0.6, oak);
  const legs = [
    box(-0.5, 0.21, -0.25, 0.05, 0.42, 0.05, steel),
    box(0.5, 0.21, -0.25, 0.05, 0.42, 0.05, steel),
    box(-0.5, 0.21, 0.25, 0.05, 0.42, 0.05, steel),
    box(0.5, 0.21, 0.25, 0.05, 0.42, 0.05, steel),
  ];
  return merge([top, ...legs]);
}

function sofa() {
  const base = box(0, 0.25, 0, 2.2, 0.3, 0.95, fabric);
  const back = box(0, 0.55, -0.38, 2.2, 0.5, 0.2, fabric);
  const armL = box(-1.05, 0.45, 0, 0.1, 0.4, 0.95, fabric);
  const armR = box(1.05, 0.45, 0, 0.1, 0.4, 0.95, fabric);
  const cushions = [
    box(-0.72, 0.46, 0.05, 0.66, 0.12, 0.8, [0.55, 0.6, 0.66]),
    box(0, 0.46, 0.05, 0.66, 0.12, 0.8, [0.55, 0.6, 0.66]),
    box(0.72, 0.46, 0.05, 0.66, 0.12, 0.8, [0.55, 0.6, 0.66]),
  ];
  return merge([base, back, armL, armR, ...cushions]);
}

function lamp() {
  const baseDisc = box(0, 0.03, 0, 0.35, 0.06, 0.35, marble);
  const pole = box(0, 0.9, 0, 0.04, 1.7, 0.04, brass);
  // crude arc as stepped segments
  const arc = [
    box(0.1, 1.78, 0, 0.3, 0.04, 0.04, brass),
    box(0.35, 1.7, 0, 0.04, 0.2, 0.04, brass),
    box(0.55, 1.55, 0, 0.04, 0.2, 0.04, brass),
  ];
  const shade = box(0.55, 1.4, 0, 0.22, 0.18, 0.22, [0.95, 0.93, 0.8]);
  return merge([baseDisc, pole, ...arc, shade]);
}

const models = {
  "coffee-table.glb": coffeeTable(),
  "sofa.glb": sofa(),
  "lamp.glb": lamp(),
};

function fmt(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

async function compressFile(name) {
  const out = join(outDir, name);
  const before = readFileSync(out);
  const after = Buffer.from(await compressGlb(before));
  writeFileSync(out, after);
  const pct = ((1 - after.length / before.length) * 100).toFixed(0);
  console.log(
    `  compressed ${name}: ${fmt(before.length)} -> ${fmt(after.length)} (${pct}% smaller)`,
  );
}

async function main() {
  if (COMPRESS_ONLY) {
    // Compress every existing .glb in the models dir.
    const files = readdirSync(outDir).filter(
      (f) => f.toLowerCase().endsWith(".glb") && statSync(join(outDir, f)).isFile(),
    );
    if (files.length === 0) {
      console.log("No .glb files to compress in", outDir);
      return;
    }
    console.log(`Compressing ${files.length} existing model(s)…`);
    for (const f of files) await compressFile(f);
    console.log("Done.");
    return;
  }

  // Generate the placeholder models.
  for (const [name, geo] of Object.entries(models)) {
    const glb = buildGlb(geo);
    writeFileSync(join(outDir, name), glb);
    console.log(`wrote ${join(outDir, name)} (${glb.length} bytes)`);
  }

  if (COMPRESS) {
    console.log("Compressing generated models…");
    for (const name of Object.keys(models)) await compressFile(name);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
