import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { GenerationService } from "../services/generation.service";
import type{ CreateGenerationPayload } from "../api/generations";

export function useCreateGeneration(projectId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Omit<CreateGenerationPayload, "projectId">) =>
      GenerationService.createGeneration({ ...payload, projectId }, getToken),
    onSuccess: () => {
      // Invalidate tree and projects queries to refresh canvas & dashboard thumbnail
      queryClient.invalidateQueries({ queryKey: ["project-generations", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },

  });
}

export function useDeleteGeneration(projectId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (generationId: string) =>
      GenerationService.deleteGeneration(generationId, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-generations", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
