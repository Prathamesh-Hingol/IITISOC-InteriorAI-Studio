import React, { useState, useEffect, useRef } from "react";
import { Upload, Crop, Sparkles, Check, Loader2, Image as ImageIcon, Paintbrush, Armchair } from "lucide-react";
import type { VersionNode } from "../../types";

interface InspectorPanelProps {
  activeNode: VersionNode | null;
  onGenerate: (
    prompt: string,
    preset: string,
    strength: number,
    mode: "restyle" | "furnish-empty"
  ) => void;
  onUploadImage?: (file: File) => void;
  onEditNode: (node: VersionNode, mode: "interior-modification" | "furniture-placement") => void;
  isUploading?: boolean;
  isGenerating?: boolean;
}

type StudioActionTab = "text-to-image" | "interior-modification" | "furniture-placement";

export function InspectorPanel({
  activeNode,
  onGenerate,
  onUploadImage,
  onEditNode,
  isUploading = false,
  isGenerating,
}: InspectorPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadImage) {
      onUploadImage(file);
    }
  };

  // State
  const [activeTab, setActiveTab] = useState<StudioActionTab>("text-to-image");
  const [prompt, setPrompt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("Scandinavian");
  const [strength, setStrength] = useState(65);
  const [localGenerating, setLocalGenerating] = useState(false);

  // Sync state with selected node
  useEffect(() => {
    if (activeNode) {
      setPrompt(activeNode.prompt || "");
      setSelectedPreset(activeNode.preset || "Scandinavian");
      setStrength(activeNode.creativityStrength !== undefined ? activeNode.creativityStrength : 65);
    }
  }, [activeNode]);

  const presets = ["Modern", "Minimalist", "Luxury", "Scandinavian", "Industrial"];
  const isGeneratingActive = isGenerating !== undefined ? isGenerating : localGenerating;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneratingActive || !activeNode) return;

    if (isGenerating === undefined) {
      setLocalGenerating(true);
      setTimeout(() => {
        onGenerate(prompt, selectedPreset, strength, "restyle");
        setLocalGenerating(false);
      }, 2000);
    } else {
      onGenerate(prompt, selectedPreset, strength, "restyle");
    }
  };

  return (
    <aside className="w-[320px] h-full flex flex-col border-l border-[#efeded] bg-white select-none">
      {/* Header */}
      <div className="h-14 px-5 border-b border-[#efeded] flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface">
          Studio Actions
        </h2>
        <span className="text-[10px] font-bold text-primary/70 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
          {activeNode?.title ? activeNode.title.split(":")[0] : "V1"}
        </span>
      </div>

      {/* Tab Selector */}
      <div className="p-3 border-b border-[#efeded] bg-[#faf8f7]/50">
        <div className="grid grid-cols-3 gap-1 bg-[#efeded]/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("text-to-image")}
            title="Text to Image"
            className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
              activeTab === "text-to-image"
                ? "bg-white text-primary shadow-[0_2px_8px_rgba(0,54,45,0.04)]"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <ImageIcon size={14} />
            <span>Generate</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("interior-modification")}
            title="Modify Objects"
            className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
              activeTab === "interior-modification"
                ? "bg-white text-primary shadow-[0_2px_8px_rgba(0,54,45,0.04)]"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Paintbrush size={14} />
            <span>Modify</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("furniture-placement")}
            title="Place Furniture"
            className={`flex flex-col items-center gap-1 py-2 text-[10px] font-bold rounded-lg transition-all ${
              activeTab === "furniture-placement"
                ? "bg-white text-primary shadow-[0_2px_8px_rgba(0,54,45,0.04)]"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Armchair size={14} />
            <span>Furniture</span>
          </button>
        </div>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        {/* Room Image Preview Card (Always visible) */}
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
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading || !activeNode}
              className="flex items-center justify-center gap-1.5 h-9 text-xs font-semibold text-on-surface bg-white hover:bg-[#f5f3f3] border border-[#c0c8c5] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              {isUploading ? (
                <Loader2 size={14} className="animate-spin text-on-surface-variant" />
              ) : (
                <Upload size={14} className="text-on-surface-variant" />
              )}
              <span>Upload</span>
            </button>
            <button
              type="button"
              disabled={!activeNode}
              className="flex items-center justify-center gap-1.5 h-9 text-xs font-semibold text-on-surface bg-white hover:bg-[#f5f3f3] border border-[#c0c8c5] rounded-lg transition-colors cursor-pointer disabled:opacity-60"
            >
              <Crop size={14} className="text-on-surface-variant" />
              <span>Crop</span>
            </button>
          </div>
        </div>

        <hr className="border-[#efeded]" />

        {/* Tab-specific Content */}
        {activeTab === "text-to-image" && (
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5">
            {/* Design Prompt */}
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider text-[#707976]">
                Design Prompt
              </h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your design vision... e.g. 'A minimalist Japandi style room with wooden accents and warm lighting'"
                disabled={!activeNode}
                className="w-full h-24 p-3 text-xs text-on-surface bg-[#faf8f7] border border-[#efeded] rounded-xl focus:outline-none focus:bg-white focus:border-primary/20 resize-none placeholder-outline"
              />
            </div>

            {/* Presets */}
            <div className="flex flex-col gap-2.5">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider text-[#707976]">
                Style Presets
              </h3>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => {
                  const isSelected = selectedPreset === preset;
                  return (
                    <button
                      type="button"
                      key={preset}
                      disabled={!activeNode}
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

            {/* AI Strength */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider text-[#707976]">
                  AI Creativity
                </h3>
                <span className="text-xs font-bold text-on-surface">{strength}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={strength}
                disabled={!activeNode}
                onChange={(e) => setStrength(Number(e.target.value))}
                className="w-full accent-primary h-1.5 bg-[#efeded] rounded-lg cursor-pointer"
              />
            </div>

            {/* Generate Button */}
            <div className="mt-auto pt-4 border-t border-[#efeded]">
              <button
                type="submit"
                disabled={isGeneratingActive || !activeNode || !prompt.trim()}
                className={`w-full flex items-center justify-center gap-2 h-11 text-xs font-bold text-white bg-[#00362d] hover:bg-[#1a4d43] active:scale-[0.99] rounded-xl shadow-md transition-all ${
                  isGeneratingActive || !activeNode || !prompt.trim()
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer"
                }`}
              >
                <Sparkles size={14} className={isGeneratingActive ? "animate-spin" : ""} />
                <span>{isGeneratingActive ? "Generating..." : "Generate Variation"}</span>
              </button>
              <div className="flex justify-between items-center text-[10px] text-outline mt-2 px-0.5">
                <span>Est. time: ~3s</span>
                <span>Uses FLUX Schnell</span>
              </div>
            </div>
          </form>
        )}

        {activeTab === "interior-modification" && (
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider text-[#707976]">
                Interior Modification
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Add, remove, or modify items within the scene by clicking directly on objects and describing changes.
              </p>
            </div>

            <div className="bg-[#faf8f7] border border-[#efeded] rounded-2xl p-4 flex flex-col gap-3">
              <div className="text-[11px] text-primary/80 font-bold flex items-center gap-1.5">
                <Paintbrush size={13} />
                <span>Workspace highlights</span>
              </div>
              <ul className="text-[11px] text-on-surface-variant space-y-1.5 list-disc pl-4">
                <li>Click objects to segment automatically</li>
                <li>Multiple masks compiled into single combined edit</li>
                <li>Replaces colors, textures, and structures</li>
              </ul>
            </div>

            <button
              type="button"
              disabled={!activeNode}
              onClick={() => activeNode && onEditNode(activeNode, "interior-modification")}
              className={`w-full flex items-center justify-center gap-2 h-11 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] ${
                !activeNode ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Paintbrush size={14} />
              <span>Open Object Editor</span>
            </button>
          </div>
        )}

        {activeTab === "furniture-placement" && (
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider text-[#707976]">
                Furniture Placement
              </h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Place new furniture pieces or replace existing elements inside a designated region. Allows uploading reference images of furniture.
              </p>
            </div>

            <div className="bg-[#faf8f7] border border-[#efeded] rounded-2xl p-4 flex flex-col gap-3">
              <div className="text-[11px] text-primary/80 font-bold flex items-center gap-1.5">
                <Armchair size={13} />
                <span>Workspace highlights</span>
              </div>
              <ul className="text-[11px] text-on-surface-variant space-y-1.5 list-disc pl-4">
                <li>Select region to place new item</li>
                <li>Upload reference image (optional)</li>
                <li>Describe prompt to align aesthetic</li>
              </ul>
            </div>

            <button
              type="button"
              disabled={!activeNode}
              onClick={() => activeNode && onEditNode(activeNode, "furniture-placement")}
              className={`w-full flex items-center justify-center gap-2 h-11 text-xs font-bold text-white bg-primary hover:bg-primary-container rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] ${
                !activeNode ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Armchair size={14} />
              <span>Open Furniture Workspace</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
