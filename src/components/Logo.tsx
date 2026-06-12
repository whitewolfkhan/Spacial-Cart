import type { SVGProps } from "react";

/**
 * SpatialCart logo mark: an isometric cube (the "in your space" 3D object)
 * with a small cart notch. Uses currentColor so it inherits text color, plus
 * a brand gradient when `gradient` is set.
 */
export default function Logo({
  size = 28,
  gradient = false,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number; gradient?: boolean }) {
  const stroke = gradient ? "url(#sc-grad)" : "currentColor";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="SpatialCart"
      {...props}
    >
      <defs>
        <linearGradient id="sc-grad" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0%" stopColor="#8b7dff" />
          <stop offset="100%" stopColor="#4b3fd1" />
        </linearGradient>
      </defs>
      {/* Isometric cube */}
      <path
        d="M24 6 L40 15 V33 L24 42 L8 33 V15 Z"
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      {/* Top face edges */}
      <path
        d="M8 15 L24 24 L40 15 M24 24 V42"
        stroke={stroke}
        strokeWidth={2.5}
        strokeLinejoin="round"
        opacity={0.85}
      />
      {/* Accent dot — the placed item */}
      <circle cx="24" cy="24" r="3" fill={gradient ? "#8b7dff" : "currentColor"} />
    </svg>
  );
}
