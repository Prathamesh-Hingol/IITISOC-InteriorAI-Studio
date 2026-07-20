import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Camera, Loader2, RefreshCw, RotateCcw, AlertCircle } from "lucide-react";
import { generationsApi } from "../api/generations";
import { useGenerationDetail } from "../hooks/useGeneration";

// ─── View angle definitions ───────────────────────────────────────────────────
const VIEW_ANGLES = [
  { label: "Front-Left",  value: "a front-left diagonal angle",                       col: 1, row: 1 },
  { label: "Front",       value: "the front, straight on",                            col: 2, row: 1 },
  { label: "Front-Right", value: "a front-right diagonal angle",                      col: 3, row: 1 },
  { label: "Left",        value: "the left side",                                     col: 1, row: 2 },
  // center cell (col 2, row 2) = room icon — no angle
  { label: "Right",       value: "the right side",                                    col: 3, row: 2 },
  { label: "Back-Left",   value: "a back-left diagonal angle",                        col: 1, row: 3 },
  { label: "Back",        value: "directly behind, looking back toward the entrance", col: 2, row: 3 },
  { label: "Back-Right",  value: "a back-right diagonal angle",                       col: 3, row: 3 },
] as const;

// Direction arrows for each angle label
const ARROW_MAP: Record<string, string> = {
  "Front-Left":  "↖",
  "Front":       "↑",
  "Front-Right": "↗",
  "Left":        "←",
  "Right":       "→",
  "Back-Left":   "↙",
  "Back":        "↓",
  "Back-Right":  "↘",
};

export function MultiViewPage() {
  const { projectId, generationId } = useParams<{
    projectId: string;
    generationId: string;
  }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  // Fetch the base generation to get imageUrl
  const {
    data: generation,
    isLoading: isLoadingBase,
    error: baseError,
  } = useGenerationDetail(generationId);

  const [selectedAngle, setSelectedAngle] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!selectedAngle || !generationId || isGenerating) return;
    setIsGenerating(true);
    setGenError(null);

    try {
      const result = await generationsApi.createView(
        generationId,
        selectedAngle,
        getToken,
      );
      setGeneratedUrl(result.output_url);
    } catch (err: any) {
      setGenError(err?.message || "Generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setGeneratedUrl(null);
    setSelectedAngle(null);
    setSelectedLabel(null);
    setGenError(null);
  };

  const displayImageUrl = generatedUrl ?? generation?.imageUrl ?? null;
  const isShowingGenerated = !!generatedUrl;

  return (
    <main className="h-screen overflow-hidden bg-[#0b0b0d] text-white flex">
      {/* ── Left Control Panel ── */}
      <section className="w-[min(22rem,calc(100vw-2rem))] flex-shrink-0 flex flex-col border-r border-white/10 bg-[#141416]/90 backdrop-blur-md overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="mb-5 flex items-center gap-1.5 text-xs font-semibold text-white/60 transition hover:text-white"
          >
            <ArrowLeft size={14} /> Back to Studio
          </button>

          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#3bcca0]/15 text-[#3bcca0]">
              <Camera size={18} />
            </span>
            <div>
              <h1 className="text-sm font-bold leading-tight">Multi-View</h1>
              <p className="text-[11px] text-white/50 mt-0.5">
                Explore your room from any angle
              </p>
            </div>
          </div>
        </div>

        {/* Compass Grid + controls */}
        <div className="p-5 flex flex-col gap-4 flex-1">
          <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            Choose Camera Angle
          </p>

          {/* 3×3 Compass Rose */}
          <div
            className="grid gap-2"
            style={{
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
            }}
          >
            {[1, 2, 3].map((row) =>
              [1, 2, 3].map((col) => {
                // Center cell = room icon
                if (col === 2 && row === 2) {
                  return (
                    <div
                      key="center"
                      className="aspect-square flex items-center justify-center rounded-xl bg-white/5 border border-white/10"
                    >
                      <span className="text-xl">🏠</span>
                    </div>
                  );
                }

                const angle = VIEW_ANGLES.find(
                  (a) => a.col === col && a.row === row,
                );
                if (!angle) return null;

                const isSelected = selectedAngle === angle.value;

                return (
                  <button
                    key={angle.value}
                    onClick={() => {
                      setSelectedAngle(angle.value);
                      setSelectedLabel(angle.label);
                    }}
                    title={angle.label}
                    className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-xl border text-xs font-semibold transition-all duration-150 cursor-pointer select-none ${
                      isSelected
                        ? "bg-[#3bcca0]/20 border-[#3bcca0] text-[#3bcca0] scale-105 shadow-[0_0_12px_rgba(59,204,160,0.25)]"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/25"
                    }`}
                  >
                    <span className="text-base leading-none">
                      {ARROW_MAP[angle.label]}
                    </span>
                    <span className="text-[9px] leading-none">{angle.label}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Selected angle badge */}
          {selectedLabel && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
              <Camera size={12} className="text-[#3bcca0] flex-shrink-0" />
              <span className="truncate">
                <span className="text-white/40">Angle: </span>
                <span className="font-semibold text-white">{selectedLabel}</span>
              </span>
            </div>
          )}

          {/* Error message */}
          {genError && (
            <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/25 text-xs text-red-300 leading-relaxed">
              {genError}
            </div>
          )}

          {/* Generate button */}
          <button
            onClick={() => void handleGenerate()}
            disabled={!selectedAngle || isGenerating || isLoadingBase}
            id="multiview-generate-btn"
            className={`w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all duration-200 ${
              selectedAngle && !isGenerating && !isLoadingBase
                ? "bg-[#3bcca0] hover:bg-[#2db891] text-[#0b0b0d] cursor-pointer shadow-[0_0_20px_rgba(59,204,160,0.25)] hover:shadow-[0_0_28px_rgba(59,204,160,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <RefreshCw size={15} />
                {generatedUrl ? "Regenerate View" : "Generate View"}
              </>
            )}
          </button>

          {/* Reset — only visible after at least one generation */}
          {isShowingGenerated && (
            <button
              onClick={handleReset}
              className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white/60 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              <RotateCcw size={13} />
              Back to Base Image
            </button>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-5 border-t border-white/10 flex flex-col gap-2">
          <p className="text-[10px] text-white/30 leading-relaxed">
            Select an angle, then click Generate. You can re-generate as many
            times as you like — views are not saved to your project.
          </p>
          <div className="flex gap-2 items-start mt-1 bg-white/5 p-2 rounded-lg border border-white/5">
            <AlertCircle size={12} className="text-[#3bcca0] mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-white/55 leading-relaxed">
              <span className="font-bold text-white/70">Disclaimer:</span> If a part of the room is not visible in the base image, that camera angle cannot be generated.
            </p>
          </div>
        </div>
      </section>

      {/* ── Right Image Area ── */}
      <section className="flex-1 relative flex items-center justify-center bg-[#0b0b0d] overflow-hidden">
        {/* Loading base image */}
        {isLoadingBase && (
          <div className="flex flex-col items-center gap-3 text-white/50">
            <Loader2 size={32} className="animate-spin text-[#3bcca0]" />
            <span className="text-sm">Loading base image…</span>
          </div>
        )}

        {/* Base image error */}
        {baseError && !isLoadingBase && (
          <div className="flex flex-col items-center gap-3 text-red-300 text-sm text-center px-8">
            <span>Failed to load generation.</span>
            <span className="text-xs text-white/40">{baseError.message}</span>
          </div>
        )}

        {/* Generating overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0b0b0d]/75 backdrop-blur-sm gap-5">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-[#3bcca0]/20 border-t-[#3bcca0] animate-spin" />
              <Camera
                size={20}
                className="absolute inset-0 m-auto text-[#3bcca0]"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">
                Rendering view…
              </p>
              <p className="text-xs text-white/40 mt-1">{selectedLabel}</p>
            </div>
          </div>
        )}

        {/* Main image display */}
        {displayImageUrl && !isLoadingBase && (
          <>
            <img
              key={displayImageUrl}
              src={displayImageUrl}
              alt={
                isShowingGenerated
                  ? `${selectedLabel} view`
                  : "Base room image"
              }
              className="max-w-full max-h-full object-contain select-none"
              style={{
                opacity: isGenerating ? 0.25 : 1,
                transition: "opacity 0.3s ease",
              }}
            />

            {/* Angle badge bottom-left */}
            <div className="absolute bottom-5 left-5 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-black/55 backdrop-blur-md border border-white/10 text-xs font-semibold text-white shadow-lg pointer-events-none">
              <Camera size={12} className="text-[#3bcca0]" />
              {isShowingGenerated ? (
                <span>{selectedLabel} View</span>
              ) : (
                <span className="text-white/50">Original Base Image</span>
              )}
            </div>
          </>
        )}

        {/* Empty state */}
        {!displayImageUrl && !isLoadingBase && !baseError && (
          <div className="flex flex-col items-center gap-3 text-white/20">
            <Camera size={48} strokeWidth={1} />
            <span className="text-sm">No image available</span>
          </div>
        )}
      </section>
    </main>
  );
}
