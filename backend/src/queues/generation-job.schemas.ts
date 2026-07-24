import { z } from "zod";

export const branchJobPayloadSchema = z.object({
  prompt: z.string().min(1),
  image_url: z.string().url(),
});

export const editorJobPayloadSchema = z.object({
  prompt: z.string().min(1),
  session_id: z.string(),
  image_url: z.string(),
  mask_url: z.string(),
  reference_image_url: z.string().nullable().optional(),
  reference_mask_url: z.string().nullable().optional(),
  edit_mode: z.enum(["interior-modification", "furniture-placement"]),
  guidance: z.number().optional().default(8),
});

export type BranchJobPayload = z.infer<typeof branchJobPayloadSchema>;
export type EditorJobPayload = z.infer<typeof editorJobPayloadSchema>;
