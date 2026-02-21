"use client";
import { useCallback, useState, useRef, RefObject } from "react";

// ─── Horizontal resize (sidebar / description panels) ────────────────────────

export function useHorizontalResize(
  initialWidth: number,
  min = 200,
  max = 700
): [number, (e: React.MouseEvent) => void] {
  const [width, setWidth] = useState(initialWidth);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      const startX = e.clientX;
      const startW = width;
      e.preventDefault();

      function onMove(ev: MouseEvent) {
        const next = startW + (ev.clientX - startX);
        if (next >= min && next <= max) setWidth(next);
      }
      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [width, min, max]
  );

  return [width, startResize];
}

// ─── Stable Vertical resize (container-relative max) ─────────────────────────
// Pass containerRef at hook creation. The handler is a plain MouseEventHandler.
// Max height = 75% of container height at drag start — never janky.

export function useVerticalResize(
  initialHeight: number,
  min = 120,
  containerRef?: RefObject<HTMLDivElement | null>
): [number, (e: React.MouseEvent) => void] {
  const [height, setHeight] = useState(initialHeight);
  const heightRef = useRef(initialHeight);

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      const startY = e.clientY;
      const startH = heightRef.current;
      const containerH = containerRef?.current?.offsetHeight ?? 1000;
      const maxH = Math.max(min + 100, Math.floor(containerH * 0.75));
      e.preventDefault();

      function onMove(ev: MouseEvent) {
        const next = Math.max(min, Math.min(maxH, startH - (ev.clientY - startY)));
        heightRef.current = next;
        setHeight(next);
      }
      function onUp() {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [min, containerRef]
  );

  return [height, startResize];
}
