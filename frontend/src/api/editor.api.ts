import { fetchWithAuth } from "./client";
import type {
  SegmentRequest,
  SegmentResponse,
  AcceptCandidateRequest,
  AcceptCandidateResponse,
  ActionRequest,
  ActionResponse,
  RemoveClicksRequest,
  GenerateRequest,
  GenerateResponse,
  SegmentExtractRequest,
  SegmentExtractResponse,
} from "../types/editor";

export const editorApi = {
  segment: (
    payload: SegmentRequest,
    getToken: () => Promise<string | null>,
  ): Promise<SegmentResponse> =>
    fetchWithAuth<SegmentResponse>("/editor/segment", getToken, {
      method: "POST",
      body: payload,
    }),

  acceptCandidate: (
    payload: AcceptCandidateRequest,
    getToken: () => Promise<string | null>,
  ): Promise<AcceptCandidateResponse> =>
    fetchWithAuth<AcceptCandidateResponse>("/editor/accept-candidate", getToken, {
      method: "POST",
      body: payload,
    }),

  removeClicks: (
    payload: RemoveClicksRequest,
    getToken: () => Promise<string | null>,
  ): Promise<ActionResponse> =>
    fetchWithAuth<ActionResponse>("/editor/remove-clicks", getToken, {
      method: "POST",
      body: payload,
    }),

  clearSelection: (
    payload: ActionRequest,
    getToken: () => Promise<string | null>,
  ): Promise<ActionResponse> =>
    fetchWithAuth<ActionResponse>("/editor/clear-selection", getToken, {
      method: "POST",
      body: payload,
    }),

  generate: (
    payload: GenerateRequest,
    getToken: () => Promise<string | null>,
  ): Promise<GenerateResponse> =>
    fetchWithAuth<GenerateResponse>("/editor/generate", getToken, {
      method: "POST",
      body: payload,
    }),

  segmentExtract: (
    payload: SegmentExtractRequest,
    getToken: () => Promise<string | null>,
  ): Promise<SegmentExtractResponse> =>
    fetchWithAuth<SegmentExtractResponse>("/editor/segment/extract", getToken, {
      method: "POST",
      body: payload,
    }),
};
