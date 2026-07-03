import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { uploadToCloudinary } from "../config/cloudinary";
import { z } from "zod";
import axios from "axios";
import type { AxiosResponse } from "axios";
import dotenv from "dotenv";

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

const generateRequestSchema = z.object({
  versionId: z.string().uuid("Invalid version ID"),
  prompt: z.string().min(1, "Prompt is required"),
  combinedMask: z.string().url("Invalid mask URL"),
  furnitureReference: z.string().url("Invalid furniture reference URL").optional().nullable(),
  mode: z.enum(["interior-modification", "furniture-placement"]),
});

// ─── Types ───────────────────────────────────────────────────

interface SAMSegmentResponse {
  candidateMasks: string[]; // List of base64 PNG data URLs or image URLs
}

interface SAMAcceptResponse {
  combinedMask: string; // Base64 PNG mask data URL or image URL
}

interface SAMActionResponse {
  combinedMask: string | null;
}

interface GenerationResponse {
  status: string;
  cloudinary_url: string;
  public_id: string;
}

// ─── In-Memory Mock Session Store ────────────────────────────
// In a real production setup, the SAM microservice maintains the sessions.
// For development or when SAM_ENDPOINT is not active, this backend gateway
// manages the selection session state to provide a working mock experience.
interface MockSession {
  history: Array<{ x: number; y: number; r: number }>;
  lastCandidates: Array<{ x: number; y: number; r: number }>;
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
function generateSvgMask(circles: Array<{ x: number; y: number; r: number }>): string {
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
      return res.status(404).json({ error: "Version not found or unauthorized" });
    }

    const samEndpoint = process.env.SAM_ENDPOINT;

    if (samEndpoint) {
      try {
        console.log(`[SAM-Segment] Forwarding click (${validated.x}, ${validated.y}) to SAM microservice`);
        const samResponse: AxiosResponse<SAMSegmentResponse> = await axios.post<SAMSegmentResponse>(
          `${samEndpoint}/segment`,
          {
            image_url: generation.imageUrl,
            version_id: validated.versionId,
            x: validated.x,
            y: validated.y,
          },
          {
            headers: { "Content-Type": "application/json" },
            timeout: 15000,
          }
        );

        return res.json({
          candidateMasks: samResponse.data.candidateMasks,
        });
      } catch (samError: any) {
        console.error("SAM service failed, falling back to mock logic:", samError.message);
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
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    next(error);
  }
}

/**
 * POST /api/editor/accept-candidate
 * Accepts a candidate mask index, updates the combined session mask,
 * and returns the latest combined mask URL.
 */
export async function acceptCandidate(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = acceptCandidateRequestSchema.parse(req.body);
    const userId = req.currentUser?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const samEndpoint = process.env.SAM_ENDPOINT;

    if (samEndpoint) {
      try {
        console.log(`[SAM-Accept] Accepting candidate ${validated.maskIndex} in SAM`);
        const samResponse: AxiosResponse<SAMAcceptResponse> = await axios.post<SAMAcceptResponse>(
          `${samEndpoint}/accept`,
          {
            version_id: validated.versionId,
            mask_index: validated.maskIndex,
          },
          {
            headers: { "Content-Type": "application/json" },
            timeout: 15000,
          }
        );

        // Upload combined mask base64 to Cloudinary
        const base64Data = samResponse.data.combinedMask.split(",")[1] || samResponse.data.combinedMask;
        const maskBuffer = Buffer.from(base64Data, "base64");
        const cloudResult = await uploadToCloudinary(maskBuffer);

        return res.json({
          combinedMaskUrl: cloudResult.imageUrl,
        });
      } catch (samError: any) {
        console.error("SAM accept candidate failed, falling back to mock logic:", samError.message);
      }
    }

    // ── Mock Fallback ──
    const session = getOrCreateMockSession(validated.versionId);
    const selected = session.lastCandidates[validated.maskIndex];

    if (selected) {
      session.history.push(selected);
    }

    // Render combined history
    const combinedSvg = generateSvgMask(session.history);
    const svgBuffer = Buffer.from(combinedSvg, "utf-8");
    const cloudResult = await uploadToCloudinary(svgBuffer);

    session.combinedMaskUrl = cloudResult.imageUrl;

    return res.json({
      combinedMaskUrl: session.combinedMaskUrl,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    next(error);
  }
}

/**
 * POST /api/editor/undo-selection
 * Removes the last added mask from the session.
 */
export async function undoSelection(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = actionRequestSchema.parse(req.body);
    const userId = req.currentUser?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const samEndpoint = process.env.SAM_ENDPOINT;

    if (samEndpoint) {
      try {
        console.log(`[SAM-Undo] Requesting undo from SAM`);
        const samResponse: AxiosResponse<SAMActionResponse> = await axios.post<SAMActionResponse>(
          `${samEndpoint}/undo`,
          { version_id: validated.versionId },
          { headers: { "Content-Type": "application/json" }, timeout: 10000 }
        );

        if (!samResponse.data.combinedMask) {
          return res.json({ combinedMaskUrl: null });
        }

        const base64Data = samResponse.data.combinedMask.split(",")[1] || samResponse.data.combinedMask;
        const maskBuffer = Buffer.from(base64Data, "base64");
        const cloudResult = await uploadToCloudinary(maskBuffer);

        return res.json({
          combinedMaskUrl: cloudResult.imageUrl,
        });
      } catch (samError: any) {
        console.error("SAM undo failed, falling back to mock logic:", samError.message);
      }
    }

    // ── Mock Fallback ──
    const session = getOrCreateMockSession(validated.versionId);
    session.history.pop();

    if (session.history.length === 0) {
      session.combinedMaskUrl = null;
      return res.json({ combinedMaskUrl: null });
    }

    const combinedSvg = generateSvgMask(session.history);
    const svgBuffer = Buffer.from(combinedSvg, "utf-8");
    const cloudResult = await uploadToCloudinary(svgBuffer);

    session.combinedMaskUrl = cloudResult.imageUrl;

    return res.json({
      combinedMaskUrl: session.combinedMaskUrl,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    next(error);
  }
}

/**
 * POST /api/editor/clear-selection
 * Resets the selection session.
 */
export async function clearSelection(req: Request, res: Response, next: NextFunction) {
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
          `${samEndpoint}/clear`,
          { version_id: validated.versionId },
          { headers: { "Content-Type": "application/json" }, timeout: 10000 }
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
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    next(error);
  }
}

/**
 * POST /api/editor/generate
 * Executes final model generation (Interior Modification vs Furniture Placement)
 * and outputs a child node under the Version Tree.
 */
export async function generate(req: Request, res: Response, next: NextFunction) {
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
    let dbGen = await prisma.generation.create({
      data: {
        title,
        projectId: parentNode.projectId,
        parentId: validated.versionId,
        imageUrl: parentNode.imageUrl, // placeholder during generation
        prompt: validated.prompt,
        preset: parentNode.preset || "Scandinavian",
        creativityStrength: parentNode.creativityStrength || 65,
        generationMode: validated.mode === "furniture-placement" ? "furnish-empty" : "restyle",
        status: "pending",
      },
    });

    let generatedImageUrl = parentNode.imageUrl;
    const genEndpoint = process.env.GENERATION_ENDPOINT;

    if (genEndpoint) {
      try {
        console.log(`[Generation] Triggering microservice for ${validated.mode}`);
        const response: AxiosResponse<GenerationResponse> = await axios.post<GenerationResponse>(
          genEndpoint,
          {
            prompt: validated.prompt,
            image_url: parentNode.imageUrl,
            mask_url: validated.combinedMask,
            reference_image_url: validated.furnitureReference || null,
            edit_mode: validated.mode,
          },
          {
            headers: { "Content-Type": "application/json" },
            timeout: 90000,
          }
        );

        if (response.data?.cloudinary_url) {
          generatedImageUrl = response.data.cloudinary_url;
        }
      } catch (genError: any) {
        console.error("Generation microservice failed, falling back to mock details:", genError.message);
        // Fallback to parent image or random mock visual to make sure flow doesn't crash
        generatedImageUrl = parentNode.imageUrl;
      }
    }

    // Update version status to completed
    dbGen = await prisma.generation.update({
      where: { id: dbGen.id },
      data: {
        status: "completed",
        imageUrl: generatedImageUrl,
      },
    });

    return res.status(201).json({
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
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    next(error);
  }
}
