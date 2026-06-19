import { fetchWithAuth } from "./client";

export const uploadsApi = {
  upload: (file: File, getToken: () => Promise<string | null>) => {
    const formData = new FormData();
    formData.append("image", file);

    return fetchWithAuth("/uploads", getToken, {
      method: "POST",
      body: formData,
    });
  },
};
