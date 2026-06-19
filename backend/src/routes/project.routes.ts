import { Router } from "express";
import {
  createProject,
  getProjects,
  getProjectDetail,
  getProjectTree,
} from "../controllers/project.controller";

const router = Router();

// All project routes are protected
router.post("/", createProject);
router.get("/", getProjects);
router.get("/:projectId", getProjectDetail);
router.get("/:projectId/tree", getProjectTree);

export default router;
