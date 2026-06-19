import { projectsApi } from "../api/projects";

export const ProjectService = {
  async getProjects(getToken: () => Promise<string | null>) {
    return projectsApi.list(getToken);
  },

  async createProject(name: string, description: string, getToken: () => Promise<string | null>) {
    return projectsApi.create(name, description, getToken);
  },

  async getProjectDetail(projectId: string, getToken: () => Promise<string | null>) {
    return projectsApi.detail(projectId, getToken);
  },

  async getProjectTree(projectId: string, selectedNodeId: string | null, getToken: () => Promise<string | null>) {
    return projectsApi.tree(projectId, selectedNodeId, getToken);
  },
};
