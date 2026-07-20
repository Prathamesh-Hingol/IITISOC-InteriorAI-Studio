import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { z } from "zod";
import axios, { AxiosResponse } from "axios";

// ─── Allowed multi-view camera angles ────────────────────────────────────────
const ALLOWED_VIEW_ANGLES = [
	"the front, straight on",
	"a front-right diagonal angle",
	"the right side",
	"a back-right diagonal angle",
	"directly behind, looking back toward the entrance",
	"a back-left diagonal angle",
	"the left side",
	"a front-left diagonal angle",
] as const;

const createGenerationViewSchema = z.object({
	angle: z.enum([...ALLOWED_VIEW_ANGLES] as [string, ...string[]], {
		errorMap: () => ({ message: "Invalid camera angle" }),
	}),
});

interface ViewResponse {
	url: string;
}

/**
 * POST /api/generations/:generationId/views
 *
 * Pass-through proxy: validates ownership, forwards image_url + angle to
 * VIEW_ENDPOINT, and returns the generated output_url.
 * No DB record is created — this is a purely transient exploration feature.
 */
export async function createGenerationView(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const { generationId } = req.params;
		const userId = req.currentUser!.id;

		// 1. Ownership check
		const generation = await prisma.generation.findUnique({
			where: { id: generationId },
			include: { project: true },
		});

		if (!generation || generation.project.userId !== userId) {
			return res.status(404).json({ error: "Generation not found" });
		}

		// 2. Validate angle
		const parsed = createGenerationViewSchema.safeParse(req.body);
		if (!parsed.success) {
			return res.status(400).json({
				error: "Validation failed",
				details: parsed.error.errors,
			});
		}

		const { angle } = parsed.data;

		// 3. Proxy to VIEW_ENDPOINT
		const viewEndpoint = process.env.VIEW_ENDPOINT;
		if (!viewEndpoint) {
			return res
				.status(503)
				.json({ error: "Multi-view service is not configured" });
		}

		console.log(
			`[MultiView] Generating "${angle}" view for generation ${generationId}`,
		);

		const viewResponse: AxiosResponse<ViewResponse> =
			await axios.post<ViewResponse>(
				`${viewEndpoint}/generate`,
				{
					image_url: generation.imageUrl,
					angle,
				},
				{ headers: { "Content-Type": "application/json" } },
			);

		if (!viewResponse.data?.url) {
			return res
				.status(502)
				.json({ error: "View service returned an invalid response" });
		}

		return res.status(200).json({ output_url: viewResponse.data.url });
	} catch (error) {
		next(error);
	}
}
