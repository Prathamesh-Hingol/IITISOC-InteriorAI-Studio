import axios from "axios";
import { z } from "zod";

/**
 * Zod schema for the external prompt enhancer API response.
 * Validates the shape and types at runtime so TypeScript inferences
 * are guaranteed to match the actual data.
 */
const EnhancerResponseSchema = z.object({
  enhanced: z.string().nullable(),
});

type EnhancerResponse = z.infer<typeof EnhancerResponseSchema>;

/**
 * Calls the external prompt enhancer service to improve the given prompt
 * before it is sent to the AI generation pipeline.
 *
 * Return values:
 *   - enhanced string  → use it for generation
 *   - null             → prompt was rejected (caller must return 400 "Invalid prompt")
 *   - original string  → service unavailable / not configured (graceful fallback)
 */
export async function enhancePrompt(
  prompt: string,
  mode: string
): Promise<string | null> {
  const endpoint = process.env.PROMPT_ENHANCER_ENDPOINT;

  if (!endpoint) {
    console.warn("[EnhancePrompt] PROMPT_ENHANCER_ENDPOINT is not set. Using original prompt.");
    return prompt;
  }

  try {
    console.log(`[EnhancePrompt] Enhancing prompt for mode "${mode}": "${prompt}"`);

    const rawResponse = await axios.post(
      `${endpoint}/enhance`,
      { prompt, mode },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    const parsed = EnhancerResponseSchema.safeParse(rawResponse.data);

    if (!parsed.success) {
      console.warn(
        `[EnhancePrompt] Unexpected response shape from enhancer:`,
        parsed.error.flatten()
      );
      return prompt; // Graceful fallback — unexpected schema, not prompt issue
    }

    const enhanced: EnhancerResponse["enhanced"] = parsed.data.enhanced;

    if (!enhanced || enhanced.trim() === "") {
      console.warn(`[EnhancePrompt] Enhancer returned null/empty for prompt: "${prompt}". Prompt is invalid.`);
      return null; // Signal to caller: prompt is invalid → 400
    }

    console.log(`[EnhancePrompt] Enhanced: "${enhanced}"`);
    return enhanced;
  } catch (err: any) {
    console.warn(
      `[EnhancePrompt] Service call failed (${err.message}). Falling back to original prompt.`
    );
    return prompt; // Graceful fallback — infrastructure issue, not prompt issue
  }
}
