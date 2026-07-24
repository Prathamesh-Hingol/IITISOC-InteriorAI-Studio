import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { EditorService } from "../services/editor.service";
import { UploadService } from "../services/upload.service";
import { generationsApi } from "../api/generations";
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

  /** Used by furniture-placement mode (requires a SAM mask). */
  const handleGenerate = useCallback(
    async (combinedMask: string, referenceMask?: string | null) => {
      if (!combinedMask || !prompt.trim() || isGenerating) return;

      setIsGenerating(true);
      try {
        const res = await EditorService.generateEditedImage(
          {
            versionId,
            prompt: prompt.trim(),
            combinedMask,
            furnitureReference: mode === "furniture-placement" ? furnitureReferenceUrl : null,
            referenceMask: mode === "furniture-placement" ? (referenceMask || null) : null,
            mode,
          },
          getToken
        );

        // Immediately navigate back to Studio page where the queued node will display as a skeleton card
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

  /**
   * Used by interior-modification mode (prompt-only, no mask).
   * Routes through createGeneration — child node path uses the context pipeline.
   */
  const handleModify = useCallback(
    async () => {
      if (!prompt.trim() || isGenerating || !projectId) return;

      setIsGenerating(true);
      try {
        const res: any = await generationsApi.create(
          {
            projectId,
            parentId: versionId,
            prompt: prompt.trim(),
            generationMode: "restyle",
          },
          getToken
        );

        navigate(`/project/${projectId}`, {
          state: { selectNodeId: res.id },
        });
      } catch (err) {
        console.error("Modify generation failed:", err);
      } finally {
        setIsGenerating(false);
      }
    },
    [projectId, versionId, prompt, isGenerating, getToken, navigate]
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
    handleModify,
  };
}
