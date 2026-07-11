import { Request, Response, NextFunction } from "express";
import axios, { AxiosResponse } from "axios";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// ─── Validation Schema ────────────────────────────────────────

const extractDragSchema = z.object({
	imageUrl: z.string().url("Invalid image URL"),
	x: z.number().int().nonnegative("x must be a non-negative integer"),
	y: z.number().int().nonnegative("y must be a non-negative integer"),
});

// ─── Python Microservice Response Shape ──────────────────────

interface DragEndpointResponse {
	background_url: string;
	cutout_url: string;
	depth_url: string;
	meta: {
		bbox: { x0: number; y0: number; x1: number; y1: number };
		centroid: { x: number; y: number };
		cutout_size: { width: number; height: number };
		background_size: { width: number; height: number };
	};
}

// ─── Mock Fallback Helper ─────────────────────────────────────

/**
 * Returns a mock response when DRAG_ENDPOINT is not configured.
 * Uses the original image as a stand-in for all visual assets, with
 * a synthetic meta object centred on the clicked point.
 */
function buildMockResponse(imageUrl: string, x: number, y: number): DragEndpointResponse {
	return {
		background_url: imageUrl,
		cutout_url: imageUrl,
		depth_url: imageUrl,
		meta: {
			bbox: { x0: Math.max(0, x - 64), y0: Math.max(0, y - 64), x1: x + 64, y1: y + 64 },
			centroid: { x, y },
			cutout_size: { width: 128, height: 128 },
			background_size: { width: 1024, height: 1024 },
		},
	};
}

// ─── Controller ───────────────────────────────────────────────

/**
 * POST /api/drag/extract
 *
 * Accepts { imageUrl, x, y } — the room image URL and the user's
 * click coordinates in natural image pixels.
 *
 * Forwards the request to the Python DRAG_ENDPOINT which runs:
 *   SAM2 (segmentation) → LaMa (background fill) → Depth-Anything (depth map)
 *
 * The Python service uploads all assets to Cloudinary and returns URLs.
 * This controller is a pure authenticated passthrough — no Cloudinary work here.
 *
 * Response:
 *   { backgroundUrl, cutoutUrl, depthUrl, meta }
 */
export async function extractDrag(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		// 1. Validate input
		const validated = extractDragSchema.parse(req.body);
		const userId = req.currentUser?.id;

		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const dragEndpoint = process.env.DRAG_ENDPOINT;

		// 2. Call Python microservice if configured
		if (dragEndpoint) {
			try {
				console.log(
					`[Drag-Extract] Forwarding click (${validated.x}, ${validated.y}) to DRAG_ENDPOINT`,
				);

				const pythonResponse: AxiosResponse<DragEndpointResponse> =
					await axios.post<DragEndpointResponse>(
						`${dragEndpoint}/drag`,
						{
							image_url: validated.imageUrl,
							x: validated.x,
							y: validated.y,
						},
						{
							headers: { "Content-Type": "application/json" },
							timeout: 120000, // 2 min — SAM2 + LaMa + depth can be slow
						},
					);

				const { background_url, cutout_url, depth_url, meta } =
					pythonResponse.data;

				return res.json({
					backgroundUrl: background_url,
					cutoutUrl: cutout_url,
					depthUrl: depth_url,
					meta,
				});
			} catch (dragError: any) {
				console.error(
					"[Drag-Extract] DRAG_ENDPOINT failed, falling back to mock:",
					dragError.message,
				);
				// Fall through to mock below
			}
		}

		// 3. Mock fallback (DRAG_ENDPOINT not set or call failed)
		console.warn("[Drag-Extract] Using mock fallback — set DRAG_ENDPOINT in .env for real extraction.");
		const mock = buildMockResponse(validated.imageUrl, validated.x, validated.y);

		return res.json({
			backgroundUrl: mock.background_url,
			cutoutUrl: mock.cutout_url,
			depthUrl: mock.depth_url,
			meta: mock.meta,
		});
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res
				.status(400)
				.json({ error: "Validation failed", details: error.errors });
		}
		next(error);
	}
}
