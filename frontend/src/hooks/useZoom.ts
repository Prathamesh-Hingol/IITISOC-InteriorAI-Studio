import { useState, useCallback } from "react";

export function useZoom(initialZoom = 100, minZoom = 10, maxZoom = 200, step = 10) {
  const [zoom, setZoomState] = useState(initialZoom);

  const zoomIn = useCallback(() => {
    setZoomState((prev) => Math.min(prev + step, maxZoom));
  }, [maxZoom, step]);

  const zoomOut = useCallback(() => {
    setZoomState((prev) => Math.max(prev - step, minZoom));
  }, [minZoom, step]);

  const setZoom = useCallback((value: number) => {
    setZoomState(Math.max(minZoom, Math.min(value, maxZoom)));
  }, [minZoom, maxZoom]);

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
  };
}
