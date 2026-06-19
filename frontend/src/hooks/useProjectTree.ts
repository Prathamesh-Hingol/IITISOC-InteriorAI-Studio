import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { ProjectService } from "../services/project.service";

export function useGetProjectTree(projectId: string | undefined, selectedNodeId: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["project-tree", projectId, selectedNodeId],
    queryFn: () => ProjectService.getProjectTree(projectId!, selectedNodeId, getToken),
    enabled: isLoaded && isSignedIn && !!projectId,
    refetchOnWindowFocus: false, // Prevent unnecessary layouts during tab switches
  });
}
