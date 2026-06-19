import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { UploadService } from "../services/upload.service";

export function useUploadImage() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: (file: File) => UploadService.uploadImage(file, getToken),
  });
}
