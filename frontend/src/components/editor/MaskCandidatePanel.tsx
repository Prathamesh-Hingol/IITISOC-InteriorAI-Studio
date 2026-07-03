import { Check } from "lucide-react";

interface MaskCandidatePanelProps {
  candidates: string[]; // List of base64 PNG data URLs or SVGs
  onSelect: (index: number) => void;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}

/**
 * Panel that displays the candidate segment masks returned by SAM.
 * Allows the user to select one mask to add to their selection session.
 */
export function MaskCandidatePanel({
  candidates,
  onSelect,
  hoveredIndex,
  onHover,
}: MaskCandidatePanelProps) {
  if (candidates.length === 0) return null;

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-[#efeded] rounded-2xl p-4 shadow-xl z-20 flex flex-col gap-3 max-w-lg w-full select-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] uppercase tracking-wider font-bold text-[#707976]">
          SAM Candidate Segments
        </span>
        <span className="text-[9px] text-[#c0c8c5] font-semibold">
          Hover to preview • Click to select
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {candidates.map((mask, idx) => {
          const isHovered = hoveredIndex === idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => onHover(idx)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(idx)}
              className={`flex flex-col items-center gap-2 p-2 bg-white border rounded-xl cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 ${
                isHovered
                  ? "border-primary shadow-md bg-primary/5"
                  : "border-[#efeded] hover:border-primary/20"
              }`}
            >
              {/* Thumbnail preview of mask shape */}
              <div className="w-full aspect-square bg-slate-950 rounded-lg overflow-hidden border border-black/10 relative flex items-center justify-center">
                <img
                  src={mask}
                  alt={`Candidate ${idx + 1}`}
                  className="w-full h-full object-contain invert brightness-110 sepia hue-rotate-[100deg] saturate-150"
                  style={{ opacity: isHovered ? 0.9 : 0.6 }}
                />
                <span className="absolute bottom-1 right-1 bg-black/60 text-[9px] font-bold text-white px-1 py-0.5 rounded leading-none">
                  #{idx + 1}
                </span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(idx);
                }}
                className={`w-full h-7 flex items-center justify-center gap-1 text-[10px] font-bold rounded-lg cursor-pointer transition-colors ${
                  isHovered
                    ? "bg-primary text-white"
                    : "bg-[#efeded] text-on-surface-variant hover:bg-[#e4e1e0]"
                }`}
              >
                <Check size={10} />
                <span>Select</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
