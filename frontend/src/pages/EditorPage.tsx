import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Navbar } from "../components/layout/Navbar";
import { ImageCanvas } from "../components/editor/ImageCanvas";
import { EditorSidebar } from "../components/editor/EditorSidebar";
import { MaskCandidatePanel } from "../components/editor/MaskCandidatePanel";
import { useSelection } from "../hooks/useSelection";
import { useEditor } from "../hooks/useEditor";
import { EditorService } from "../services/editor.service";
import type { EditorMode } from "../types/editor";

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

  // Hover state for candidate masks
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

  // 1. Selection state layer hook
  const selection = useSelection(versionId || "", getToken);

  // 2. Editor prompt & generation action hook
  const editor = useEditor(versionId || "", projectId, mode, getToken);

  const handleBack = () => {
    if (projectId) {
      navigate(`/project/${projectId}`);
    } else {
      navigate("/projects");
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
        <div className="flex-1" />
        <span className="text-[10px] font-bold text-primary/70 bg-primary/5 px-2 py-0.5 rounded border border-primary/10 uppercase tracking-wider">
          {mode === "furniture-placement" ? "Furniture Placement" : "Interior Modification"}
        </span>
      </div>

      {/* Main workspace: [Candidates Panel?] + Canvas + Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Candidate selection panel — only visible when candidates are available.
             Sits beside the canvas so it never overlaps the image. */}
        <MaskCandidatePanel
          candidates={selection.candidateMasks}
          onSelect={selection.handleAcceptCandidate}
          hoveredIndex={hoveredCandidateIndex}
          onHover={setHoveredCandidateIndex}
        />

        {/* Canvas workspace */}
        <ImageCanvas
          imageUrl={imageUrl}
          overlayUrl={selection.combinedMask}
          hoveredOverlayUrl={
            hoveredCandidateIndex !== null
              ? (selection.candidateMasks[hoveredCandidateIndex]?.overlay_url ?? null)
              : null
          }
          isSegmenting={selection.isSegmenting}
          onSelectPoint={selection.handleSelectPoint}
        />

        {/* Right parameters and upload sidebar */}
        <EditorSidebar
          prompt={editor.prompt}
          onPromptChange={editor.setPrompt}
          selectionCount={selection.selectionCount}
          isSegmenting={selection.isSegmenting}
          isGenerating={editor.isGenerating}
          clickLabels={selection.clickLabels}
          selectedClickIndices={selection.selectedClickIndices}
          onToggleClickIndex={selection.toggleClickIndex}
          onRemoveClicks={selection.handleRemoveClicks}
          onClearSelection={selection.handleClearSelection}
          onGenerate={() => editor.handleGenerate(selection.combinedMask || "")}
          mode={mode}
          referenceUrl={editor.furnitureReferenceUrl}
          isUploadingReference={editor.isUploadingReference}
          onReferenceUpload={editor.handleReferenceUpload}
        />
      </div>
    </div>
  );
}
