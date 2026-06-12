import "server-only";

/**
 * Compress a .glb buffer with gltf-transform: merge duplicate textures/data
 * (dedup) and apply Draco mesh compression. Returns a new optimized buffer.
 *
 * This runs in the Node server runtime (Server Action), not the Edge runtime —
 * it uses the Draco WASM encoder from draco3dgltf.
 */
export async function compressGlb(input: Uint8Array): Promise<Uint8Array> {
  // Imported lazily so the heavy WASM/codec deps load only when compressing.
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

  await document.transform(
    // Merge duplicate textures, meshes, materials, and accessors.
    dedup(),
    // Edge-breaker Draco compression of mesh geometry.
    draco(),
  );

  return io.writeBinary(document);
}
