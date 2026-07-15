import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { z } from "zod";
import axios from "axios";
import dotenv from "dotenv";
import { AxiosResponse } from "axios";
dotenv.config();

interface ModalRes {
	status: string,
    cloudinary_url: string,
    public_id: string,
    steps_skipped:number,
}

interface kontextRes {
	"output_url":string,
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

// Style preset mock images
const MOCK_IMAGES: Record<string, string> = {
	Modern:
		"https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80",
	Minimalist:
		"https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=600&q=80",
	Luxury:
		"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
	Scandinavian:
		"https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80",
	Industrial:
		"https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?auto=format&fit=crop&w=600&q=80",
};

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

				// Generate root node from text prompt using FLUX Schnell
				const genEndpoint = process.env.GENERATION_ENDPOINT;
				if (genEndpoint) {
					try {
						console.log(`[Root-Gen] Calling FLUX Schnell for text prompt: "${promptText}"`);
						const response: AxiosResponse<ModalRes> = await axios.post<ModalRes>(
							`${genEndpoint}/generate`,
							{ prompt: promptText },
							{ headers: { "Content-Type": "application/json" }}
						);

						if (response.data?.cloudinary_url) {
							imageUrl = response.data.cloudinary_url;
						}
					} catch (genError: any) {
						console.error("FLUX Schnell root generation failed, using fallback:", genError.message);
					}
				}

				// Fallback if endpoint is not set or failed
				if (!imageUrl) {
					imageUrl = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1024&q=80";
				}
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

			// 1. Save Pending Generation in DB
			let dbGen = await prisma.generation.create({
				data: {
					title,
					projectId: validatedData.projectId,
					parentId,
					imageUrl: parentNode.imageUrl, // Temporary imageUrl during pending state
					prompt,
					preset,
					creativityStrength: strength,
					generationMode: mode,
					status: "pending",
				},
			});

			// 2. Wait 2 seconds to simulate AI pipeline processing
			// await new Promise((resolve) => setTimeout(resolve, 2000));

			// Choose image preset URL
			// const mockImage = MOCK_IMAGES[preset] || MOCK_IMAGES.Scandinavian;
			const kontextEndpoint=process.env.GENERATION_ENDPOINT2
			const generationRes: AxiosResponse<kontextRes> = await axios.post<kontextRes>(
				`${kontextEndpoint}/generate`,
				{
					prompt,
					image_url: parentNode.imageUrl,
				},
				{
					headers: {
						"Content-Type": "application/json",
					},
				},
			);
			if (!generationRes.data || !generationRes.data.output_url) {
				return res.status(500).json({
					error: "Modal response error",
				});
			}
			const generation_url = generationRes.data.output_url;
			// 3. Update status to completed and set image URL
			dbGen = await prisma.generation.update({
				where: { id: dbGen.id },
				data: {
					status: "completed",
					imageUrl: generation_url,
				},
			});

			return res.status(201).json(dbGen);
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
			include: { project: true },
		});

		if (!generation || generation.project.userId !== userId) {
			return res.status(404).json({ error: "Generation not found" });
		}

		if (generation.depthPreviewUrl && generation.depthRaw16Url) {
			return res.json({
				imageUrl: generation.imageUrl,
				depthPreviewUrl: generation.depthPreviewUrl,
				depthRaw16Url: generation.depthRaw16Url,
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

		const updatedGeneration = await prisma.generation.update({
			where: { id: generation.id },
			data: {
				depthPreviewUrl: depth_preview_url,
				depthRaw16Url: depth_raw16_url,
			},
		});

		return res.json({
			imageUrl: updatedGeneration.imageUrl,
			depthPreviewUrl: updatedGeneration.depthPreviewUrl,
			depthRaw16Url: updatedGeneration.depthRaw16Url,
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

