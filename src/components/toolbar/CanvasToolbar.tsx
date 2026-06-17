import { Minus, Plus, Hand } from "lucide-react";
import { GlassPanel } from "../layout/GlassPanel";

interface CanvasToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isHandMode: boolean;
  onToggleHandMode: () => void;
}

export function CanvasToolbar({
  zoom,
  onZoomIn,
  onZoomOut,
  isHandMode,
  onToggleHandMode
}: CanvasToolbarProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-auto select-none">
      <GlassPanel className="flex items-center gap-2 px-3 py-1.5 shadow-md border border-[#c0c8c5]/40 rounded-full">
        {/* Zoom Out Button */}
        <button
          onClick={onZoomOut}
          className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-[#efeded] rounded-full transition-colors"
          title="Zoom Out (Ctrl -)"
        >
          <Minus size={16} />
        </button>

        {/* Zoom Percentage */}
        <span className="text-xs font-semibold text-on-surface min-w-12 text-center">
          {zoom}%
        </span>

        {/* Zoom In Button */}
        <button
          onClick={onZoomIn}
          className="p-1.5 text-on-surface-variant hover:text-on-surface hover:bg-[#efeded] rounded-full transition-colors"
          title="Zoom In (Ctrl +)"
        >
          <Plus size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[#c0c8c5]/60 mx-1" />

        {/* Hand Tool Button */}
        <button
          onClick={onToggleHandMode}
          className={`p-1.5 rounded-full transition-all ${
            isHandMode
              ? "bg-[#00362d] text-white shadow-sm"
              : "text-on-surface-variant hover:text-on-surface hover:bg-[#efeded]"
          }`}
          title="Hand Tool (Pan Canvas)"
        >
          <Hand size={16} />
        </button>
      </GlassPanel>
    </div>
  );
}
