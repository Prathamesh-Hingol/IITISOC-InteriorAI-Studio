import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Loader2, AlertCircle, Move, X } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { ImageCanvas } from "../components/editor/ImageCanvas";
import { EditorSidebar } from "../components/editor/EditorSidebar";
import { EditorTimeline } from "../components/editor/EditorTimeline";
import { MaskCandidatePanel } from "../components/editor/MaskCandidatePanel";
import { useSelection } from "../hooks/useSelection";
import { useEditor } from "../hooks/useEditor";
import { EditorService } from "../services/editor.service";
import { DraggableObjectCanvas } from "../components/drag/DraggableObjectCanvas";
import type { CanvasTarget, EditorMode, SegmentExtractResponse } from "../types/editor";

interface LocationState {
  version?: {
    id: string;
    image?: string;
    title?: string;
    parentId?: string;
    prompt?: string;
    preset?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

/**
 * AI Image Editor Page.
 * Coordinates selection points, candidate mask displays, combined overlay
 * rendering, and furniture uploads according to the active mode query parameter.
 */
export function EditorPage() {
  const { versionId } = useParams<{ versionId: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const state = location.state as LocationState | null;

  // Read active mode from query string ("interior-modification" or "furniture-placement")
  const mode = (searchParams.get("mode") as EditorMode) || "interior-modification";

  // Version Data
  const [imageUrl, setImageUrl] = useState<string | null>(
    state?.version?.image || null,
  );
  const [versionTitle, setVersionTitle] = useState(
    state?.version?.title || "Editor",
  );
  const [projectId, setProjectId] = useState<string>("");
  const [isLoadingVersion, setIsLoadingVersion] = useState(!state?.version?.image);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Hover state for candidate masks (furniture-placement only)
  const [hoveredCandidateIndex, setHoveredCandidateIndex] = useState<number | null>(null);

  // Fetch version on refresh (when router state is missing)
  useEffect(() => {
    if (imageUrl || !versionId) return;

    let cancelled = false;

    async function fetchVersion() {
      setIsLoadingVersion(true);
      try {
        const generation = await EditorService.getVersion(versionId!, getToken);
        if (cancelled) return;

        setImageUrl(generation.imageUrl);
        setVersionTitle(generation.title || "Editor");
        setProjectId(generation.projectId || "");
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to fetch version:", err);
        setLoadError("Could not load this version. It may have been deleted.");
      } finally {
        if (!cancelled) setIsLoadingVersion(false);
      }
    }

    fetchVersion();
    return () => {
      cancelled = true;
    };
  }, [versionId, imageUrl, getToken]);

  // Set projectId from router state if available
  useEffect(() => {
    if (state?.version?.projectId) {
      setProjectId(state.version.projectId);
    }
  }, [state]);

  const isSegmentationMode = mode === "furniture-placement" || mode === "object-move";

  // Canvas target state: "base" vs "reference"
  const [canvasTarget, setCanvasTarget] = useState<CanvasTarget>("base");

  // Editor prompt & generation action hook
  const editor = useEditor(versionId || "", projectId, mode, getToken);

  // Dual segmentation hooks — base room image vs reference furniture image
  const baseSelection = useSelection(isSegmentationMode ? (versionId || "") : "", getToken, {
    isReferenceMask: false,
  });
  const refSelection = useSelection(isSegmentationMode ? (versionId || "") : "", getToken, {
    isReferenceMask: true,
    referenceUrl: editor.furnitureReferenceUrl,
  });

  const activeSelection = canvasTarget === "reference" ? refSelection : baseSelection;
  const activeCanvasUrl =
    canvasTarget === "reference" && editor.furnitureReferenceUrl
      ? editor.furnitureReferenceUrl
      : (imageUrl || "");
  const targetName = canvasTarget === "reference" ? "Reference Furniture Image" : "Base Room Image";

  const [dragResult, setDragResult] = useState<SegmentExtractResponse | null>(null);
  const [isExtractingMove, setIsExtractingMove] = useState(false);

  const handleMove = async () => {
    if (isExtractingMove || !versionId) return;
    setIsExtractingMove(true);
    try {
      const res = await EditorService.segmentExtract({ versionId }, getToken);
      // SAM /segment/extract consumes the session server-side, no need to
      // call /segment/clear — just reset the frontend selection state locally.
      baseSelection.clearCandidates();
      setDragResult(res);
    } catch (err) {
      console.error("Failed to extract object for dragging:", err);
    } finally {
      setIsExtractingMove(false);
    }
  };

  const handleBack = async () => {
    try {
      if (versionId) {
        await Promise.all([
          baseSelection.handleClearSelection(),
          refSelection.handleClearSelection(),
        ]);
      }
    } catch (clearErr) {
      console.warn("[Editor] Failed to clear SAM sessions on back:", clearErr);
    } finally {
      if (projectId) {
        navigate(`/project/${projectId}`);
      } else {
        navigate("/projects");
      }
    }
  };

  // ─── Loading state ──────────────────────────────────────────

  if (isLoadingVersion) {
    return (
      <div className="h-screen w-screen flex flex-col bg-[#faf8f7]">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-primary mb-4" size={40} />
          <p className="text-sm font-medium text-[#707976]">
            Loading editor workspace...
          </p>
        </div>
      </div>
    );
  }

  // ─── Error state ────────────────────────────────────────────

  if (loadError || !imageUrl) {
    return (
      <div className="h-screen w-screen flex flex-col bg-[#faf8f7]">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <AlertCircle className="text-red-500 mb-4" size={40} />
          <h2 className="text-lg font-bold text-primary mb-1">
            Failed to load Editor
          </h2>
          <p className="text-sm text-[#707976] max-w-sm mb-6">
            {loadError || "The workspace image could not be loaded."}
          </p>
          <button
            onClick={() => navigate("/projects")}
            className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg shadow cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Editor Layout ─────────────────────────────────────

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#faf8f7]">
      {/* Navbar */}
      <Navbar />

      {/* Editor toolbar strip */}
      <div className="h-12 border-b border-[#efeded] bg-white/80 backdrop-blur-sm flex items-center px-5 gap-4 mt-14 z-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#707976] hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>Back to Studio</span>
        </button>
        <div className="h-5 w-px bg-[#efeded]" />
        <span className="text-xs font-bold text-[#1b1c1c] truncate">
          {versionTitle}
        </span>
        <div className="flex-1 flex justify-center">
          {isSegmentationMode && (
            <EditorTimeline
              mode={mode}
              canvasTarget={canvasTarget}
              onTargetChange={setCanvasTarget}
              baseMaskUrl={baseSelection.combinedMask}
              baseSelectionCount={baseSelection.selectionCount}
              referenceImageUrl={editor.furnitureReferenceUrl}
              referenceMaskUrl={refSelection.combinedMask}
              referenceSelectionCount={refSelection.selectionCount}
            />
          )}
        </div>
        <span className="text-[10px] font-bold text-primary/70 bg-primary/5 px-2 py-0.5 rounded border border-primary/10 uppercase tracking-wider">
          {mode === "furniture-placement"
            ? "Furniture Placement"
            : mode === "object-move"
              ? "Object Lift & Move"
              : "Interior Modification"}
        </span>
      </div>

      {/* Main workspace: [Candidates Panel?] + Canvas + Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Candidate panel — only in segmentation modes */}
        {isSegmentationMode && (
          <MaskCandidatePanel
            candidates={activeSelection.candidateMasks}
            onSelect={activeSelection.handleAcceptCandidate}
            hoveredIndex={hoveredCandidateIndex}
            onHover={setHoveredCandidateIndex}
            isSegmenting={activeSelection.isSegmenting}
          />

        )}

        {/* Canvas workspace */}
        <ImageCanvas
          imageUrl={activeCanvasUrl}
          overlayUrl={isSegmentationMode ? activeSelection.combinedMask : null}
          hoveredOverlayUrl={
            isSegmentationMode && hoveredCandidateIndex !== null
              ? (activeSelection.candidateMasks[hoveredCandidateIndex]?.overlay_url ?? null)
              : null
          }
          isSegmenting={isSegmentationMode ? activeSelection.isSegmenting : false}
          onSelectPoint={isSegmentationMode ? activeSelection.handleSelectPoint : undefined}
          targetName={isSegmentationMode ? targetName : undefined}
        />

        {/* Right parameters and upload sidebar */}
        <EditorSidebar
          prompt={editor.prompt}
          onPromptChange={editor.setPrompt}
          canvasTarget={canvasTarget}
          onTargetChange={setCanvasTarget}
          selectionCount={activeSelection.selectionCount}
          isSegmenting={activeSelection.isSegmenting}
          isGenerating={editor.isGenerating || isExtractingMove}
          clickLabels={activeSelection.clickLabels}
          selectedClickIndices={activeSelection.selectedClickIndices}
          onToggleClickIndex={activeSelection.toggleClickIndex}
          onRemoveClicks={activeSelection.handleRemoveClicks}
          onClearSelection={activeSelection.handleClearSelection}
          baseMaskUrl={baseSelection.combinedMask}
          referenceMaskUrl={refSelection.combinedMask}
          referenceSelectionCount={refSelection.selectionCount}
          onGenerate={() => editor.handleGenerate(baseSelection.combinedMask || "", refSelection.combinedMask || null)}
          onModify={editor.handleModify}
          onMove={handleMove}
          mode={mode}
          referenceUrl={editor.furnitureReferenceUrl}
          isUploadingReference={editor.isUploadingReference}
          onReferenceUpload={editor.handleReferenceUpload}
        />
      </div>

      {dragResult && createPortal(
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#070d0c] select-none">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#0b1512]/95 border-b border-white/10 backdrop-blur-md flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
                <Move size={16} className="text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white leading-none">Object Lift &amp; Drag Workspace</h2>
                <p className="text-[10px] text-white/50 mt-0.5">Drag the object to visualise placement · Press Escape or X to close</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBack}
              className="p-2 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-all cursor-pointer"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Canvas fills remaining space */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 p-6">
            <DraggableObjectCanvas
              backgroundUrl={dragResult.backgroundUrl}
              cutoutUrl={dragResult.cutoutUrl}
              depthUrl={dragResult.depthUrl}
              meta={dragResult.meta}
              autoScaleEnabled={true}
              onReset={() => setDragResult(null)}
              isFullscreen={true}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
