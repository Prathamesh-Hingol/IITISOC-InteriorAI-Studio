import { fetchWithAuth } from "./client";
import type { DepthAssets } from "../types";

export interface ViewResult {
  output_url: string;
}

export interface CreateGenerationPayload {
  projectId: string;
  parentId?: string | null;
  imageUrl?: string;
  prompt?: string;
  preset?: string;
  creativityStrength?: number;
  generationMode?: "restyle" | "furnish-empty";
}

export const generationsApi = {
  create: (payload: CreateGenerationPayload, getToken: () => Promise<string | null>) =>
    fetchWithAuth("/generations", getToken, {
      method: "POST",
      body: payload,
    }),

  detail: (generationId: string, getToken: () => Promise<string | null>) =>
    fetchWithAuth(`/generations/${generationId}`, getToken),

  delete: (generationId: string, getToken: () => Promise<string | null>) =>
    fetchWithAuth(`/generations/${generationId}`, getToken, {
      method: "DELETE",
    }),
  depth: (generationId: string, getToken: () => Promise<string | null>) =>
    fetchWithAuth<DepthAssets>(`/generations/${generationId}/depth`, getToken, {
      method: "POST",
    }),

  createView: (
    generationId: string,
    angle: string,
    getToken: () => Promise<string | null>,
  ) =>
    fetchWithAuth<ViewResult>(`/generations/${generationId}/views`, getToken, {
      method: "POST",
      body: { angle },
    }),
};
