import { ArrowLeft, Box, Loader2, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { DepthParallaxCanvas } from "../components/viewer/DepthParallaxCanvas";
import { useGenerationDepth } from "../hooks/useGeneration";

export function DepthViewerPage() {
  const { projectId, generationId } = useParams<{ projectId: string; generationId: string }>();
  const navigate = useNavigate();
  const { data: depthAssets, isLoading, error, refetch } = useGenerationDepth(generationId);
  const [strength, setStrength] = useState(30);
  const [viewRange, setViewRange] = useState(45);
  const [fitMode, setFitMode] = useState<"contain" | "cover">("cover");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement === document.documentElement);
    document.addEventListener("fullscreenchange", syncFullscreenState);
    return () => document.removeEventListener("fullscreenchange", syncFullscreenState);
  }, []);

  const resetView = () => {
    setStrength(30);
    setViewRange(45);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  };

  return (
    <main className="h-screen overflow-hidden bg-[#0b0b0d] text-white">
      {depthAssets && (
        <DepthParallaxCanvas
          imageUrl={depthAssets.imageUrl}
          depthRaw16Url={depthAssets.depthRaw16Url}
          strength={strength}
          viewRange={viewRange}
          fitMode={fitMode}
        />
      )}

      <section className="absolute left-4 top-4 z-10 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#141416]/90 p-4 shadow-2xl backdrop-blur-md">
        <button
          onClick={() => navigate(`/project/${projectId}`)}
          className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-white/75 transition hover:text-white"
        >
          <ArrowLeft size={15} /> Back to Studio
        </button>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3bcca0]/15 text-[#3bcca0]"><Box size={17} /></span>
          <div>
            <h1 className="text-sm font-bold">3D Depth View</h1>
            <p className="text-[11px] text-white/55">Drag to explore image depth</p>
          </div>
        </div>

        {isLoading && <div className="flex items-center gap-2 py-5 text-sm text-white/75"><Loader2 size={18} className="animate-spin" /> Creating depth map…</div>}
        {error && (
          <div className="space-y-3 py-2 text-sm text-red-200">
            <p>{error.message || "Unable to create a depth map."}</p>
            <button onClick={() => refetch()} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">Try again</button>
          </div>
        )}

        {depthAssets && (
          <div className="space-y-4">
            <label className="block text-xs text-white/75">
              <span className="mb-2 flex justify-between"><span>Displacement strength</span><span>{strength}</span></span>
              <input className="w-full accent-[#3bcca0]" type="range" min="0" max="100" value={strength} onChange={(event) => setStrength(Number(event.target.value))} />
            </label>
            <label className="block text-xs text-white/75">
              <span className="mb-2 flex justify-between"><span>View range</span><span>{viewRange}</span></span>
              <input className="w-full accent-[#3bcca0]" type="range" min="10" max="60" value={viewRange} onChange={(event) => setViewRange(Number(event.target.value))} />
            </label>
            <div>
              <span className="mb-2 block text-xs text-white/75">Sizing mode</span>
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/5 p-1">
                <button
                  onClick={() => setFitMode("cover")}
                  className={`rounded-md px-2 py-2 text-xs font-semibold transition ${fitMode === "cover" ? "bg-white text-[#0b0b0d]" : "text-white/65 hover:text-white"}`}
                >
                  Fill Screen
                </button>
                <button
                  onClick={() => setFitMode("contain")}
                  className={`rounded-md px-2 py-2 text-xs font-semibold transition ${fitMode === "contain" ? "bg-white text-[#0b0b0d]" : "text-white/65 hover:text-white"}`}
                >
                  Fit Image
                </button>
              </div>
            </div>
            <button onClick={() => void toggleFullscreen()} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>
            <button onClick={resetView} className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"><RotateCcw size={14} /> Reset view</button>
          </div>
        )}
      </section>

      {depthAssets && <p className="pointer-events-none absolute inset-x-0 bottom-5 z-10 text-center text-xs text-white/45">Hover to peek · click and drag to explore · touch and drag on mobile</p>}
    </main>
  );
}
