import { useState, useCallback } from "react";
import { EditorService } from "../services/editor.service";
import type { Point } from "../types/editor";

export function useSelection(
  versionId: string,
  getToken: () => Promise<string | null>,
) {
  const [candidateMasks, setCandidateMasks] = useState<string[]>([]);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);
  const [combinedMask, setCombinedMask] = useState<string | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);

  const clearCandidates = useCallback(() => {
    setCandidateMasks([]);
    setSelectedCandidateIndex(null);
  }, []);

  const handleSelectPoint = useCallback(
    async (point: Point) => {
      setIsSegmenting(true);
      clearCandidates(); // reset any previous candidates on a new click
      try {
        const res = await EditorService.segmentImage(
          {
            versionId,
            x: point.x,
            y: point.y,
          },
          getToken
        );
        setCandidateMasks(res.candidateMasks || []);
      } catch (err) {
        console.error("Failed to fetch segmentation candidates:", err);
      } finally {
        setIsSegmenting(false);
      }
    },
    [versionId, getToken, clearCandidates]
  );

  const handleAcceptCandidate = useCallback(
    async (maskIndex: number) => {
      setIsSegmenting(true);
      try {
        const res = await EditorService.acceptCandidate(
          {
            versionId,
            maskIndex,
          },
          getToken
        );
        setCombinedMask(res.combinedMaskUrl);
        setSelectionCount((prev) => prev + 1);
        clearCandidates();
      } catch (err) {
        console.error("Failed to accept candidate:", err);
      } finally {
        setIsSegmenting(false);
      }
    },
    [versionId, getToken, clearCandidates]
  );

  const handleUndoSelection = useCallback(async () => {
    setIsSegmenting(true);
    try {
      const res = await EditorService.undoSelection({ versionId }, getToken);
      setCombinedMask(res.combinedMaskUrl);
      setSelectionCount((prev) => Math.max(0, prev - 1));
      clearCandidates();
    } catch (err) {
      console.error("Failed to undo selection:", err);
    } finally {
      setIsSegmenting(false);
    }
  }, [versionId, getToken, clearCandidates]);

  const handleClearSelection = useCallback(async () => {
    setIsSegmenting(true);
    try {
      const res = await EditorService.clearSelection({ versionId }, getToken);
      setCombinedMask(res.combinedMaskUrl);
      setSelectionCount(0);
      clearCandidates();
    } catch (err) {
      console.error("Failed to clear selection:", err);
    } finally {
      setIsSegmenting(false);
    }
  }, [versionId, getToken, clearCandidates]);

  return {
    candidateMasks,
    selectedCandidateIndex,
    setSelectedCandidateIndex,
    combinedMask,
    isSegmenting,
    selectionCount,
    handleSelectPoint,
    handleAcceptCandidate,
    handleUndoSelection,
    handleClearSelection,
    clearCandidates,
  };
}
