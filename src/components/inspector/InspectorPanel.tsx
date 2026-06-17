import React, { useState, useEffect } from "react";
import { Upload, Crop, Sparkles, Check, X } from "lucide-react";
import type { VersionNode } from "../../types";

interface InspectorPanelProps {
  activeNode: VersionNode | null;
  onGenerate: (
    prompt: string,
    preset: string,
    strength: number,
    mode: "restyle" | "furnish-empty"
  ) => void;
}

export function InspectorPanel({ activeNode, onGenerate }: InspectorPanelProps) {
  const [mode, setMode] = useState<"restyle" | "furnish-empty">("restyle");
  const [prompt, setPrompt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("Scandinavian");
  const [strength, setStrength] = useState(65);
  const [isGenerating, setIsGenerating] = useState(false);

  // Sync state with selected node
  useEffect(() => {
    if (activeNode) {
      setPrompt(activeNode.prompt || "");
      setSelectedPreset(activeNode.preset || "Scandinavian");
      setStrength(activeNode.creativityStrength !== undefined ? activeNode.creativityStrength : 65);
      setMode(activeNode.generationMode || "restyle");
    }
  }, [activeNode]);

  const presets = ["Modern", "Minimalist", "Luxury", "Scandinavian", "Industrial"];

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (isGenerating) return;

    setIsGenerating(true);
    // Mimic API delay
    setTimeout(() => {
      onGenerate(prompt, selectedPreset, strength, mode);
      setIsGenerating(false);
    }, 2500);
  };

  return (
    <aside className="w-[320px] h-full flex flex-col border-l border-[#efeded] bg-white select-none">
      {/* Header */}
      <div className="h-14 px-6 border-b border-[#efeded] flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface">
          AI Generation
        </h2>
        <button className="p-1 text-on-surface-variant hover:text-on-surface transition-colors">
          <X size={16} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* Image Preview Card */}
        <div className="relative group">
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-[#efeded] border border-[#efeded] relative">
            {activeNode?.image ? (
              <img
                src={activeNode.image}
                alt={activeNode.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-outline">
                No image preview
              </div>
            )}
            
            {/* Active source label */}
            {activeNode && (
              <span className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded">
                {activeNode.status || "Source: V1"}
              </span>
            )}
          </div>

          {/* Action buttons (Upload & Crop) */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 h-9 text-xs font-semibold text-on-surface bg-white hover:bg-[#f5f3f3] border border-[#c0c8c5] rounded-lg transition-colors"
            >
              <Upload size={14} className="text-on-surface-variant" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-1.5 h-9 text-xs font-semibold text-on-surface bg-white hover:bg-[#f5f3f3] border border-[#c0c8c5] rounded-lg transition-colors"
            >
              <Crop size={14} className="text-on-surface-variant" />
              <span>Crop</span>
            </button>
          </div>
        </div>

        {/* Mode Selector */}
        <div>
          <h3 className="text-xs font-semibold text-on-surface mb-2">Mode</h3>
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#efeded]/80 rounded-lg">
            <button
              type="button"
              onClick={() => setMode("restyle")}
              className={`py-1.5 text-xs font-semibold rounded transition-all ${
                mode === "restyle"
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Restyle
            </button>
            <button
              type="button"
              onClick={() => setMode("furnish-empty")}
              className={`py-1.5 text-xs font-semibold rounded transition-all ${
                mode === "furnish-empty"
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Furnish Empty
            </button>
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-on-surface">Design Prompt</h3>
            <button
              type="button"
              className="text-[10px] font-medium text-[#1c4f45] hover:underline"
            >
              Auto-enhance
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your vision... e.g., 'Make walls beige and replace sofa with a modern curved bouclé piece.'"
            className="w-full h-24 p-3 text-xs text-on-surface bg-surface-container-low border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-outline resize-none placeholder-outline"
          />
        </div>

        {/* Style Presets */}
        <div>
          <h3 className="text-xs font-semibold text-on-surface mb-3">Style Presets</h3>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => {
              const isSelected = selectedPreset === preset;
              return (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setSelectedPreset(preset)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${
                    isSelected
                      ? "border-primary text-primary bg-[#cbf4ec]/20"
                      : "border-[#c0c8c5] text-on-surface-variant hover:text-on-surface hover:border-[#707976]"
                  }`}
                >
                  {isSelected && <Check size={12} className="text-primary" />}
                  <span>{preset}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Creativity Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-semibold text-on-surface">Creativity Strength</h3>
            <span className="text-xs font-bold text-on-surface">{strength}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={strength}
            onChange={(e) => setStrength(Number(e.target.value))}
            className="w-full accent-primary h-1 bg-surface-container-high rounded-lg cursor-pointer"
          />
        </div>

        {/* Generate Button Wrapper */}
        <div className="mt-auto pt-4 border-t border-[#efeded]">
          <button
            type="submit"
            disabled={isGenerating}
            className={`w-full flex items-center justify-center gap-2 h-11 text-sm font-semibold text-white bg-[#00362d] hover:bg-[#1a4d43] active:scale-[0.99] rounded-lg shadow-sm transition-all ${
              isGenerating ? "opacity-75 cursor-not-allowed" : ""
            }`}
          >
            <Sparkles size={16} className={isGenerating ? "animate-spin" : ""} />
            <span>{isGenerating ? "Generating..." : "Generate Design"}</span>
          </button>

          {/* Estimates */}
          <div className="flex justify-between items-center text-[10px] text-outline mt-2.5 px-0.5">
            <span>Est. time: ~3s</span>
            <span>12 Credits</span>
          </div>
        </div>
      </form>
    </aside>
  );
}
