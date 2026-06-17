import React from "react";
import clsx from "clsx";

interface CanvasProps {
  pan: { x: number; y: number };
  zoom: number;
  isDragging: boolean;
  isHandMode: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  children: React.ReactNode;
}

export function Canvas({
  pan,
  zoom,
  isDragging,
  isHandMode,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  children,
}: CanvasProps) {
  // Determine cursor based on state
  const getCursorClass = () => {
    if (isHandMode) {
      return isDragging ? "cursor-grabbing" : "cursor-grab";
    }
    return "cursor-default";
  };

  return (
    <div
      className={clsx(
        "flex-1 h-full overflow-hidden relative select-none bg-[#faf8f7]",
        getCursorClass()
      )}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* Infinite Panning / Zooming Grid Wrap */}
      <div
        className="w-[5000px] h-[5000px] absolute canvas-grid origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
        }}
      >
        {children}
      </div>

      {/* Visual Instruction Overlay */}
      <div className="absolute top-6 left-6 pointer-events-none bg-white/80 backdrop-blur-sm border border-[#efeded] px-3 py-1.5 rounded-lg shadow-sm text-[10px] font-medium text-[#707976]">
        {isHandMode ? "Drag canvas to pan • Scroll to zoom" : "Click node to select • Use toolbar to zoom"}
      </div>
    </div>
  );
}
