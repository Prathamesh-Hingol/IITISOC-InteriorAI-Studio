import { useState } from "react";
import { Check, Layers, Loader2 } from "lucide-react";
import type { SegmentCandidate } from "../../types/editor";

interface MaskCandidatePanelProps {
  candidates: SegmentCandidate[];
  onSelect: (index: number) => void;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  isSegmenting: boolean;
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
  isSegmenting,
}: MaskCandidatePanelProps) {
  const [selectingIndex, setSelectingIndex] = useState<number | null>(null);

  if (candidates.length === 0) return null;

  // True while the acceptance API call is in-flight for a chosen card
  const isAccepting = isSegmenting && selectingIndex !== null;

  const handleSelect = (arrayIdx: number, candidateIndex: number) => {
    setSelectingIndex(arrayIdx);
    onSelect(candidateIndex);
  };

  return (
    <div className="w-[200px] h-full flex-shrink-0 bg-white border-r border-[#efeded] flex flex-col overflow-hidden animate-in slide-in-from-left-4 fade-in duration-300">
      {/* Header */}
      <div className="px-3 py-3 border-b border-[#efeded] flex items-center gap-2">
        <div className="w-6 h-6 bg-primary/5 rounded-lg flex items-center justify-center border border-primary/10">
          <Layers size={12} className="text-primary" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-[#1b1c1c] leading-none">SAM Candidates</p>
          <p className="text-[9px] text-[#c0c8c5] mt-0.5">
            {isAccepting ? "Locking in selection…" : "Click to select region"}
          </p>
        </div>
      </div>

      {/* Scrollable candidate list */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
        {candidates.map((candidate, idx) => {
          const isHovered = hoveredIndex === idx && !isAccepting;
          const isSelecting = isAccepting && selectingIndex === idx;
          const isDimmed = isAccepting && selectingIndex !== idx;

          return (
            <div
              key={candidate.candidate_index}
              onMouseEnter={() => !isAccepting && onHover(idx)}
              onMouseLeave={() => !isAccepting && onHover(null)}
              onClick={() => !isAccepting && handleSelect(idx, candidate.candidate_index)}
              className={`flex flex-col gap-1.5 p-1.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                isSelecting
                  ? "border-emerald-400 shadow-lg shadow-emerald-100 bg-emerald-50 scale-[1.02]"
                  : isHovered
                    ? "border-primary shadow-md bg-primary/5 scale-[1.02]"
                    : "border-[#efeded] hover:border-primary/30 bg-white"
              } ${isDimmed ? "opacity-40 pointer-events-none" : ""}`}
            >
              {/* Full-size candidate image */}
              <div className="w-full aspect-video rounded-lg overflow-hidden relative bg-[#f5f3f3]">
                <img
                  src={candidate.overlay_url}
                  alt={`Candidate ${idx + 1}`}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    isSelecting ? "brightness-105" : ""
                  }`}
                  draggable={false}
                />

                {/* Emerald overlay shimmer when selecting */}
                {isSelecting && (
                  <div className="absolute inset-0 bg-emerald-400/20 animate-pulse rounded-lg" />
                )}

                {/* Score badge */}
                <span className="absolute top-1 right-1 bg-black/60 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none">
                  {Math.round(candidate.score * 100)}%
                </span>

                {/* Index badge — spinner when selecting, number otherwise */}
                <span
                  className={`absolute top-1 left-1 text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center min-w-[20px] ${
                    isSelecting ? "bg-emerald-500" : "bg-primary/80"
                  }`}
                >
                  {isSelecting ? (
                    <Loader2 size={9} className="animate-spin" />
                  ) : (
                    `#${idx + 1}`
                  )}
                </span>
              </div>

              {/* Select / Locking-in button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isAccepting) handleSelect(idx, candidate.candidate_index);
                }}
                disabled={isAccepting}
                className={`w-full h-7 flex items-center justify-center gap-1 text-[10px] font-bold rounded-lg transition-all duration-200 ${
                  isSelecting
                    ? "bg-emerald-500 text-white cursor-wait"
                    : isHovered
                      ? "bg-primary text-white cursor-pointer"
                      : "bg-[#f5f3f3] text-[#707976] hover:bg-[#e4e1e0] cursor-pointer"
                } disabled:cursor-not-allowed`}
              >
                {isSelecting ? (
                  <>
                    <Loader2 size={10} className="animate-spin" />
                    <span>Locking in…</span>
                  </>
                ) : (
                  <>
                    <Check size={10} />
                    <span>Select</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

