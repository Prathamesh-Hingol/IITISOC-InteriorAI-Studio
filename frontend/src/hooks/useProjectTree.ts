import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { ProjectService } from "../services/project.service";

export function useGetProjectGenerations(projectId: string | undefined) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["project-generations", projectId],
    queryFn: () => ProjectService.getProjectGenerations(projectId!, getToken),
    enabled: isLoaded && isSignedIn && !!projectId,
    refetchOnWindowFocus: false, // Prevent unnecessary layouts during tab switches
  });
}
