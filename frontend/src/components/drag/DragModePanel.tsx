import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Move, Loader2, AlertCircle, Maximize2, X } from "lucide-react";
import { useDragObject } from "../../hooks/useDragObject";
import { DraggableObjectCanvas } from "./DraggableObjectCanvas";
import type { VersionNode } from "../../types";

interface DragModePanelProps {
  activeNode: VersionNode | null;
  getToken: () => Promise<string | null>;
}

export function DragModePanel({ activeNode, getToken }: DragModePanelProps) {
  const { isExtracting, result, error, handleExtract, handleReset } = useDragObject(getToken);

  const [autoScale, setAutoScale] = useState(true);
  // Auto-launch fullscreen as soon as the Move tab is activated
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number } | null>(null);

  const imageRef = useRef<HTMLImageElement>(null);

  // Read natural image dimensions whenever active image changes
  useEffect(() => {
    if (!activeNode?.image) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () =>
      setNaturalDims({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = activeNode.image;
  }, [activeNode?.image]);

  // Coordinate mapping: displayed click → natural image pixel coords
  const resolveClickCoords = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const naturalW = naturalDims?.width || 1024;
    const naturalH = naturalDims?.height || 1024;
    return {
      x: Math.round((e.clientX - rect.left) * (naturalW / rect.width)),
      y: Math.round((e.clientY - rect.top) * (naturalH / rect.height)),
    };
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeNode?.image || isExtracting || result) return;
    const { x, y } = resolveClickCoords(e);
    handleExtract(activeNode.image, x, y);
  };

  // Escape key closes fullscreen only (not reset)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ─── Sidebar Collapsed View (shown when fullscreen is closed) ───

  if (!activeNode) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-on-surface-variant">
        <AlertCircle size={20} className="mb-2 text-outline" />
        <span className="text-xs">Select a version node from the tree to begin.</span>
      </div>
    );
  }

  return (
    <>
      {/* ─── Sidebar Placeholder (visible when fullscreen is closed) ─────── */}
      <div className="flex flex-col gap-4 flex-1">
        {/* Status Card */}
        <div className="bg-[#faf8f7] border border-[#efeded] rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-primary/80 font-bold">
            <Move size={13} />
            <span>Object Lift & Drag Mode</span>
          </div>
          <p className="text-[11px] text-on-surface-variant leading-relaxed">
            {result
              ? "An object has been extracted and is ready to drag in the fullscreen workspace."
              : "Click the button below to open the fullscreen workspace and click any object to lift it."}
          </p>

          {/* Re-open fullscreen button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="w-full flex items-center justify-center gap-2 h-10 bg-[#00362d] hover:bg-[#1a4d43] text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Maximize2 size={14} />
            {result ? "Re-open Workspace" : "Open Move Workspace"}
          </button>

          {result && (
            <button
              type="button"
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 h-8 border border-[#efeded] text-[#707976] hover:text-red-500 hover:border-red-200 hover:bg-red-50 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Reset & Start Over
            </button>
          )}
        </div>

        {/* Mini thumbnail of result if available */}
        {result && (
          <div
            className="relative aspect-video w-full rounded-xl overflow-hidden border border-[#efeded] bg-slate-950 cursor-pointer group"
            onClick={() => setIsFullscreen(true)}
          >
            <img
              src={result.backgroundUrl}
              alt="Clean background"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
              <span className="bg-black/60 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Maximize2 size={11} />
                Re-open Workspace
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── Fullscreen Overlay Modal — rendered via Portal into document.body ─── */}
      {isFullscreen && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col select-none">
          {/* Full dark background */}
          <div className="absolute inset-0 bg-[#070d0c]" />

          {/* Top Bar */}
          <div className="relative z-10 flex items-center justify-between px-6 py-4 bg-[#0b1512]/95 border-b border-white/10 backdrop-blur-md flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                <Move size={16} className="text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-none">
                  Object Lift & Drag Workspace
                </h2>
                <p className="text-[10px] text-white/50 mt-0.5">
                  {result
                    ? "Drag the highlighted object to visualise placement · no changes are saved"
                    : "Click on any object or furniture in the image to lift it"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-scale toggle — always visible in header */}
              {result && (
                <label className="flex items-center gap-2 text-[11px] text-white/70 cursor-pointer font-medium select-none border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 transition-all">
                  <input
                    type="checkbox"
                    checked={autoScale}
                    onChange={(e) => setAutoScale(e.target.checked)}
                    className="w-3.5 h-3.5 accent-primary cursor-pointer"
                  />
                  Depth-aware scale
                </label>
              )}
              {result && (
                <button
                  type="button"
                  onClick={() => { handleReset(); }}
                  className="text-[11px] font-semibold text-white/60 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all cursor-pointer"
                title="Close Fullscreen (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Main Content — fills remaining height */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center min-h-0 p-6">
            {!result ? (
              // ── Phase 1: Click image to extract ──────────────
              <div className="relative group w-full h-full flex flex-col items-center justify-center gap-4">
                {/* Instruction pill */}
                {!isExtracting && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-xs font-semibold px-4 py-2 rounded-full shadow-md">
                    <Move size={13} className="text-primary" />
                    Click directly on any furniture or object in the image below
                  </div>
                )}

                {/* Clickable image — fills available space */}
                <div
                  onClick={handleImageClick}
                  className={`relative rounded-2xl overflow-hidden border border-white/10 bg-black flex items-center justify-center cursor-crosshair transition-all duration-300 max-w-full max-h-full flex-1 w-full min-h-0 shadow-2xl ${
                    isExtracting
                      ? "pointer-events-none opacity-70"
                      : "hover:ring-2 hover:ring-primary/40"
                  }`}
                >
                  {activeNode.image ? (
                    <img
                      ref={imageRef}
                      src={activeNode.image}
                      alt={activeNode.title}
                      className="max-w-full max-h-full w-auto h-auto object-contain select-none pointer-events-none"
                      style={{ display: "block" }}
                    />
                  ) : (
                    <div className="p-12 text-white/40 text-sm">No image available</div>
                  )}

                  {/* Crosshair hover overlay */}
                  {!isExtracting && activeNode.image && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 flex items-center justify-center transition-colors pointer-events-none">
                      <span className="bg-black/70 text-white text-sm font-bold px-5 py-2.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 shadow-xl border border-white/10">
                        <Move size={16} />
                        Click to Lift Object
                      </span>
                    </div>
                  )}

                  {/* Extracting Spinner */}
                  {isExtracting && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-10">
                      <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                      <p className="text-white text-sm font-bold">Extracting Object...</p>
                      <p className="text-white/50 text-xs">SAM2 is segmenting · LaMa is filling background</p>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-400 font-semibold bg-red-900/30 border border-red-500/30 px-5 py-3 rounded-2xl">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            ) : (
              // ── Phase 2: Draggable Canvas ─────────────────────
              <div className="w-full h-full flex flex-col min-h-0">
                <DraggableObjectCanvas
                  backgroundUrl={result.backgroundUrl}
                  cutoutUrl={result.cutoutUrl}
                  depthUrl={result.depthUrl}
                  meta={result.meta}
                  autoScaleEnabled={autoScale}
                  onReset={handleReset}
                  isFullscreen={true}
                />
              </div>
            )}
          </div>
        </div>
      , document.body)}
    </>
  );
}
