import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { z } from "zod";
import axios, { type AxiosResponse } from "axios";
import dotenv from "dotenv";
import { enqueueGeneration } from "../queues/ai-generation.queue";
import { branchJobPayloadSchema } from "../queues/generation-job.schemas";
import { enhancePrompt } from "../config/promptEnhancer";

dotenv.config();

interface ModalRes {
	status: string,
    cloudinary_url: string,
    public_id: string,
    steps_skipped:number,
}



interface DepthResponse {
	depth_preview_url: string;
	depth_raw16_url: string;
}

export const createGenerationSchema = z.object({

	projectId: z.string().uuid("Invalid project ID"),
	parentId: z.string().uuid("Invalid parent ID").nullable().optional(),
	imageUrl: z.string().url("Invalid image URL").optional(),
	prompt: z.string().optional(),
	preset: z.string().optional(),
	creativityStrength: z.number().min(0).max(100).optional(),
	generationMode: z.enum(["restyle", "furnish-empty"]).optional(),
});



export async function createGeneration(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const validatedData = createGenerationSchema.parse(req.body);
		const userId = req.currentUser?.id;

		// Verify project ownership
		const project = await prisma.project.findFirst({
			where: { id: validatedData.projectId, userId },
		});

		if (!project) {
			return res
				.status(404)
				.json({ error: "Project not found or unauthorized access" });
		}

		const totalGens = await prisma.generation.count({
			where: { projectId: validatedData.projectId },
		});

		const isRoot = !validatedData.parentId;

		if (isRoot) {
			// ── Root Node Creation (Original upload or Start from Prompt) ──
			if (!validatedData.imageUrl && !validatedData.prompt) {
				return res
					.status(400)
					.json({ error: "imageUrl or prompt is required for root room generation" });
			}

			let imageUrl = validatedData.imageUrl;
			let title = "V1: Original Base";
			let promptText = "Original room upload";

			if (!imageUrl && validatedData.prompt) {
				title = "V1: Text to Image Base";
				promptText = validatedData.prompt;

				// ── Prompt Enhancement ──────────────────────────────────────────────
				const enhancedRoot = await enhancePrompt(promptText, "schnell");
				if (enhancedRoot === null) {
					return res.status(400).json({ error: "Invalid prompt" });
				}
				promptText = enhancedRoot;

				// ── Synchronous text-to-image via FLUX Schnell ──────────────────────
				// The request blocks here until the image is ready (up to 5 min).
				// The frontend keeps the onboarding screen visible (isLoading=true)
				// and only navigates to the studio once the 201 response arrives
				// with a real imageUrl — no queueing or polling needed.
				const genEndpoint = process.env.GENERATION_ENDPOINT;
				if (!genEndpoint) {
					return res.status(503).json({ error: "Image generation service is not configured" });
				}

				console.log(`[Root-Gen] Calling FLUX Schnell synchronously for prompt: "${promptText}"`);
				const response: AxiosResponse<ModalRes> = await axios.post<ModalRes>(
					`${genEndpoint}/generate`,
					{ prompt: promptText },
					{ headers: { "Content-Type": "application/json" }},
				);

				if (!response.data?.cloudinary_url) {
					return res.status(502).json({ error: "Image generation service returned no image" });
				}
				imageUrl = response.data.cloudinary_url;
			}

			const originalNode = await prisma.generation.create({
				data: {
					title,
					projectId: validatedData.projectId,
					parentId: null,
					imageUrl: imageUrl!,
					prompt: promptText,
					preset: validatedData.preset || "Minimalist",
					creativityStrength: validatedData.creativityStrength || 0,
					generationMode: validatedData.generationMode || "restyle",
					status: "completed",
				},
			});

			return res.status(201).json(originalNode);
		} else {
			// ── Child Node Generation (Branching) ──
			const parentId = validatedData.parentId!;
			const parentNode = await prisma.generation.findFirst({
				where: { id: parentId, projectId: validatedData.projectId },
			});

			if (!parentNode) {
				return res
					.status(404)
					.json({ error: "Parent generation not found inside this project" });
			}

			// Create a pending generation record first
			const preset = validatedData.preset || "Scandinavian";
			const prompt = validatedData.prompt || "Describe your vision...";
			const strength = validatedData.creativityStrength ?? 65;
			const mode = validatedData.generationMode || "restyle";

			const generationIndex = totalGens + 1;
			const title = `V${generationIndex}: ${preset} Luxe`;

			const payload = branchJobPayloadSchema.parse({ prompt, image_url: parentNode.imageUrl });

			// 1. Save Pending Generation in DB
			const dbGen = await prisma.generation.create({
				data: {
					title,
					projectId: validatedData.projectId,
					parentId,
					imageUrl: parentNode.imageUrl, // Temporary imageUrl during pending state
					prompt: prompt,
					preset,
					creativityStrength: strength,
					generationMode: mode,
					status: "queued",
					job: { create: { type: "BRANCH", payload } },
				},
			});
			try {
				console.log("kontext generation added to the queue")
				await enqueueGeneration(dbGen.id);
			} catch (queueError) {
				await prisma.$transaction([
					prisma.generation.update({ where: { id: dbGen.id }, data: { status: "failed" } }),
					prisma.generationJob.update({ where: { generationId: dbGen.id }, data: {
						status: "FAILED", failedAt: new Date(), failureMessage: "Unable to queue generation",
					}}),
				]);
				throw queueError;
			}

			return res.status(202).json(dbGen);
		}
	} catch (error) {
		next(error);
	}
}

export async function getGenerationDetail(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const { generationId } = req.params;
		const userId = req.currentUser!.id;

		const generation = await prisma.generation.findUnique({
			where: { id: generationId },
			include: {
				project: true,
			},
		});

		if (!generation || generation.project.userId !== userId) {
			return res.status(404).json({ error: "Generation not found" });
		}

		res.json(generation);
	} catch (error) {
		next(error);
	}
}

export async function createGenerationDepth(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const { generationId } = req.params;
		const userId = req.currentUser!.id;

		const generation = await prisma.generation.findUnique({
			where: { id: generationId },
			include: { project: true, depth: true },
		});

		if (!generation || generation.project.userId !== userId) {
			return res.status(404).json({ error: "Generation not found" });
		}

		if (generation.depth?.previewUrl && generation.depth.raw16Url) {
			return res.json({
				imageUrl: generation.imageUrl,
				depthPreviewUrl: generation.depth.previewUrl,
				depthRaw16Url: generation.depth.raw16Url,
				cached: true,
			});
		}

		const samEndpoint = process.env.SAM_ENDPOINT;
		if (!samEndpoint) {
			return res.status(503).json({ error: "3D depth service is not configured" });
		}

		const depthResponse = await axios.post<DepthResponse>(
			`${samEndpoint}/depth`,
			{ image_url: generation.imageUrl },
			{
				headers: { "Content-Type": "application/json" },
				timeout: 120000,
			},
		);

		const { depth_preview_url, depth_raw16_url } = depthResponse.data;
		if (!depth_preview_url || !depth_raw16_url) {
			return res.status(502).json({ error: "Depth service returned incomplete assets" });
		}

		const depth = await prisma.generationDepth.upsert({
			where: { generationId: generation.id },
			create: { generationId: generation.id, previewUrl: depth_preview_url, raw16Url: depth_raw16_url },
			update: { previewUrl: depth_preview_url, raw16Url: depth_raw16_url },
		});

		return res.json({
			imageUrl: generation.imageUrl,
			depthPreviewUrl: depth.previewUrl,
			depthRaw16Url: depth.raw16Url,
			cached: false,
		});
	} catch (error) {
		next(error);
	}
}

export async function deleteGeneration(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	try {
		const { generationId } = req.params;
		const userId = req.currentUser!.id;

		// Verify ownership
		const generation = await prisma.generation.findUnique({
			where: { id: generationId },
			include: {
				project: true,
			},
		});

		if (!generation || generation.project.userId !== userId) {
			return res.status(404).json({ error: "Generation not found" });
		}

		// Cascade delete is configured on database-level (via schema.prisma onDelete: Cascade)
		await prisma.generation.delete({
			where: { id: generationId },
		});

		res.json({
			message: "Generation and all its branch descendants deleted successfully",
		});
	} catch (error) {
		next(error);
	}
}




