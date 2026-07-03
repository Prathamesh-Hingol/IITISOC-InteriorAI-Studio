import { useRef, useEffect } from "react";

interface SelectionOverlayProps {
  width: number;
  height: number;
  maskUrl: string | null; // Cloudinary URL of the combined binary mask PNG
  hoveredMaskUrl: string | null; // Base64 data URL of the hovered candidate mask
}

/**
 * Composites the read-only combined selection mask (Layer 2) onto a canvas
 * as a semi-transparent green overlay at 35% opacity.
 * Also renders any hovered candidate mask from SAM in a separate color
 * to support immediate previewing.
 */
export function SelectionOverlay({
  width,
  height,
  maskUrl,
  hoveredMaskUrl,
}: SelectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    const drawMask = (
      src: string,
      r: number,
      g: number,
      b: number,
      opacity: number
    ): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const offscreen = document.createElement("canvas");
          offscreen.width = width;
          offscreen.height = height;
          const offCtx = offscreen.getContext("2d");
          if (!offCtx) {
            resolve();
            return;
          }

          offCtx.drawImage(img, 0, 0, width, height);
          const imageData = offCtx.getImageData(0, 0, width, height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            // White pixels represent the mask
            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
            if (brightness > 128) {
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = 255;
            } else {
              data[i + 3] = 0;
            }
          }

          offCtx.putImageData(imageData, 0, 0);

          ctx.globalAlpha = opacity;
          ctx.drawImage(offscreen, 0, 0);
          ctx.globalAlpha = 1.0;
          resolve();
        };

        img.onerror = () => {
          resolve();
        };

        img.src = src;
      });
    };

    const render = async () => {
      // 1. Draw permanent combined selection mask in green (35% opacity)
      if (maskUrl) {
        await drawMask(maskUrl, 34, 197, 94, 0.35);
      }

      // 2. Draw hovered candidate mask in blue (50% opacity) for rich feedback
      if (hoveredMaskUrl) {
        await drawMask(hoveredMaskUrl, 59, 130, 246, 0.50);
      }
    };

    render();
  }, [maskUrl, hoveredMaskUrl, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 2, pointerEvents: "none" }}
    />
  );
}
