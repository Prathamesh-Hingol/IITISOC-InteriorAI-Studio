import { useState, useCallback } from "react";
import { EditorService } from "../services/editor.service";
import type { Point, SegmentCandidate } from "../types/editor";

export function useSelection(
  versionId: string,
  getToken: () => Promise<string | null>,
) {
  const [candidateMasks, setCandidateMasks] = useState<SegmentCandidate[]>([]);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number | null>(null);
  const [combinedMask, setCombinedMask] = useState<string | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);

  // Labels for each accepted click, e.g. ["Click #0", "Click #1", ...]
  const [clickLabels, setClickLabels] = useState<string[]>([]);
  // Which click indices the user has toggled for removal
  const [selectedClickIndices, setSelectedClickIndices] = useState<number[]>([]);

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
        setClickLabels((labels) => [...labels, `Click #${labels.length}`]);
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

  /** Toggle a click index in/out of the removal selection. */
  const toggleClickIndex = useCallback((index: number) => {
    setSelectedClickIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  }, []);

  /** Send the selected click indices to the backend for removal. */
  const handleRemoveClicks = useCallback(async () => {
    if (selectedClickIndices.length === 0) return;
    setIsSegmenting(true);
    try {
      const res = await EditorService.removeClicks(
        { versionId, clickIndices: selectedClickIndices },
        getToken
      );
      setCombinedMask(res.combinedMaskUrl);

      // Filter labels by their embedded original index, not array position
      setClickLabels((prev) => {
        const toRemove = new Set(selectedClickIndices);
        return prev.filter((label) => {
          const originalIndex = parseInt(label.replace("Click #", ""), 10);
          return !toRemove.has(originalIndex);
        });
      });
      setSelectionCount((prev) => Math.max(0, prev - selectedClickIndices.length));
      setSelectedClickIndices([]);
      clearCandidates();
    } catch (err) {
      console.error("Failed to remove clicks:", err);
    } finally {
      setIsSegmenting(false);
    }
  }, [versionId, getToken, selectedClickIndices, clearCandidates]);

  const handleClearSelection = useCallback(async () => {
    setIsSegmenting(true);
    try {
      const res = await EditorService.clearSelection({ versionId }, getToken);
      setCombinedMask(res.combinedMaskUrl);
      setSelectionCount(0);
      setClickLabels([]);
      setSelectedClickIndices([]);
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
    clickLabels,
    selectedClickIndices,
    toggleClickIndex,
    handleSelectPoint,
    handleAcceptCandidate,
    handleRemoveClicks,
    handleClearSelection,
    clearCandidates,
  };
}
