interface SelectionOverlayProps {
  /** URL of the currently accepted combined overlay image returned by accept-candidate.
   *  This is a full pre-rendered image (original room + cumulative highlighted regions).
   *  When null, nothing is shown.
   */
  overlayUrl: string | null;
}

/**
 * Simple image overlay that displays the combined selection image from the SAM service.
 * The SAM service now returns fully pre-rendered images (original room + highlighted mask),
 * so no canvas compositing or pixel manipulation is needed — just render the image.
 */
export function SelectionOverlay({ overlayUrl }: SelectionOverlayProps) {
  if (!overlayUrl) return null;

  return (
    <img
      src={overlayUrl}
      alt="Selection overlay"
      className="absolute inset-0 w-full h-full object-fill pointer-events-none"
      style={{ zIndex: 2 }}
      draggable={false}
    />
  );
}
