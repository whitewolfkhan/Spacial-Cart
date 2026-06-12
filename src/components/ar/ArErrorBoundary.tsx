"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Keeps a WebGL/WebXR failure from taking down the whole product page. If the
 * 3D viewer throws (unsupported GPU, model load failure, etc.) we show a
 * graceful fallback instead of a blank app-error screen.
 */
export default class ArErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Surface to the console for debugging; replace with real logging later.
    console.error("[ArViewer] crashed:", error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm text-white/70">
          <p className="font-semibold text-white">3D preview unavailable</p>
          <p className="mt-1">
            The 3D/AR viewer couldn&apos;t start on this device. You can still view
            details and add the item to your cart.
          </p>
          <pre className="mt-3 max-h-32 overflow-auto rounded bg-black/40 p-2 text-xs text-red-300">
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
