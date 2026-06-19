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

export async function getProjectTree(req: Request, res: Response, next: NextFunction) {
  try {
    const { projectId } = req.params;
    const userId = req.currentUser!.id;
    // Client can pass currently selected node to position placeholder child correctly
    const selectedNodeId = (req.query.selectedNodeId as string) || null;

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

    if (generations.length === 0) {
      return res.json({ nodes: [], edges: [] });
    }

    const tree = layoutTree(generations, selectedNodeId);
    res.json(tree);
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

// Tree generation layout algorithm
function layoutTree(generations: any[], selectedNodeId: string | null) {
  const nodes: any[] = [];
  const edges: any[] = [];

  // Locate the root node
  const root = generations.find((g) => g.parentId === null);
  if (!root) {
    // If somehow no root has null parentId, pick the oldest one
    return { nodes, edges };
  }

  // Map parents to children
  const childrenMap: Record<string, any[]> = {};
  generations.forEach((gen) => {
    if (gen.parentId) {
      if (!childrenMap[gen.parentId]) {
        childrenMap[gen.parentId] = [];
      }
      childrenMap[gen.parentId].push(gen);
    }
  });

  // Recursive positioner
  function positionNode(node: any, x: number, y: number) {
    nodes.push({
      id: node.id,
      type: node.id === selectedNodeId ? "active" : (node.parentId === null ? "original" : "generated"),
      title: node.title,
      image: node.imageUrl,
      parentId: node.parentId || undefined,
      createdAt: formatTime(node.createdAt) + (node.creativityStrength !== 0 ? ` • ${node.creativityStrength}% strength` : ""),
      x,
      y,
      prompt: node.prompt || undefined,
      preset: node.preset || undefined,
      creativityStrength: node.creativityStrength || undefined,
      generationMode: node.generationMode || undefined,
      status: node.status === "completed" ? "Generated" : node.status,
    });

    const children = childrenMap[node.id] || [];
    const count = children.length;
    children.forEach((child, index) => {
      edges.push({
        id: `e-${node.id}-${child.id}`,
        source: node.id,
        target: child.id,
      });

      const childX = x + 350;
      // Symmetric vertical spacing centered on parent Y
      const offsetY = count === 1 ? 0 : -((count - 1) * 120) + (index * 240);
      positionNode(child, childX, y + offsetY);
    });
  }

  // Layout tree starting from root at coordinates (400, 350)
  positionNode(root, 400, 350);

  // Add the UI-only "v-placeholder" node under the selected node (or root if selected is invalid or null)
  let placeholderParentId = root.id;
  if (selectedNodeId && generations.some((g) => g.id === selectedNodeId)) {
    placeholderParentId = selectedNodeId;
  }

  const parentNodeObj = nodes.find((n) => n.id === placeholderParentId);
  if (parentNodeObj) {
    const pX = parentNodeObj.x + 350;
    const existingChildren = childrenMap[placeholderParentId] || [];
    const pY = parentNodeObj.y - ((existingChildren.length) * 120) + (existingChildren.length * 240);

    nodes.push({
      id: "v-placeholder",
      type: "placeholder",
      title: "New Variation",
      parentId: placeholderParentId,
      createdAt: `From ${parentNodeObj.title.split(":")[0]} Base`,
      x: pX,
      y: pY,
    });

    edges.push({
      id: `e-${placeholderParentId}-placeholder`,
      source: placeholderParentId,
      target: "v-placeholder",
    });
  }

  return { nodes, edges };
}
