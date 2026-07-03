import React, { useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";

interface FurnitureReferenceUploadProps {
  referenceUrl: string | null;
  isUploading: boolean;
  onUpload: (file: File | null) => void;
}

/**
 * Premium Drag-and-drop reference image uploader for Furniture Placement mode.
 * Shows thumbnail previews with close actions and loading states.
 */
export function FurnitureReferenceUpload({
  referenceUrl,
  isUploading,
  onUpload,
}: FurnitureReferenceUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!isUploading && !referenceUrl) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2 select-none">
      <label className="text-[11px] font-bold uppercase tracking-wider text-[#707976]">
        Furniture Reference (Optional)
      </label>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      <div
        onClick={handleClick}
        className={`relative border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 transition-all duration-200 ${
          referenceUrl
            ? "border-primary bg-primary/5 cursor-default"
            : isUploading
              ? "border-[#c0c8c5] bg-[#faf8f7] cursor-not-allowed"
              : "border-[#c0c8c5] hover:border-primary/40 hover:bg-[#faf8f7] cursor-pointer"
        }`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <Loader2 size={20} className="animate-spin text-primary" />
            <span className="text-[10px] font-semibold text-on-surface-variant">
              Uploading reference to Cloudinary...
            </span>
          </div>
        ) : referenceUrl ? (
          <div className="relative w-full flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-black/10 relative bg-white">
              <img
                src={referenceUrl}
                alt="Furniture reference"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 text-left">
              <span className="text-[10px] font-bold text-primary block leading-tight">
                Reference Uploaded
              </span>
              <span className="text-[9px] text-[#707976] block truncate max-w-[140px]">
                Click X to remove reference
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 text-on-surface-variant hover:text-red-500 bg-[#efeded]/60 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
              title="Remove Reference"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 py-2">
            <div className="w-8 h-8 rounded-lg bg-[#efeded]/60 flex items-center justify-center text-[#707976]">
              <Upload size={14} />
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#1b1c1c] block">
                Upload furniture style
              </span>
              <span className="text-[10px] text-[#c0c8c5] block mt-0.5">
                PNG, JPG up to 10MB
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
