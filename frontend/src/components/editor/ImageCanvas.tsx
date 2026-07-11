import { useState, useRef, useEffect } from "react";
import { SelectionOverlay } from "./SelectionOverlay";
import type { Point } from "../../types/editor";
import { Loader2 } from "lucide-react";

/**
 * Computes the largest box that fits inside `maxW × maxH`
 * while preserving the `naturalW × naturalH` aspect ratio.
 */
function fitInsideBox(
  naturalW: number,
  naturalH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  const scale = Math.min(maxW / naturalW, maxH / naturalH);
  return {
    width: Math.floor(naturalW * scale),
    height: Math.floor(naturalH * scale),
  };
}

interface ImageCanvasProps {
  imageUrl: string; // Cloudinary URL of the original image
  /** URL of the current combined selection overlay (full pre-rendered image from SAM).
   * When set, it is shown on top of the base image.
   * When null, only the base image is shown. */
  overlayUrl: string | null;
  /** URL of the hovered candidate's overlay image for live preview.
   * Shown with reduced opacity above the accepted overlay. */
  hoveredOverlayUrl: string | null;
  isSegmenting: boolean;
  onSelectPoint: (point: Point) => void;
}

/**
 * Three-layer stack for click-based SAM editor canvas.
 * Layer 1: Original Image (base room photo)
 * Layer 2: Accepted combined selection overlay (full pre-rendered SAM image)
 * Layer 2b: Hovered candidate preview (shown while browsing candidates)
 * Layer 3: Click-capture interaction region + loading indicator
 */
export function ImageCanvas({
  imageUrl,
  overlayUrl,
  hoveredOverlayUrl,
  isSegmenting,
  onSelectPoint,
}: ImageCanvasProps) {
  const [naturalDims, setNaturalDims] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [displayDims, setDisplayDims] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Keep track of client-space coordinates for click loader overlay
  const [clickPos, setClickPos] = useState<{ x: number; y: number } | null>(null);

  // Load natural dimensions
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setNaturalDims({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Compute container size based on parent bounds
  useEffect(() => {
    if (!naturalDims) return;

    const computeDisplay = () => {
      const workspace = workspaceRef.current;
      if (!workspace) return;

      const available = workspace.getBoundingClientRect();
      const padX = 48; // padding offset
      const padY = 48;
      const maxW = Math.max(available.width - padX, 1);
      const maxH = Math.max(available.height - padY, 1);

      setDisplayDims(
        fitInsideBox(naturalDims.width, naturalDims.height, maxW, maxH)
      );
    };

    computeDisplay();

    const observer = new ResizeObserver(computeDisplay);
    if (workspaceRef.current) observer.observe(workspaceRef.current);
    return () => observer.disconnect();
  }, [naturalDims]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container || !naturalDims || isSegmenting) return;

    const rect = container.getBoundingClientRect();
    const scaleX = naturalDims.width / rect.width;
    const scaleY = naturalDims.height / rect.height;

    // Capture click coordinates in natural dimensions space
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Record the client-space position for target loader indicator
    setClickPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    onSelectPoint({ x: Math.floor(x), y: Math.floor(y) });
  };

  // Clear click indicator once segmenting finishes
  useEffect(() => {
    if (!isSegmenting) {
      setClickPos(null);
    }
  }, [isSegmenting]);

  if (!naturalDims || !displayDims) {
    return (
      <div ref={workspaceRef} className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-[#707976]">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Loading workspace...
        </div>
      </div>
    );
  }

  const { width: displayW, height: displayH } = displayDims;

  return (
    <div
      ref={workspaceRef}
      className="flex-1 flex items-center justify-center overflow-hidden editor-workspace p-6 bg-[#faf8f7]"
    >
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`relative select-none rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
          isSegmenting ? "cursor-wait" : "cursor-crosshair hover:ring-2 hover:ring-primary/20"
        }`}
        style={{ width: displayW, height: displayH }}
      >
        {/* Layer 1: Room Image (base) */}
        <img
          src={imageUrl}
          alt="Room Workspace"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none"
          draggable={false}
        />

        {/* Layer 2: Accepted combined selection overlay (full pre-rendered SAM image).
            Shown at full opacity once a candidate is accepted. */}
        <SelectionOverlay overlayUrl={overlayUrl} />

        {/* Layer 2b: Hovered candidate preview — shown while browsing the candidate panel.
            Shown at reduced opacity so the user can preview before committing. */}
        {hoveredOverlayUrl && !overlayUrl && (
          <img
            src={hoveredOverlayUrl}
            alt="Candidate preview"
            className="absolute inset-0 w-full h-full object-fill pointer-events-none transition-opacity duration-150"
            style={{ zIndex: 3, opacity: 0.75 }}
            draggable={false}
          />
        )}

        {/* Layer 3: Click feedback loader (pulsing target cursor) */}
        {isSegmenting && clickPos && (
          <div
            className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-30"
            style={{ left: clickPos.x, top: clickPos.y }}
          >
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin flex items-center justify-center bg-white/70 shadow-md">
              <Loader2 size={12} className="text-primary animate-spin" />
            </div>
            <div className="absolute w-12 h-12 rounded-full border border-primary/40 animate-ping opacity-60" />
          </div>
        )}
      </div>
    </div>
  );
}
