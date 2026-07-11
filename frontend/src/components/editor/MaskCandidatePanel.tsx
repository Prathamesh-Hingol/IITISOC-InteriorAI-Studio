import { Check, Layers } from "lucide-react";
import type { SegmentCandidate } from "../../types/editor";

interface MaskCandidatePanelProps {
  candidates: SegmentCandidate[];
  onSelect: (index: number) => void;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
}

/**
 * Panel that displays the candidate overlay images returned by SAM.
 * Each candidate is a complete pre-rendered image (original room + highlighted region).
 * Positioned as a fixed left-side panel so it never covers the canvas.
 */
export function MaskCandidatePanel({
  candidates,
  onSelect,
  hoveredIndex,
  onHover,
}: MaskCandidatePanelProps) {
  if (candidates.length === 0) return null;

  return (
    <div className="w-[200px] h-full flex-shrink-0 bg-white border-r border-[#efeded] flex flex-col overflow-hidden animate-in slide-in-from-left-4 fade-in duration-300">
      {/* Header */}
      <div className="px-3 py-3 border-b border-[#efeded] flex items-center gap-2">
        <div className="w-6 h-6 bg-primary/5 rounded-lg flex items-center justify-center border border-primary/10">
          <Layers size={12} className="text-primary" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#1b1c1c] leading-none">SAM Candidates</p>
          <p className="text-[9px] text-[#c0c8c5] mt-0.5">Click to select region</p>
        </div>
      </div>

      {/* Scrollable candidate list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {candidates.map((candidate, idx) => {
          const isHovered = hoveredIndex === idx;
          const scorePercent = Math.round(candidate.score * 100);

          return (
            <div
              key={candidate.candidate_index}
              onMouseEnter={() => onHover(idx)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(candidate.candidate_index)}
              className={`flex flex-col gap-1.5 p-1.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                isHovered
                  ? "border-primary shadow-md bg-primary/5 scale-[1.02]"
                  : "border-[#efeded] hover:border-primary/30 bg-white"
              }`}
            >
              {/* Full-size candidate image */}
              <div className="w-full aspect-video rounded-lg overflow-hidden relative bg-[#f5f3f3]">
                <img
                  src={candidate.overlay_url}
                  alt={`Candidate ${idx + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                {/* Score badge */}
                <span className="absolute top-1 right-1 bg-black/60 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none">
                  {scorePercent}%
                </span>
                {/* Index badge */}
                <span className="absolute top-1 left-1 bg-primary/80 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none">
                  #{idx + 1}
                </span>
              </div>

              {/* Select button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(candidate.candidate_index);
                }}
                className={`w-full h-7 flex items-center justify-center gap-1 text-[10px] font-bold rounded-lg cursor-pointer transition-colors ${
                  isHovered
                    ? "bg-primary text-white"
                    : "bg-[#f5f3f3] text-[#707976] hover:bg-[#e4e1e0]"
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
