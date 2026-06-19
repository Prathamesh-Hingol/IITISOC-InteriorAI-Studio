import { generationsApi} from "../api/generations";
import type{ CreateGenerationPayload } from "../api/generations";

export const GenerationService = {
  async createGeneration(payload: CreateGenerationPayload, getToken: () => Promise<string | null>) {
    return generationsApi.create(payload, getToken);
  },

  async getGenerationDetail(generationId: string, getToken: () => Promise<string | null>) {
    return generationsApi.detail(generationId, getToken);
  },

  async deleteGeneration(generationId: string, getToken: () => Promise<string | null>) {
    return generationsApi.delete(generationId, getToken);
  },
};
