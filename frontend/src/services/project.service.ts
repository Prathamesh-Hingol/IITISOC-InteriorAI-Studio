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

  async updateProject(projectId: string, name: string, description: string, getToken: () => Promise<string | null>) {
    return projectsApi.update(projectId, name, description, getToken);
  },

  async deleteProject(projectId: string, getToken: () => Promise<string | null>) {
    return projectsApi.delete(projectId, getToken);
  },

  async getProjectGenerations(projectId: string, getToken: () => Promise<string | null>) {
    return projectsApi.generations(projectId, getToken);
  },
};
