import Logo from "./Logo";

type Props = {
  /** Optional label under the spinner. Set to null to hide. */
  label?: string | null;
  /** Pixel size of the spinner core. */
  size?: number;
  /** Fill the viewport (use for full-page loading). */
  fullscreen?: boolean;
  className?: string;
};

/**
 * Stylish SpatialCart loading indicator: the logo floats in the centre while
 * two brand-tinted rings orbit it in opposite directions, over a soft pulsing
 * glow. Pure CSS animation (keyframes in globals.css).
 */
export default function Loader({
  label = "Loading",
  size = 76,
  fullscreen = false,
  className = "",
}: Props) {
  const ring = size + 26;

  const spinner = (
    <div className="flex flex-col items-center gap-5">
      <div
        className="relative grid place-items-center"
        style={{ width: ring, height: ring }}
      >
        {/* Soft pulsing glow behind everything */}
        <div
          className="sc-glow absolute rounded-full"
          style={{
            width: ring,
            height: ring,
            background:
              "radial-gradient(circle, rgba(109,94,252,0.45) 0%, rgba(109,94,252,0) 70%)",
          }}
        />

        {/* Outer ring — clockwise, gradient arc */}
        <div
          className="sc-spin absolute rounded-full"
          style={{
            width: ring,
            height: ring,
            border: "2px solid transparent",
            borderTopColor: "#8b7dff",
            borderRightColor: "rgba(139,125,255,0.35)",
          }}
        />

        {/* Inner ring — counter-clockwise, dashed feel via single colored edge */}
        <div
          className="sc-spin-reverse absolute rounded-full"
          style={{
            width: size + 8,
            height: size + 8,
            border: "2px solid transparent",
            borderBottomColor: "#4b3fd1",
            borderLeftColor: "rgba(75,63,209,0.4)",
          }}
        />

        {/* The logo, gently floating */}
        <div className="sc-float relative grid place-items-center">
          <Logo size={size * 0.5} gradient />
        </div>
      </div>

      {label !== null && (
        <p className="sc-dots text-sm font-medium tracking-wide text-white/60">
          {label}
        </p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div
        className={`grid min-h-screen place-items-center bg-[#0c0c12] ${className}`}
      >
        {spinner}
      </div>
    );
  }

  return (
    <div className={`grid place-items-center ${className}`}>{spinner}</div>
  );
}
