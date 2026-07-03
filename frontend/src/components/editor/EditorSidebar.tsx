import {
  Paintbrush,
  Undo2,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  Circle,
  Armchair,
} from "lucide-react";
import { FurnitureReferenceUpload } from "./FurnitureReferenceUpload";
import type { EditorMode } from "../../types/editor";

interface EditorSidebarProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  selectionCount: number;
  isSegmenting: boolean;
  isGenerating: boolean;
  onUndo: () => void;
  onClearSelection: () => void;
  onGenerate: () => void;
  mode: EditorMode;
  // Furniture Reference Uploads (only for furniture-placement)
  referenceUrl: string | null;
  isUploadingReference: boolean;
  onReferenceUpload: (file: File | null) => void;
}

/**
 * Right sidebar panel for the AI Image Editor.
 * Tailored dynamically based on the Mode (Interior Modification vs Furniture Placement).
 */
export function EditorSidebar({
  prompt,
  onPromptChange,
  selectionCount,
  isSegmenting,
  isGenerating,
  onUndo,
  onClearSelection,
  onGenerate,
  mode,
  referenceUrl,
  isUploadingReference,
  onReferenceUpload,
}: EditorSidebarProps) {
  const isFurnitureMode = mode === "furniture-placement";
  
  // Generation is enabled if we have at least one object segment selected, a design prompt,
  // and we are not currently executing segmentation or generation requests.
  const hasSelection = selectionCount > 0;
  const hasPrompt = prompt.trim().length > 0;
  const canGenerate = hasSelection && hasPrompt && !isGenerating && !isSegmenting && !isUploadingReference;

  return (
    <div className="w-[320px] h-full bg-white border-l border-[#efeded] flex flex-col justify-between overflow-y-auto select-none">
      <div className="flex-1 flex flex-col gap-5 p-5">
        {/* Header */}
        <div className="pb-4 border-b border-[#efeded]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 bg-primary/5 rounded-lg flex items-center justify-center border border-primary/10">
              {isFurnitureMode ? (
                <Armchair size={14} className="text-primary" />
              ) : (
                <Paintbrush size={14} className="text-primary" />
              )}
            </div>
            <h2 className="text-sm font-bold text-[#1b1c1c]">
              {isFurnitureMode ? "Furniture Placement" : "Interior Modification"}
            </h2>
          </div>
          <p className="text-[11px] text-[#707976] leading-relaxed mt-1">
            {isFurnitureMode
              ? "Click on the room region to place furniture. Upload an optional style reference image."
              : "Click directly on room elements (walls, floors, items) to highlight, then describe updates."}
          </p>
        </div>

        {/* ─── Selection Status ──────────────────────────────── */}
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
                <span>{selectionCount} Object{selectionCount > 1 ? "s" : ""} Highlighted</span>
              </>
            ) : (
              <>
                <Circle size={14} className="text-[#c0c8c5]" />
                <span>Click objects on the image</span>
              </>
            )}
          </div>
        </div>

        {/* ─── Interactive Actions (Undo/Clear) ──────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#707976]">
            Selection History
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onUndo}
              disabled={!hasSelection || isSegmenting || isGenerating}
              title="Undo Last Highlight"
              className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-semibold rounded-lg border border-[#efeded] bg-white text-[#1b1c1c] hover:bg-[#f5f3f3] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <Undo2 size={13} />
              Undo
            </button>
            <button
              type="button"
              onClick={onClearSelection}
              disabled={!hasSelection || isSegmenting || isGenerating}
              title="Clear Highlights"
              className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-semibold rounded-lg border border-[#efeded] bg-white text-red-500 hover:bg-red-50 hover:border-red-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <Trash2 size={13} />
              Clear
            </button>
          </div>
        </div>

        <hr className="border-[#efeded]" />

        {/* ─── Prompt ────────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[#707976]">
            Design Instructions
          </label>
          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            placeholder={
              isFurnitureMode
                ? "e.g., Add a luxury brown leather lounge chair with matching ottoman"
                : "e.g., Replace the white walls with wooden panelling"
            }
            rows={4}
            className="w-full text-xs text-[#1b1c1c] placeholder:text-[#c0c8c5] resize-none rounded-xl p-3 border border-[#efeded] focus:outline-none focus:border-primary/20 bg-[#faf8f7] focus:bg-white leading-relaxed transition-all"
          />
        </div>

        {/* ─── Furniture Reference (Optional) ────────────────── */}
        {isFurnitureMode && (
          <FurnitureReferenceUpload
            referenceUrl={referenceUrl}
            isUploading={isUploadingReference}
            onUpload={onReferenceUpload}
          />
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="p-5 border-t border-[#efeded] bg-white">
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
              <span>Generate Selection</span>
            </>
          )}
        </button>
        {!hasSelection && (
          <p className="text-[10px] text-[#c0c8c5] text-center mt-2">
            Highlight at least one element to begin editing
          </p>
        )}
        {hasSelection && !hasPrompt && (
          <p className="text-[10px] text-amber-500 text-center mt-2 animate-pulse">
            Enter design prompt instructions to enable generation
          </p>
        )}
      </div>
    </div>
  );
}
