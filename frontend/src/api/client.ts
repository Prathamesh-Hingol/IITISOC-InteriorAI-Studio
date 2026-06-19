import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

/**
 * Shared Axios instance for API requests.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

/**
 * Authenticated API request client. Retrieves a JWT token from Clerk
 * and executes an Axios request to the backend API.
 * 
 * Supports options containing method, body (mapped to data), params, and custom headers.
 */
export async function fetchWithAuth<T = any>(
  endpoint: string,
  getToken: () => Promise<string | null>,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: string | any;
    headers?: Record<string, string>;
    params?: Record<string, any>;
  } = {}
): Promise<T> {
  const token = await getToken();

  const headers = { ...options.headers };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await apiClient.request<T>({
      url: endpoint,
      method: options.method || "GET",
      headers,
      data: options.body,
      params: options.params,
    });

    return response.data;
  } catch (error: any) {
    // Standardize error handling to throw friendly message
    if (error.response) {
      const errorData = error.response.data || {};
      const message = errorData.message || errorData.error || `HTTP Error ${error.response.status}`;
      throw new Error(message);
    }
    throw error;
  }
}

