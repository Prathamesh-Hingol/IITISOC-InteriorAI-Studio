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
    // Keep queued cards fresh without polling once all work is complete.
    refetchInterval: (query) => {
      const generations = query.state.data as Array<{ status: string }> | undefined;
      return generations?.some((generation) =>
        generation.status === "queued" || generation.status === "processing",
      ) ? 3000 : false;
    },
  });
}
