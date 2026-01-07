"use client";

import * as React from "react";

/**
 * Sends the document height to the parent window (iframe auto-resize).
 * Parent (WordPress) should listen for `{ type: "maku-roi-height", height }`.
 */
export function EmbedHeightMessenger() {
  React.useEffect(() => {
    // Only relevant when embedded in an iframe
    if (typeof window === "undefined") return;
    if (window.self === window.top) return;

    let raf = 0;

    const measureHeight = () => {
      const docEl = document.documentElement;
      const body = document.body;
      return Math.max(
        docEl?.scrollHeight ?? 0,
        docEl?.offsetHeight ?? 0,
        body?.scrollHeight ?? 0,
        body?.offsetHeight ?? 0
      );
    };

    const postHeight = () => {
      const height = measureHeight();
      window.parent?.postMessage({ type: "maku-roi-height", height }, "*");
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(postHeight);
    };

    schedule();

    const ro = new ResizeObserver(() => schedule());
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);

    // Fallbacks for cases where ResizeObserver doesn't fire
    window.addEventListener("load", schedule);
    window.addEventListener("resize", schedule);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("load", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return null;
}

