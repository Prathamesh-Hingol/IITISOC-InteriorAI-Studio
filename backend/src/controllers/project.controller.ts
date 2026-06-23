import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { z } from "zod";

// Input validation schema
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
});

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description } = createProjectSchema.parse(req.body);
    const userId = req.currentUser!.id;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        userId,
      },
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.currentUser!.id;

    const projects = await prisma.project.findMany({
      where: { userId },
      include: {
        _count: {
          select: { generations: true },
        },
        generations: {
          orderBy: { createdAt: "desc" },
          take: 1, // To retrieve the thumbnail url of the latest generation
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Map to API response structure matching Project interface in frontend
    const mappedProjects = projects.map((proj) => {
      const latestGen = proj.generations[0];
      return {
        id: proj.id,
        name: proj.name,
        description: proj.description || "",
        thumbnailUrl: latestGen?.imageUrl || "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80",
        versionCount: proj._count.generations,
        lastUpdated: formatTime(proj.updatedAt),
      };
    });

    res.json(mappedProjects);
  } catch (error) {
    next(error);
  }
}

export async function getProjectDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const userId = req.currentUser!.id;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      include: {
        _count: {
          select: { generations: true },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({
      id: project.id,
      name: project.name,
      description: project.description || "",
      versionCount: project._count.generations,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function getProjectGenerations(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const userId = req.currentUser!.id;

    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const generations = await prisma.generation.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });

    res.json(generations);
  } catch (error) {
    next(error);
  }
}

// Helper: Format Dates to human readable strings
function formatTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
