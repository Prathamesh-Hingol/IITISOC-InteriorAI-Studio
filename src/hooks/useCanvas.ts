import { useState, useCallback, useRef } from "react";

export function useCanvas() {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHandMode, setIsHandMode] = useState(true);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Left-click drags if in Hand Mode, middle click drag always works
    if (!isHandMode && e.button !== 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan, isHandMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetPan = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  return {
    pan,
    setPan,
    isDragging,
    isHandMode,
    setIsHandMode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetPan,
  };
}
