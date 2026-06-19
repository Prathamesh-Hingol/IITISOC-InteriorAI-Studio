import { uploadsApi } from "../api/uploads";

export const UploadService = {
  async uploadImage(file: File, getToken: () => Promise<string | null>) {
    return uploadsApi.upload(file, getToken);
  },
};
