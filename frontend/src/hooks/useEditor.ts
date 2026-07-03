import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { EditorService } from "../services/editor.service";
import { UploadService } from "../services/upload.service";
import type { EditorMode } from "../types/editor";

export function useEditor(
  versionId: string,
  projectId: string,
  mode: EditorMode,
  getToken: () => Promise<string | null>,
) {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [furnitureReference, setFurnitureReference] = useState<File | null>(null);
  const [furnitureReferenceUrl, setFurnitureReferenceUrl] = useState<string | null>(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleReferenceUpload = useCallback(
    async (file: File | null) => {
      setFurnitureReference(file);
      if (!file) {
        setFurnitureReferenceUrl(null);
        return;
      }

      setIsUploadingReference(true);
      try {
        const res = await UploadService.uploadImage(file, getToken);
        setFurnitureReferenceUrl(res.imageUrl);
      } catch (err) {
        console.error("Failed to upload furniture reference:", err);
      } finally {
        setIsUploadingReference(false);
      }
    },
    [getToken]
  );

  const handleGenerate = useCallback(
    async (combinedMask: string) => {
      if (!combinedMask || !prompt.trim() || isGenerating) return;

      setIsGenerating(true);
      try {
        const res = await EditorService.generateEditedImage(
          {
            versionId,
            prompt: prompt.trim(),
            combinedMask,
            furnitureReference: mode === "furniture-placement" ? furnitureReferenceUrl : null,
            mode,
          },
          getToken
        );

        // Navigate back to the project workspace and select the new node
        navigate(`/project/${projectId}`, {
          state: { selectNodeId: res.generation.id },
        });
      } catch (err) {
        console.error("Generation failed:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [versionId, projectId, prompt, furnitureReferenceUrl, mode, isGenerating, getToken, navigate]
  );

  return {
    prompt,
    setPrompt,
    furnitureReference,
    furnitureReferenceUrl,
    isUploadingReference,
    isGenerating,
    handleReferenceUpload,
    handleGenerate,
  };
}
