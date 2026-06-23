import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { z } from "zod";
import axios from "axios";
import dotenv from "dotenv";
import { AxiosResponse } from "axios";
dotenv.config();

interface ModalRes {
	image_url: string;
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
			// ── Root Node Creation (Original upload) ──
			if (!validatedData.imageUrl) {
				return res
					.status(400)
					.json({ error: "imageUrl is required for original room upload" });
			}

			const originalNode = await prisma.generation.create({
				data: {
					title: "V1: Original Base",
					projectId: validatedData.projectId,
					parentId: null,
					imageUrl: validatedData.imageUrl,
					prompt: "Original room upload",
					preset: "Minimalist",
					creativityStrength: 0,
					generationMode: "restyle",
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
			const generationRes: AxiosResponse<ModalRes> = await axios.post<ModalRes>(
				process.env.GENERATION_ENDPOINT as string,
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
			if (!generationRes.data || !generationRes.data.image_url) {
				return res.status(500).json({
					error: "Modal response error",
				});
			}
			const generation_url = generationRes.data.image_url;
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
