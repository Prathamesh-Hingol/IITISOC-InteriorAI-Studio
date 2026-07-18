import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { uploadToCloudinary } from "../config/cloudinary";
import { z } from "zod";
import axios from "axios";
import type { AxiosResponse } from "axios";
import dotenv from "dotenv";
import { enqueueGeneration } from "../queues/ai-generation.queue";

dotenv.config();

// ─── Validation Schemas ──────────────────────────────────────

const segmentRequestSchema = z.object({
	versionId: z.string().uuid("Invalid version ID"),
	x: z.number(),
	y: z.number(),
});

const acceptCandidateRequestSchema = z.object({
	versionId: z.string().uuid("Invalid version ID"),
	maskIndex: z.number().int().nonnegative(),
});

const actionRequestSchema = z.object({
	versionId: z.string().uuid("Invalid version ID"),
});

const removeClicksRequestSchema = z.object({
	versionId: z.string().uuid("Invalid version ID"),
	clickIndices: z
		.array(z.number().int().nonnegative())
		.min(1, "At least one click index is required"),
});

const generateRequestSchema = z.object({
	versionId: z.string().uuid("Invalid version ID"),
	prompt: z.string().min(1, "Prompt is required"),
	combinedMask: z.string().url("Invalid mask URL"),
	furnitureReference: z
		.string()
		.url("Invalid furniture reference URL")
		.optional()
		.nullable(),
	mode: z.enum(["interior-modification", "furniture-placement"]),
});

const segmentExtractRequestSchema = z.object({
	versionId: z.string().uuid("Invalid version ID"),
});

// ─── Types ───────────────────────────────────────────────────
interface candidateRes {
	candidate_index:number,
	score:number,
	overlay_url:string,
}
interface SAMSegmentResponse {
	session_id:string,
	candidates:candidateRes[]
}

interface SAMAcceptResponse {
	status:string,
    running_overlay_url:string,// Base64 PNG mask data URL or image URL
}

interface SAMActionResponse {
	combinedMask: string | null;
}

interface SAMRemoveClicksResponse {
	status:string,
    running_overlay_url: string,
	active_indices:number[],
}

interface GenerationResponse {
	output_url:string
}

// Response returned by the SAM microservice /segment/extract route.
// Mirrors the same shape as the DRAG_ENDPOINT /extract response so the
// DraggableObjectCanvas can consume both interchangeably.
interface SAMExtractResponse {
	clean_bg_url: string;
	cutout_url: string;
	depth_preview_url: string;
	placement_meta: {
		bbox: { x0: number; y0: number; x1: number; y1: number };
		centroid: { x: number; y: number };
		cutout_size: { width: number; height: number };
		background_size: { width: number; height: number };
	};
}

// ─── In-Memory Mock Session Store ────────────────────────────
// In a real production setup, the SAM microservice maintains the sessions.
// For development or when SAM_ENDPOINT is not active, this backend gateway
// manages the selection session state to provide a working mock experience.
type HistoryEntry = { x: number; y: number; r: number };

interface MockSession {
	// Sparse array — removed slots are set to null so original indices are preserved.
	history: Array<HistoryEntry | null>;
	lastCandidates: HistoryEntry[];
	combinedMaskUrl: string | null;
}

const mockSessions: Record<string, MockSession> = {};

function getOrCreateMockSession(versionId: string): MockSession {
	if (!mockSessions[versionId]) {
		mockSessions[versionId] = {
			history: [],
			lastCandidates: [],
			combinedMaskUrl: null,
		};
	}
	return mockSessions[versionId];
}

// Helper to generate SVG binary mask
function generateSvgMask(
	circles: Array<{ x: number; y: number; r: number }>,
): string {
	const circlesMarkup = circles
		.map((c) => `<circle cx="${c.x}" cy="${c.y}" r="${c.r}" fill="white" />`)
		.join("\n");

	return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
    <rect width="100%" height="100%" fill="black"/>
    ${circlesMarkup}
  </svg>`;
}

// ─── Controller Endpoints ────────────────────────────────────

/**
 * POST /api/editor/segment
 * Receives click coordinates (x, y), forwards to SAM microservice,
 * and returns dynamic candidate masks.
 */
export async function segment(req: Request, res: Response, next: NextFunction) {
	try {
		const validated = segmentRequestSchema.parse(req.body);
		const userId = req.currentUser?.id;

		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		// Verify version and project ownership
		const generation = await prisma.generation.findUnique({
			where: { id: validated.versionId },
			include: { project: true },
		});

		if (!generation || generation.project.userId !== userId) {
			return res
				.status(404)
				.json({ error: "Version not found or unauthorized" });
		}
		console.log(generation.imageUrl);
		console.log(`x:${validated.x},y:${validated.y}`);
		const samEndpoint = process.env.SAM_ENDPOINT;

		if (samEndpoint) {
			try {
				console.log(
					`[SAM-Segment] Forwarding click (${validated.x}, ${validated.y}) to SAM microservice`,
				);
				const samResponse: AxiosResponse<SAMSegmentResponse> =
					await axios.post<SAMSegmentResponse>(
						`${samEndpoint}/segment/click`,
						{
							image_url: generation.imageUrl,
							session_id: validated.versionId,
							cx: validated.x,
							cy: validated.y,
							max_dem:1024,
						},
						{
							headers: { "Content-Type": "application/json" },
						},
					);

				return res.json({
					candidateMasks: samResponse.data.candidates,
				});
			} catch (samError: any) {
				console.error(
					"SAM service failed, falling back to mock logic:",
					samError.message,
				);
			}
		}

		// ── Mock Fallback ──
		// Generate 3 candidate circles of different sizes around the click point
		const { x, y } = validated;
		const session = getOrCreateMockSession(validated.versionId);

		// Store 3 candidate sizes: small (35px), medium (75px), large (130px)
		session.lastCandidates = [
			{ x, y, r: 35 },
			{ x, y, r: 75 },
			{ x, y, r: 130 },
		];

		const candidateMasks = session.lastCandidates.map((c) => {
			const svg = generateSvgMask([c]);
			const base64 = Buffer.from(svg).toString("base64");
			return `data:image/svg+xml;base64,${base64}`;
		});

		return res.json({ candidateMasks });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res
				.status(400)
				.json({ error: "Validation failed", details: error.errors });
		}
		next(error);
	}
}

/**
 * POST /api/editor/accept-candidate
 * Accepts a candidate mask index, updates the combined session mask,
 * and returns the latest combined mask URL.
 */
export async function acceptCandidate(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const validated = acceptCandidateRequestSchema.parse(req.body);
		const userId = req.currentUser?.id;

		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const samEndpoint = process.env.SAM_ENDPOINT;

		if (samEndpoint) {
			try {
				console.log(
					`[SAM-Accept] Accepting candidate ${validated.maskIndex} in SAM`,
				);
				const samResponse: AxiosResponse<SAMAcceptResponse> =
					await axios.post<SAMAcceptResponse>(
						`${samEndpoint}/segment/choose`,
						{
							session_id: validated.versionId,
							candidate_index: validated.maskIndex,
						},
						{
							headers: { "Content-Type": "application/json" },
						},
					);


				return res.json({
					combinedMaskUrl: samResponse.data.running_overlay_url,
				});
			} catch (samError: any) {
				console.error(
					"SAM accept candidate failed, falling back to mock logic:",
					samError.message,
				);
			}
		}

		// ── Mock Fallback ──
		const session = getOrCreateMockSession(validated.versionId);
		const selected = session.lastCandidates[validated.maskIndex];

		if (selected) {
			session.history.push(selected);
		}

		// Render combined history (filter out any nullified slots)
		const activeEntries = session.history.filter(
			(e): e is HistoryEntry => e !== null,
		);
		const combinedSvg = generateSvgMask(activeEntries);
		const svgBuffer = Buffer.from(combinedSvg, "utf-8");
		const cloudResult = await uploadToCloudinary(svgBuffer);

		session.combinedMaskUrl = cloudResult.imageUrl;

		return res.json({
			combinedMaskUrl: session.combinedMaskUrl,
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

/**
 * POST /api/editor/remove-clicks
 * Removes one or more accepted clicks (by 0-indexed position) from the session
 * history and returns the rebuilt combined mask.
 */
export async function removeClicks(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const validated = removeClicksRequestSchema.parse(req.body);
		const userId = req.currentUser?.id;

		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const samEndpoint = process.env.SAM_ENDPOINT;

		if (samEndpoint) {
			try {
				console.log(
					`[SAM-RemoveClicks] Forwarding click_indices [${validated.clickIndices.join(", ")}] to SAM`,
				);
				const samResponse: AxiosResponse<SAMRemoveClicksResponse> =
					await axios.post<SAMRemoveClicksResponse>(
						`${samEndpoint}/segment/remove`,
						{
							session_id: validated.versionId,
							click_indices: validated.clickIndices,
						},
						{ headers: { "Content-Type": "application/json" } },
					);

				if (!samResponse.data.running_overlay_url) {
					return res.json({ combinedMaskUrl: null });
				}

				return res.json({
					combinedMaskUrl: samResponse.data.running_overlay_url,
				});
			} catch (samError: any) {
				console.error(
					"SAM remove-clicks failed, falling back to mock logic:",
					samError.message,
				);
			}
		}

		// ── Mock Fallback ──
		// Nullify the specified slots so original indices are preserved.
		const session = getOrCreateMockSession(validated.versionId);
		for (const idx of validated.clickIndices) {
			if (idx < session.history.length) {
				session.history[idx] = null;
			}
		}

		const activeEntries = session.history.filter(
			(e): e is HistoryEntry => e !== null,
		);

		if (activeEntries.length === 0) {
			session.combinedMaskUrl = null;
			return res.json({ combinedMaskUrl: null });
		}

		const combinedSvg = generateSvgMask(activeEntries);
		const svgBuffer = Buffer.from(combinedSvg, "utf-8");
		const cloudResult = await uploadToCloudinary(svgBuffer);

		session.combinedMaskUrl = cloudResult.imageUrl;

		return res.json({
			combinedMaskUrl: session.combinedMaskUrl,
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

/**
 * POST /api/editor/clear-selection
 * Resets the selection session.
 */
export async function clearSelection(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const validated = actionRequestSchema.parse(req.body);
		const userId = req.currentUser?.id;

		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const samEndpoint = process.env.SAM_ENDPOINT;

		if (samEndpoint) {
			try {
				console.log(`[SAM-Clear] Requesting session clear from SAM`);
				await axios.post(
					`${samEndpoint}/segment/clear`,
					{ session_id: validated.versionId },
					{ headers: { "Content-Type": "application/json" }},
				);
			} catch (samError: any) {
				console.error("SAM clear failed:", samError.message);
			}
		}

		// ── Mock Fallback ──
		const session = getOrCreateMockSession(validated.versionId);
		session.history = [];
		session.lastCandidates = [];
		session.combinedMaskUrl = null;

		return res.json({ combinedMaskUrl: null });
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res
				.status(400)
				.json({ error: "Validation failed", details: error.errors });
		}
		next(error);
	}
}

/**
 * POST /api/editor/generate
 * Executes final model generation (Interior Modification vs Furniture Placement)
 * and outputs a child node under the Version Tree.
 */
export async function generate(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const validated = generateRequestSchema.parse(req.body);
		const userId = req.currentUser?.id;

		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		// Fetch parent version & verify ownership
		const parentNode = await prisma.generation.findUnique({
			where: { id: validated.versionId },
			include: { project: true },
		});

		if (!parentNode || parentNode.project.userId !== userId) {
			return res.status(404).json({ error: "Parent version not found" });
		}

		// Compute title numbering
		const totalGens = await prisma.generation.count({
			where: { projectId: parentNode.projectId },
		});
		const nextIndex = totalGens + 1;
		const title = `V${nextIndex}: ${validated.mode === "furniture-placement" ? "Furniture" : "Interior"} Edit`;

		// Create a pending generation in DB
		const dbGen = await prisma.generation.create({
			data: {
				title,
				projectId: parentNode.projectId,
				parentId: validated.versionId,
				imageUrl: parentNode.imageUrl, // placeholder during generation
				prompt: validated.prompt,
				preset: parentNode.preset || "Scandinavian",
				creativityStrength: parentNode.creativityStrength || 65,
				generationMode:
					validated.mode === "furniture-placement"
						? "furnish-empty"
						: "restyle",
				status: "queued",
				jobType: "editor",
				jobPayload: {
					prompt: validated.prompt, session_id: parentNode.id, image_url: parentNode.imageUrl,
					mask_url: validated.combinedMask, reference_image_url: validated.furnitureReference || null,
					edit_mode: validated.mode, guidance: 8,
				},
				queuedAt: new Date(),
			},
		});

		try {
			await enqueueGeneration(dbGen.id);
		} catch (queueError) {
			await prisma.generation.update({ where: { id: dbGen.id }, data: {
				status: "failed", failedAt: new Date(), failureMessage: "Unable to queue generation",
			}});
			throw queueError;
		}

		return res.status(202).json({
			generation: {
				id: dbGen.id,
				title: dbGen.title,
				projectId: dbGen.projectId,
				parentId: dbGen.parentId,
				imageUrl: dbGen.imageUrl,
				status: dbGen.status,
			},
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

/**
 * POST /api/editor/segment/extract
 * Extracts the selected/segmented mask in the move mode session.
 * Forwards to the SAM microservice's segment/extract endpoint.
 * Returns backgroundUrl, cutoutUrl, depthUrl, and placement metadata.
 */
export async function segmentExtract(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const validated = segmentExtractRequestSchema.parse(req.body);
		const userId = req.currentUser?.id;

		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		// Verify version and project ownership
		const generation = await prisma.generation.findUnique({
			where: { id: validated.versionId },
			include: { project: true },
		});

		if (!generation || generation.project.userId !== userId) {
			return res
				.status(404)
				.json({ error: "Version not found or unauthorized" });
		}

		const samEndpoint = process.env.SAM_ENDPOINT;

		if (samEndpoint) {
			try {
				console.log(
					`[SAM-Extract] Forwarding session ${validated.versionId} to SAM microservice for extraction`,
				);

				const samResponse: AxiosResponse<SAMExtractResponse> =
					await axios.post<SAMExtractResponse>(
						`${samEndpoint}/segment/extract`,
						{
							session_id: validated.versionId,
							image_url: generation.imageUrl,
						},
						{
							headers: { "Content-Type": "application/json" },
						},
					);

				const { clean_bg_url, cutout_url, depth_preview_url, placement_meta }: SAMExtractResponse =
					samResponse.data;
					console.log(clean_bg_url);
				return res.json({
					backgroundUrl: clean_bg_url,
					cutoutUrl: cutout_url,
					depthUrl: depth_preview_url,
					meta: placement_meta,
				});
			} catch (samError: any) {
				console.error(
					"[SAM-Extract] SAM service failed, falling back to mock:",
					samError.message,
				);
				// Fall through to mock below
			}
		}

		// Mock Fallback
		console.warn("[SAM-Extract] Using mock fallback — set SAM_ENDPOINT in .env for real extraction.");
		// Use 512, 512 as center point for the mock cutout
		const mock = {
			clean_bg_url: generation.imageUrl,
			cutout_url: generation.imageUrl,
			depth_preview_url: generation.imageUrl,
			placement_meta: {
				bbox: { x0: 448, y0: 448, x1: 576, y1: 576 },
				centroid: { x: 512, y: 512 },
				cutout_size: { width: 128, height: 128 },
				background_size: { width: 1024, height: 1024 },
			},
		};

		return res.json({
			backgroundUrl: mock.clean_bg_url,
			cutoutUrl: mock.cutout_url,
			depthUrl: mock.depth_preview_url,
			meta: mock.placement_meta,
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
