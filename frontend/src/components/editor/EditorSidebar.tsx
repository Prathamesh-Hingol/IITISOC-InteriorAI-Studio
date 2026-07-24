import {
  Paintbrush,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  Armchair,
  X,
  Move,
  ArrowRight,
  Image as ImageIcon,
} from "lucide-react";
import { FurnitureReferenceUpload } from "./FurnitureReferenceUpload";
import type { CanvasTarget, EditorMode } from "../../types/editor";

interface EditorSidebarProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  // --- Canvas Target ---
  canvasTarget?: CanvasTarget;
  onTargetChange?: (target: CanvasTarget) => void;
  // --- Segmentation props (furniture-placement and object-move modes) ---
  selectionCount: number;
  isSegmenting: boolean;
  isGenerating: boolean;
  clickLabels: string[];
  selectedClickIndices: number[];
  onToggleClickIndex: (index: number) => void;
  onRemoveClicks: () => void;
  onClearSelection: () => void;
  baseMaskUrl?: string | null;
  // --- Reference Image Segmentation ---
  referenceMaskUrl?: string | null;
  referenceSelectionCount?: number;
  // --- Generation callbacks ---
  onGenerate: () => void;       // furniture-placement: requires mask
  onModify: () => void;         // interior-modification: prompt-only
  onMove?: () => void;          // object-move: requires mask
  mode: EditorMode;
  // Furniture Reference Uploads (only for furniture-placement)
  referenceUrl: string | null;
  isUploadingReference: boolean;
  onReferenceUpload: (file: File | null) => void;
}

/**
 * Right sidebar panel for the AI Image Editor.
 * - interior-modification: shows only a prompt textarea + generate button (no segmentation UI).
 * - furniture-placement: shows the full segmentation + prompt + reference upload flow.
 */
export function EditorSidebar({
  prompt,
  onPromptChange,
  canvasTarget = "base",
  onTargetChange,
  selectionCount,
  isSegmenting,
  isGenerating,
  clickLabels,
  selectedClickIndices,
  onToggleClickIndex,
  onRemoveClicks,
  onClearSelection,
  baseMaskUrl = null,
  referenceMaskUrl = null,
  referenceSelectionCount = 0,
  onGenerate,
  onModify,
  onMove,
  mode,
  referenceUrl,
  isUploadingReference,
  onReferenceUpload,
}: EditorSidebarProps) {
  const isFurnitureMode = mode === "furniture-placement";
  const isMoveMode = mode === "object-move";
  const isSegmentationMode = isFurnitureMode || isMoveMode;

  // Active canvas selection status
  const hasSelection = selectionCount > 0;

  // Base room selection (either active or saved in baseMaskUrl)
  const hasBaseSelection = Boolean(baseMaskUrl) || (canvasTarget === "base" ? selectionCount > 0 : false);
  const hasReference = Boolean(referenceUrl);
  const hasRefSelection = Boolean(referenceMaskUrl) || (canvasTarget === "reference" ? selectionCount > 0 : referenceSelectionCount > 0);
  const hasPrompt = prompt.trim().length > 0;
  const canGenerate =
    hasBaseSelection &&
    (!hasReference || hasRefSelection) &&
    hasPrompt &&
    !isGenerating &&
    !isSegmenting &&
    !isUploadingReference;
  const hasSelectedForRemoval = selectedClickIndices.length > 0;

  // Interior-modification mode gate (prompt-only)
  const canModify = hasPrompt && !isGenerating;

  // Move mode gate
  const canMove = hasSelection && !isGenerating && !isSegmenting;

  return (
    <div className="w-[320px] h-full bg-white border-l border-[#efeded] flex flex-col justify-between overflow-y-auto select-none">
      <div className="flex-1 flex flex-col gap-5 p-5">
        {/* Header */}
        <div className="pb-4 border-b border-[#efeded]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-primary/5 rounded-lg flex items-center justify-center border border-primary/10">
              {isFurnitureMode ? (
                <Armchair size={14} className="text-primary" />
              ) : isMoveMode ? (
                <Move size={14} className="text-primary" />
              ) : (
                <Paintbrush size={14} className="text-primary" />
              )}
            </div>
            <h2 className="text-sm font-bold text-[#1b1c1c]">
              {isFurnitureMode ? "Furniture Placement" : isMoveMode ? "Object Lift & Move" : "Interior Modification"}
            </h2>
          </div>
          <p className="text-[11px] text-[#707976] leading-relaxed mt-1">
            {isFurnitureMode
              ? "Click on the room region to place furniture. Upload an optional style reference image."
              : isMoveMode
                ? "Click on the object to highlight it for moving."
                : "Describe the interior changes you want applied to this room."}
          </p>
        </div>

        {/* ─── INTERIOR MODIFICATION: Prompt-Only UI ─────────── */}
        {mode === "interior-modification" && (
          <div className="flex flex-col gap-4">
            {/* Prompt */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#707976]">
                Design Instructions
              </label>
              <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="e.g., Replace the white walls with wooden panelling and add warm ambient lighting"
                rows={6}
                className="w-full text-xs text-[#1b1c1c] placeholder:text-[#c0c8c5] resize-none rounded-xl p-3 border border-[#efeded] focus:outline-none focus:border-primary/20 bg-[#faf8f7] focus:bg-white leading-relaxed transition-all"
              />
            </div>

            {/* Info card */}
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-3.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary/80">
                <Paintbrush size={12} />
                <span>Full-image edit</span>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                The AI will apply your instructions across the entire scene using the context pipeline.
              </p>
            </div>
          </div>
        )}

        {/* ─── SEGMENTATION/MOVE MODES: Full Segmentation UI ──────── */}
        {isSegmentationMode && (
          <>
            {/* Selection Status */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#707976]">
                Selection Status
              </label>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  isSegmenting
                    ? "bg-amber-50 border-amber-200 text-amber-700 animate-pulse"
                    : hasSelection
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-[#f5f3f3] border-[#efeded] text-[#707976]"
                }`}
              >
                {isSegmenting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Segmenting selection...</span>
                  </>
                ) : hasSelection ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>
                      {selectionCount} Object{selectionCount > 1 ? "s" : ""} Highlighted
                    </span>
                  </>
                ) : (
                  <>
                    <Circle size={14} className="text-[#c0c8c5]" />
                    <span>Click objects on the image</span>
                  </>
                )}
              </div>
            </div>

            {/* Selection History */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#707976]">
                Selection History
              </label>

              {clickLabels.length === 0 ? (
                <p className="text-[11px] text-[#c0c8c5] italic px-1">
                  No clicks recorded yet.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {clickLabels.map((label, arrayIndex) => {
                    const originalIndex = parseInt(label.replace("Click #", ""), 10);
                    const isSelected = selectedClickIndices.includes(originalIndex);
                    return (
                      <button
                        key={arrayIndex}
                        type="button"
                        onClick={() => onToggleClickIndex(originalIndex)}
                        disabled={isSegmenting || isGenerating}
                        title={isSelected ? `Deselect ${label}` : `Select ${label} for removal`}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border text-[11px] font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          isSelected
                            ? "bg-red-50 border-red-300 text-red-600 shadow-sm"
                            : "bg-[#f5f3f3] border-[#efeded] text-[#1b1c1c] hover:bg-[#ede9e8] hover:border-[#c0c8c5]"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isSelected
                                ? "bg-red-500 text-white"
                                : "bg-[#00362d]/10 text-[#00362d]"
                            }`}
                          >
                            {originalIndex}
                          </span>
                          {label}
                        </span>
                        {isSelected && <X size={12} className="text-red-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Remove Selected + Clear All actions */}
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={onRemoveClicks}
                  disabled={!hasSelectedForRemoval || isSegmenting || isGenerating}
                  title="Remove selected clicks from mask"
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-semibold rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <X size={12} />
                  Remove{hasSelectedForRemoval ? ` (${selectedClickIndices.length})` : ""}
                </button>
                <button
                  type="button"
                  onClick={onClearSelection}
                  disabled={!hasSelection || isSegmenting || isGenerating}
                  title="Clear All Highlights"
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-semibold rounded-lg border border-[#efeded] bg-white text-[#707976] hover:bg-[#f5f3f3] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  <Trash2 size={12} />
                  Clear All
                </button>
              </div>
            </div>

            {isFurnitureMode && (
              <>
                <hr className="border-[#efeded]" />

                {/* Prompt */}
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-[#707976]">
                    Design Instructions
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => onPromptChange(e.target.value)}
                    placeholder="e.g., Add a luxury brown leather lounge chair with matching ottoman"
                    rows={4}
                    className="w-full text-xs text-[#1b1c1c] placeholder:text-[#c0c8c5] resize-none rounded-xl p-3 border border-[#efeded] focus:outline-none focus:border-primary/20 bg-[#faf8f7] focus:bg-white leading-relaxed transition-all"
                  />
                </div>

                {/* Furniture Reference (Optional) */}
                <FurnitureReferenceUpload
                  referenceUrl={referenceUrl}
                  isUploading={isUploadingReference}
                  onUpload={onReferenceUpload}
                />

                {/* Move to Reference Image action button */}
                {referenceUrl && onTargetChange && (
                  <div className="pt-1">
                    {canvasTarget === "base" ? (
                      <button
                        type="button"
                        onClick={() => onTargetChange("reference")}
                        className="w-full py-2.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-primary/20"
                      >
                        <ImageIcon size={14} />
                        <span>Move to Reference Image</span>
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onTargetChange("base")}
                        className="w-full py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-[#1b1c1c] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-gray-300"
                      >
                        <ImageIcon size={14} />
                        <span>Switch to Base Room Image</span>
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="p-5 border-t border-[#efeded] bg-white">
        {isFurnitureMode ? (
          <>
            <button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate}
              className={`w-full h-12 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-md ${
                canGenerate
                  ? "bg-[#00362d] hover:bg-[#1a4d43] text-white hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-[#efeded] text-[#c0c8c5] cursor-not-allowed shadow-none"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Generating Design...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Place Furniture</span>
                </>
              )}
            </button>
            {!hasBaseSelection && (
              <p className="text-[10px] text-[#c0c8c5] text-center mt-2">
                Highlight base room region to begin
              </p>
            )}
            {hasBaseSelection && hasReference && !hasRefSelection && (
              <p className="text-[10px] text-amber-600 text-center mt-2 font-medium animate-pulse">
                Reference photo uploaded: Segment reference furniture to place
              </p>
            )}
            {hasBaseSelection && (!hasReference || hasRefSelection) && !hasPrompt && (
              <p className="text-[10px] text-amber-500 text-center mt-2 animate-pulse">
                Enter design instructions to enable generation
              </p>
            )}
          </>
        ) : isMoveMode ? (
          <>
            <button
              type="button"
              onClick={onMove}
              disabled={!canMove}
              className={`w-full h-12 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-md ${
                canMove
                  ? "bg-[#00362d] hover:bg-[#1a4d43] text-white hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-[#efeded] text-[#c0c8c5] cursor-not-allowed shadow-none"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Extracting Object...</span>
                </>
              ) : (
                <>
                  <Move size={16} />
                  <span>Move Object</span>
                </>
              )}
            </button>
            {!hasSelection && (
              <p className="text-[10px] text-[#c0c8c5] text-center mt-2">
                Highlight at least one region to begin
              </p>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onModify}
              disabled={!canModify}
              className={`w-full h-12 flex items-center justify-center gap-2 text-sm font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-md ${
                canModify
                  ? "bg-[#00362d] hover:bg-[#1a4d43] text-white hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-[#efeded] text-[#c0c8c5] cursor-not-allowed shadow-none"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Applying Changes...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Apply Modification</span>
                </>
              )}
            </button>
            {!hasPrompt && (
              <p className="text-[10px] text-[#c0c8c5] text-center mt-2">
                Enter design instructions to apply changes
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
