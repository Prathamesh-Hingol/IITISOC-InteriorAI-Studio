import { useEffect, useRef, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import type { DragObjectMeta } from "../../types/drag";

interface DraggableObjectCanvasProps {
  backgroundUrl: string;
  cutoutUrl: string;
  depthUrl: string;
  meta: DragObjectMeta;
  autoScaleEnabled: boolean;
  onReset: () => void;
  isFullscreen?: boolean;
}

export function DraggableObjectCanvas({
  backgroundUrl,
  cutoutUrl,
  depthUrl,
  meta,
  autoScaleEnabled,
  onReset,
  isFullscreen = false,
}: DraggableObjectCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // References to loaded Image objects
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const cutoutImgRef = useRef<HTMLImageElement | null>(null);
  const depthImgRef = useRef<HTMLImageElement | null>(null);

  // Hidden offscreen canvas for sampling depth values
  const depthCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const depthCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Coordinates of the cutout (in background image natural space)
  const objXRef = useRef<number>(meta.centroid.x);
  const objYRef = useRef<number>(meta.centroid.y);
  const origDepthValueRef = useRef<number | null>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [isDraggingState, setIsDraggingState] = useState(false);

  // Load all three images
  useEffect(() => {
    let active = true;
    setImagesLoaded(false);
    setLoadingError(null);

    const bgImg = new Image();
    const cutoutImg = new Image();
    const depthImg = new Image();

    // Use anonymous crossOrigin to avoid canvas tainted errors when calling getImageData
    bgImg.crossOrigin = "anonymous";
    cutoutImg.crossOrigin = "anonymous";
    depthImg.crossOrigin = "anonymous";

    let loadedCount = 0;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === 3 && active) {
        bgImgRef.current = bgImg;
        cutoutImgRef.current = cutoutImg;
        depthImgRef.current = depthImg;

        // Initialize depth canvas
        const dCanvas = document.createElement("canvas");
        dCanvas.width = depthImg.width;
        dCanvas.height = depthImg.height;
        const dCtx = dCanvas.getContext("2d");
        if (dCtx) {
          dCtx.drawImage(depthImg, 0, 0);
          depthCanvasRef.current = dCanvas;
          depthCtxRef.current = dCtx;
        }

        // Setup coordinates
        objXRef.current = meta.centroid.x;
        objYRef.current = meta.centroid.y;

        // Sample initial depth
        if (dCtx) {
          origDepthValueRef.current = sampleDepthAt(meta.centroid.x, meta.centroid.y, dCanvas, dCtx);
        }

        setImagesLoaded(true);
      }
    };

    const handleError = () => {
      if (active) {
        setLoadingError("Failed to load drag assets. Please check internet connection.");
      }
    };

    bgImg.onload = checkAllLoaded;
    bgImg.onerror = handleError;
    bgImg.src = backgroundUrl;

    cutoutImg.onload = checkAllLoaded;
    cutoutImg.onerror = handleError;
    cutoutImg.src = cutoutUrl;

    depthImg.onload = checkAllLoaded;
    depthImg.onerror = handleError;
    depthImg.src = depthUrl;

    return () => {
      active = false;
    };
  }, [backgroundUrl, cutoutUrl, depthUrl, meta]);

  // Sample depth value from offscreen context
  const sampleDepthAt = (px: number, py: number, dCanvas: HTMLCanvasElement, dCtx: CanvasRenderingContext2D) => {
    const x = Math.max(0, Math.min(dCanvas.width - 1, Math.round(px)));
    const y = Math.max(0, Math.min(dCanvas.height - 1, Math.round(py)));
    try {
      const imgData = dCtx.getImageData(x, y, 1, 1).data;
      return imgData[0]; // R channel represents grayscale depth
    } catch (e) {
      console.warn("Unable to sample depth pixel:", e);
      return 128; // Fallback to neutral depth
    }
  };

  // Main render loop
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bgImage = bgImgRef.current;
    const cutoutImage = cutoutImgRef.current;

    if (!bgImage || !cutoutImage) return;

    // Clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

    // Compute scale and draw cutout
    let scale = 1.0;
    if (autoScaleEnabled && depthCanvasRef.current && depthCtxRef.current && origDepthValueRef.current !== null) {
      const currentDepth = sampleDepthAt(
        objXRef.current,
        objYRef.current,
        depthCanvasRef.current,
        depthCtxRef.current
      );
      const ratio = currentDepth / Math.max(origDepthValueRef.current, 1);
      // Clamp between 0.25 and 2.5
      scale = Math.max(0.25, Math.min(2.5, ratio));
    }

    const w = cutoutImage.width * scale;
    const h = cutoutImage.height * scale;

    const drawX = objXRef.current - w / 2;
    const drawY = objYRef.current - h / 2;

    ctx.save();
    // Drop shadow
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 14 * scale;
    ctx.shadowOffsetY = 6 * scale;
    ctx.drawImage(cutoutImage, drawX, drawY, w, h);
    ctx.restore();
  };

  // Handle auto-scale checkbox changes
  useEffect(() => {
    if (imagesLoaded) {
      render();
    }
  }, [autoScaleEnabled, imagesLoaded]);

  // Canvas size setter
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && imagesLoaded && bgImgRef.current) {
      canvas.width = bgImgRef.current.width;
      canvas.height = bgImgRef.current.height;
      render();
    }
  }, [imagesLoaded]);

  // Map client event coordinates to canvas coordinates (natural size)
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!imagesLoaded) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;

    // Check if the click/touch is near the object cutout center to start drag
    const cutoutImage = cutoutImgRef.current;
    if (!cutoutImage) return;

    // We can assume clicking inside a bounding box starts the drag
    // Wait, any click starts drag from the current object center in the simple HTML demo:
    // dragOffsetX = p.x - objX; dragOffsetY = p.y - objY;
    // Let's do that for the easiest, most fluid UX!
    dragOffsetRef.current = {
      x: coords.x - objXRef.current,
      y: coords.y - objYRef.current,
    };

    isDraggingRef.current = true;
    setIsDraggingState(true);
  };

  const handlePointerMove = (e: MouseEvent | TouchEvent) => {
    if (!isDraggingRef.current || !imagesLoaded || !canvasRef.current) return;

    // We need to cast event properly since listeners are on window
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;

    // Move object, constraining it inside canvas bounds
    objXRef.current = Math.max(0, Math.min(canvas.width, canvasX - dragOffsetRef.current.x));
    objYRef.current = Math.max(0, Math.min(canvas.height, canvasY - dragOffsetRef.current.y));

    render();
  };

  const handlePointerUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDraggingState(false);
    }
  };

  // Wire up window listeners for global move and release (so dragging is stable off-canvas)
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => handlePointerMove(e);
    const handleGlobalTouchMove = (e: TouchEvent) => handlePointerMove(e);
    const handleGlobalUp = () => handlePointerUp();

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalUp);
    window.addEventListener("touchmove", handleGlobalTouchMove, { passive: true });
    window.addEventListener("touchend", handleGlobalUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalUp);
      window.removeEventListener("touchmove", handleGlobalTouchMove);
      window.removeEventListener("touchend", handleGlobalUp);
    };
  }, [imagesLoaded]);

  // Escape key handler to reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onReset();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onReset]);

  return (
    <div className={`w-full flex flex-col items-center gap-4 relative ${isFullscreen ? "h-full flex-1 min-h-0" : ""}`}>
      {/* Interactive Drag Canvas Box */}
      <div className={`w-full rounded-xl bg-slate-900 border border-[#efeded] relative overflow-hidden flex items-center justify-center ${isFullscreen ? "h-full flex-1 min-h-0" : "aspect-video"}`}>
        {!imagesLoaded && !loadingError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/80 text-white z-10">
            <RefreshCw size={24} className="animate-spin text-primary" />
            <span className="text-xs font-semibold">Preparing Drag Canvas...</span>
          </div>
        )}

        {loadingError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-900/90 text-red-400 z-10 px-4 text-center">
            <span className="text-xs font-bold">{loadingError}</span>
            <button
              onClick={onReset}
              className="mt-2 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[10px] font-bold transition-all"
            >
              Go Back
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          className={`max-w-full max-h-full w-auto h-auto object-contain cursor-grab select-none touch-none ${
            isDraggingState ? "cursor-grabbing" : ""
          }`}
          style={{ display: imagesLoaded ? "block" : "none" }}
        />

        {imagesLoaded && (
          <button
            onClick={onReset}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm transition-all"
            title="Reset Canvas (Esc)"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Floating Instructions Banner */}
      {imagesLoaded && (
        <div className="text-[10px] text-center text-on-surface-variant font-medium animate-pulse">
          Drag object anywhere in the scene • Drop to place • Press Escape or Click X to reset
        </div>
      )}
    </div>
  );
}
