import { AnimatePresence, motion } from "framer-motion";
import { Box, Calendar, Eye, Sparkles, X } from "lucide-react";
import type { VersionNode } from "../../types";

interface StudioPreviewModalProps {
  node: VersionNode | null;
  onClose: () => void;
  onView3D: (node: VersionNode) => void;
}

export function StudioPreviewModal({ node, onClose, onView3D }: StudioPreviewModalProps) {
  return (
    <AnimatePresence>
      {node && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#001f1a]/85 backdrop-blur-md pointer-events-auto cursor-pointer"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="relative w-full max-w-5xl h-[85vh] md:h-[650px] bg-white rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-[#efeded]/30 flex flex-col md:flex-row pointer-events-auto"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-[#00362d]/10 hover:bg-[#00362d]/25 text-[#00362d] md:text-white md:bg-black/30 md:hover:bg-black/50 hover:scale-105 active:scale-95 rounded-full transition-all cursor-pointer shadow-sm flex items-center justify-center"
              title="Close Preview"
            >
              <X size={18} />
            </button>

            {/* Left Column: Visual Pane */}
            <div className="flex-1 md:h-full bg-black/95 flex items-center justify-center p-4 relative overflow-hidden">
              {node.image ? (
                <img
                  src={node.image}
                  alt={node.title}
                  className="w-full h-full object-contain max-h-[40vh] md:max-h-full rounded-lg"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-outline-variant font-medium text-sm">
                  No Preview Image Available
                </div>
              )}

              {/* Version title overlay */}
              <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm px-3.5 py-1.5 rounded-lg border border-white/10 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <Eye size={12} className="text-[#3bcca0]" />
                <span>{node.title} Preview</span>
              </div>
            </div>

            {/* Right Column: Metadata Sidebar */}
            <div className="w-full md:w-[380px] md:h-full bg-[#faf8f7] border-t md:border-t-0 md:border-l border-[#efeded] flex flex-col justify-between p-6 md:p-8 overflow-y-auto">
              <div className="flex flex-col gap-6">
                {/* Header */}
                <div>
                  <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-primary/60 bg-primary/5 px-2.5 py-1 rounded-full border border-primary/10">
                    Version Details
                  </span>
                  <h2 className="text-xl font-bold text-primary mt-3 leading-tight">{node.title}</h2>
                  <p className="text-[11px] text-[#707976] mt-1 flex items-center gap-1">
                    <Calendar size={11} />
                    <span>Generated {node.createdAt}</span>
                  </p>
                </div>

                <hr className="border-[#efeded]" />

                {/* Parameters */}
                <div className="flex flex-col gap-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary/80">Parameters</h3>
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-white border border-[#efeded] rounded-xl p-3 shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                      <span className="text-[10px] font-semibold text-[#707976] block mb-1">Preset Style</span>
                      <span className="text-xs font-bold text-primary flex items-center gap-1">
                        <Sparkles size={12} className="text-primary/70" />
                        {node.preset || "Default"}
                      </span>
                    </div>
                    <div className="bg-white border border-[#efeded] rounded-xl p-3 shadow-[0_2px_4px_rgba(0,0,0,0.01)]">
                      <span className="text-[10px] font-semibold text-[#707976] block mb-1">AI Strength</span>
                      <span className="text-xs font-bold text-primary">
                        {node.creativityStrength !== undefined ? `${node.creativityStrength}%` : "N/A"}
                      </span>
                    </div>
                    <div className="bg-white border border-[#efeded] rounded-xl p-3 shadow-[0_2px_4px_rgba(0,0,0,0.01)] col-span-2">
                      <span className="text-[10px] font-semibold text-[#707976] block mb-1">Generation Mode</span>
                      <span className="text-xs font-bold text-primary capitalize">
                        {node.generationMode === "restyle"
                          ? "Style Restructuring"
                          : node.generationMode === "furnish-empty"
                          ? "Furnish Empty Room"
                          : "Original Upload"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Prompt */}
                {node.prompt && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary/80">AI Prompt</h3>
                    <div className="bg-white border border-[#efeded] rounded-xl p-4 shadow-[0_2px_4px_rgba(0,0,0,0.01)] text-xs text-on-surface-variant leading-relaxed italic max-h-[140px] overflow-y-auto">
                      "{node.prompt}"
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-8 pt-4 border-t border-[#efeded]/65 space-y-2">
                <button
                  onClick={() => onView3D(node)}
                  className="w-full h-11 border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Box size={15} />
                  <span>Open 3D View</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full h-11 bg-primary hover:bg-primary-container text-white text-xs font-bold rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Back to Tree Canvas</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
