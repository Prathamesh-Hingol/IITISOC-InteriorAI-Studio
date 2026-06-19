import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { ProjectService } from "../services/project.service";

export function useGetProjects() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["projects"],
    queryFn: () => ProjectService.getProjects(getToken),
    enabled: isLoaded && isSignedIn,
  });
}

export function useGetProjectDetail(projectId: string | undefined) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => ProjectService.getProjectDetail(projectId!, getToken),
    enabled: isLoaded && isSignedIn && !!projectId,
  });
}

export function useCreateProject() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, description }: { name: string; description: string }) =>
      ProjectService.createProject(name, description, getToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
