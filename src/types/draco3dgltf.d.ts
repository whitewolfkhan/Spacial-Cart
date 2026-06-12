// draco3dgltf ships no types. We only use createDecoderModule/createEncoderModule.
declare module "draco3dgltf" {
  const draco3d: {
    createDecoderModule: (opts?: object) => Promise<unknown>;
    createEncoderModule: (opts?: object) => Promise<unknown>;
  };
  export default draco3d;
}
