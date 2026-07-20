import { motion } from "framer-motion";
import { Upload, ImagePlus, Sparkles, Loader2 } from "lucide-react";

interface StudioOnboardingProps {
  isLoading: boolean;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPromptSubmit: (e: React.FormEvent) => void;
  prompt: string;
  onPromptChange: (value: string) => void;
}

export function StudioOnboarding({
  isLoading,
  onImageUpload,
  onPromptSubmit,
  prompt,
  onPromptChange,
}: StudioOnboardingProps) {
  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-6 md:p-12 bg-[#faf8f7] overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full flex flex-col gap-8 text-center"
      >
        <div>
          <span className="text-[10px] uppercase tracking-[0.15em] font-bold text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
            Project Onboarding
          </span>
          <h2 className="text-3xl font-extrabold text-primary mt-4 tracking-tight">
            Choose how you want to begin
          </h2>
          <p className="text-xs text-on-surface-variant max-w-md mx-auto mt-2 leading-relaxed">
            Initialize your interior design studio workspace. Select a reference room photo or generate a brand new space from a text prompt.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full items-stretch">
          {/* Option 1: Upload Room Image */}
          <div className="flex flex-col p-8 rounded-3xl bg-white border border-[#efeded] hover:border-primary/20 shadow-[0_15px_40px_-15px_rgba(0,54,45,0.03)] hover:shadow-[0_20px_50px_-15px_rgba(0,54,45,0.06)] transition-all duration-300 items-center justify-between text-center gap-6 group">
            <div className="w-14 h-14 bg-[#efeded]/60 rounded-2xl flex items-center justify-center text-primary border border-[#efeded] group-hover:scale-105 transition-transform">
              <Upload size={22} />
            </div>
            <div className="flex-1 flex flex-col gap-2">
              <h3 className="text-base font-bold text-primary">Upload Room Image</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed px-2">
                Start with an existing photo of a room. This enables interior restyling and object furniture placement on top of your photo.
              </p>
            </div>
            <label className="w-full flex items-center justify-center gap-2 h-11 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl cursor-pointer shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
              <ImagePlus size={14} />
              <span>{isLoading ? "Uploading..." : "Select Room Image"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onImageUpload}
                disabled={isLoading}
              />
            </label>
          </div>

          {/* Option 2: Start From Prompt */}
          <form
            onSubmit={onPromptSubmit}
            className="flex flex-col p-8 rounded-3xl bg-white border border-[#efeded] hover:border-primary/20 shadow-[0_15px_40px_-15px_rgba(0,54,45,0.03)] hover:shadow-[0_20px_50px_-15px_rgba(0,54,45,0.06)] transition-all duration-300 items-center justify-between text-center gap-6"
          >
            <div className="w-14 h-14 bg-[#efeded]/60 rounded-2xl flex items-center justify-center text-primary border border-[#efeded]">
              <Sparkles size={22} />
            </div>
            <div className="w-full flex flex-col gap-2">
              <h3 className="text-base font-bold text-primary">Start From Prompt</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed px-2">
                Generate a completely new room base from a description using FLUX Schnell.
              </p>
            </div>

            <div className="w-full">
              <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                placeholder="e.g., 'A modern penthouse living room with concrete walls, modular beige sofa, and large windows looking over Manhattan...'"
                required
                rows={3}
                disabled={isLoading}
                className="w-full p-3 text-xs text-on-surface placeholder:text-outline/60 bg-surface-container-low border border-[#efeded] rounded-xl focus:outline-none focus:border-primary/30 focus:bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className={`w-full flex items-center justify-center gap-2 h-11 text-xs font-bold rounded-xl shadow-md transition-all ${
                prompt.trim() && !isLoading
                  ? "bg-[#00362d] text-white hover:bg-[#1a4d43] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  : "bg-[#efeded] text-[#c0c8c5] cursor-not-allowed"
              }`}
            >
              <Sparkles size={14} />
              <span>Generate Room Base</span>
            </button>
          </form>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant font-medium animate-pulse mt-4 bg-white/60 border border-[#efeded] py-3 px-6 rounded-2xl max-w-sm mx-auto shadow-sm backdrop-blur-sm">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span>Processing base workspace image...</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
