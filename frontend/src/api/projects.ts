import { fetchWithAuth } from "./client";

export const projectsApi = {
  list: (getToken: () => Promise<string | null>) =>
    fetchWithAuth("/projects", getToken),

  create: (name: string, description: string, getToken: () => Promise<string | null>) =>
    fetchWithAuth("/projects", getToken, {
      method: "POST",
      body: { name, description },
    }),

  detail: (projectId: string, getToken: () => Promise<string | null>) =>
    fetchWithAuth(`/projects/${projectId}`, getToken),

  generations: (projectId: string, getToken: () => Promise<string | null>) => {
    return fetchWithAuth(`/projects/${projectId}/generations`, getToken);
  },
};

