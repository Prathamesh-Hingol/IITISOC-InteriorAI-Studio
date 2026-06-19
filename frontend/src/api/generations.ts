import { fetchWithAuth } from "./client";

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
};
