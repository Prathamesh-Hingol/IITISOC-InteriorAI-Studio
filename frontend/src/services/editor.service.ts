import { editorApi } from "../api/editor.api";
import { generationsApi } from "../api/generations";
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
} from "../types/editor";

export const EditorService = {
  async segmentImage(
    payload: SegmentRequest,
    getToken: () => Promise<string | null>,
  ): Promise<SegmentResponse> {
    return editorApi.segment(payload, getToken);
  },

  async acceptCandidate(
    payload: AcceptCandidateRequest,
    getToken: () => Promise<string | null>,
  ): Promise<AcceptCandidateResponse> {
    return editorApi.acceptCandidate(payload, getToken);
  },

  async removeClicks(
    payload: RemoveClicksRequest,
    getToken: () => Promise<string | null>,
  ): Promise<ActionResponse> {
    return editorApi.removeClicks(payload, getToken);
  },

  async clearSelection(
    payload: ActionRequest,
    getToken: () => Promise<string | null>,
  ): Promise<ActionResponse> {
    return editorApi.clearSelection(payload, getToken);
  },

  async generateEditedImage(
    payload: GenerateRequest,
    getToken: () => Promise<string | null>,
  ): Promise<GenerateResponse> {
    return editorApi.generate(payload, getToken);
  },

  async getVersion(
    versionId: string,
    getToken: () => Promise<string | null>,
  ) {
    return generationsApi.detail(versionId, getToken);
  },
};
