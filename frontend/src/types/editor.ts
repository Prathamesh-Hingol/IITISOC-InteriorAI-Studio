/**
 * Editor-specific type definitions for interactive selection.
 */

export interface Point {
  x: number;
  y: number;
}

export type EditorMode = "interior-modification" | "furniture-placement";

export interface SegmentRequest {
  versionId: string;
  x: number;
  y: number;
}

export interface SegmentResponse {
  candidateMasks: string[]; // List of base64 PNG data URLs or image URLs
}

export interface AcceptCandidateRequest {
  versionId: string;
  maskIndex: number;
}

export interface AcceptCandidateResponse {
  combinedMaskUrl: string; // The URL to the latest combined mask
}

export interface ActionRequest {
  versionId: string;
}

export interface ActionResponse {
  combinedMaskUrl: string | null;
}

export interface GenerateRequest {
  versionId: string;
  prompt: string;
  combinedMask: string;
  furnitureReference?: string | null;
  mode: EditorMode;
}

export interface GenerateResponse {
  generation: {
    id: string;
    title: string;
    projectId: string;
    parentId: string;
    imageUrl: string;
    status: string;
  };
}

export interface EditorState {
  originalImage: string;
  currentMode: EditorMode;
  candidateMasks: string[];
  selectedCandidateIndex: number | null;
  combinedMask: string | null;
  prompt: string;
  selectionCount: number;
  furnitureReference: File | null;
  furnitureReferenceUrl: string | null;
  isSegmenting: boolean;
  isGenerating: boolean;
}
