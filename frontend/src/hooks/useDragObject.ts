import { useState, useCallback } from "react";
import { dragApi } from "../api/drag.api";
import type { ExtractDragResponse } from "../types/drag";

export function useDragObject(getToken: () => Promise<string | null>) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<ExtractDragResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = useCallback(
    async (imageUrl: string, x: number, y: number) => {
      setIsExtracting(true);
      setError(null);
      setResult(null);
      try {
        const res = await dragApi.extract({ imageUrl, x, y }, getToken);
        setResult(res);
      } catch (err: any) {
        console.error("Failed to extract object for dragging:", err);
        setError(err.message || "Failed to extract object. Try clicking directly on an object.");
      } finally {
        setIsExtracting(false);
      }
    },
    [getToken]
  );

  const handleReset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isExtracting,
    result,
    error,
    handleExtract,
    handleReset,
  };
}
