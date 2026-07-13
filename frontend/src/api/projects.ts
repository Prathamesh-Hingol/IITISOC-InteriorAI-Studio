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

  update: (projectId: string, name: string, description: string, getToken: () => Promise<string | null>) =>
    fetchWithAuth(`/projects/${projectId}`, getToken, {
      method: "PUT",
      body: { name, description },
    }),

  delete: (projectId: string, getToken: () => Promise<string | null>) =>
    fetchWithAuth(`/projects/${projectId}`, getToken, {
      method: "DELETE",
    }),

  generations: (projectId: string, getToken: () => Promise<string | null>) => {
    return fetchWithAuth(`/projects/${projectId}/generations`, getToken);
  },
};

