import { z } from "zod";

export const rootJobPayloadSchema = z.object({
  prompt: z.string().min(1),
});

export const branchJobPayloadSchema = z.object({
  prompt: z.string().min(1),
  image_url: z.string().url(),
});

export const editorJobPayloadSchema = z.object({
  prompt: z.string().min(1),
  session_id: z.string().uuid(),
  image_url: z.string().url(),
  mask_url: z.string().url(),
  reference_image_url: z.string().url().nullable(),
  edit_mode: z.enum(["interior-modification", "furniture-placement"]),
  guidance: z.number(),
});

export type RootJobPayload = z.infer<typeof rootJobPayloadSchema>;
export type BranchJobPayload = z.infer<typeof branchJobPayloadSchema>;
export type EditorJobPayload = z.infer<typeof editorJobPayloadSchema>;
