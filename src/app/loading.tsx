import Loader from "@/components/Loader";

// Shown during navigation / server data fetches for any route without its own
// loading.tsx (and notably during Render's cold-start first paint).
export default function Loading() {
  return <Loader fullscreen label="Loading SpatialCart" />;
}
