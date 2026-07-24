import { CheckCircle2, Circle, ChevronRight, Image as ImageIcon, Sparkles } from "lucide-react";
import type { CanvasTarget, EditorMode } from "../../types/editor";

interface EditorTimelineProps {
  mode: EditorMode;
  canvasTarget: CanvasTarget;
  onTargetChange: (target: CanvasTarget) => void;
  baseMaskUrl: string | null;
  baseSelectionCount: number;
  referenceImageUrl: string | null;
  referenceMaskUrl: string | null;
  referenceSelectionCount: number;
}

export function EditorTimeline({
  mode,
  canvasTarget,
  onTargetChange,
  baseMaskUrl,
  baseSelectionCount,
  referenceImageUrl,
  referenceMaskUrl,
  referenceSelectionCount,
}: EditorTimelineProps) {
  const isFurnitureMode = mode === "furniture-placement";
  const hasBaseSelection = Boolean(baseMaskUrl || baseSelectionCount > 0);
  const hasReference = Boolean(referenceImageUrl);
  const hasRefSelection = Boolean(referenceMaskUrl || referenceSelectionCount > 0);

  return (
    <div className="flex items-center gap-2 bg-[#f3efec] px-3 py-1.5 rounded-full border border-[#e4dec9]/80 shadow-sm select-none">
      {/* STEP 1: Base Room Image */}
      <button
        type="button"
        onClick={() => onTargetChange("base")}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          canvasTarget === "base"
            ? "bg-[#00362d] text-white shadow-sm"
            : hasBaseSelection
              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
              : "text-[#707976] hover:bg-white/80"
        }`}
        title="Switch to Base Room Image canvas"
      >
        {hasBaseSelection ? (
          <CheckCircle2 size={13} className={canvasTarget === "base" ? "text-white" : "text-emerald-600"} />
        ) : (
          <Circle size={13} className={canvasTarget === "base" ? "text-white/70" : "text-gray-400"} />
        )}
        <span>1. Base Room</span>
      </button>

      {/* Separator Arrow */}
      <ChevronRight size={13} className="text-[#c0c8c5] shrink-0" />

      {/* STEP 2: Reference Furniture Object */}
      {isFurnitureMode && (
        <>
          <button
            type="button"
            onClick={() => {
              if (hasReference) onTargetChange("reference");
            }}
            disabled={!hasReference}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              !hasReference
                ? "text-gray-400 opacity-40 cursor-not-allowed"
                : canvasTarget === "reference"
                  ? "bg-[#00362d] text-white shadow-sm cursor-pointer"
                  : hasRefSelection
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer"
                    : "text-[#707976] hover:bg-white/80 cursor-pointer"
            }`}
            title={hasReference ? "Switch to Reference Furniture canvas" : "Upload reference photo first"}
          >
            {hasRefSelection ? (
              <CheckCircle2 size={13} className={canvasTarget === "reference" ? "text-white" : "text-emerald-600"} />
            ) : (
              <ImageIcon size={13} className={canvasTarget === "reference" ? "text-white/70" : "text-gray-400"} />
            )}
            <span>2. Reference Furniture</span>
          </button>

          <ChevronRight size={13} className="text-[#c0c8c5] shrink-0" />
        </>
      )}

      {/* STEP 3: Generate */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#707976] px-2.5 py-1">
        <Sparkles size={13} className="text-amber-500 shrink-0" />
        <span>3. Generate</span>
      </div>
    </div>
  );
}
