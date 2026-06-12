import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpatialCart — See it in your space",
  description:
    "Photorealistic, true-to-scale 3D furniture in your living room via WebXR AR. Check out without leaving AR.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // AR works best when the page can't be pinch-zoomed away under the canvas.
  userScalable: false,
  themeColor: "#0c0c12",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
