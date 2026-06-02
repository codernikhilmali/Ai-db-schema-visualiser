import axios from 'axios';
import { authService } from './authService';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/projects`;

export interface ProjectDTO {
  projectKey: string;
  name: string;
  description: string;
  jsonSchema: string;
  sqlSchema: string;
}

export const projectService = {
  async fetchProjects(): Promise<ProjectDTO[]> {
    if (!authService.isAuthenticated()) return [];

    try {
      const response = await axios.get(API_URL, {
        headers: authService.getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      return [];
    }
  },

  async saveProject(project: ProjectDTO): Promise<ProjectDTO | null> {
    if (!authService.isAuthenticated()) return null;

    try {
      const response = await axios.put(API_URL, project, {
        headers: authService.getAuthHeaders(),
      });
      return response.data;
    } catch (err) {
      console.error('Failed to save project:', err);
      return null;
    }
  },

  async deleteProject(projectKey: string): Promise<void> {
    if (!authService.isAuthenticated()) return;

    try {
      await axios.delete(`${API_URL}/${projectKey}`, {
        headers: authService.getAuthHeaders(),
      });
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  },
};
