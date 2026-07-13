import { Router } from "express";
import {
  createProject,
  getProjects,
  getProjectDetail,
  getProjectGenerations,
  updateProject,
  deleteProject,
} from "../controllers/project.controller";

const router = Router();

// All project routes are protected
router.post("/", createProject);
router.get("/", getProjects);
router.get("/:projectId", getProjectDetail);
router.get("/:projectId/generations", getProjectGenerations);
router.put("/:projectId", updateProject);
router.delete("/:projectId", deleteProject);

export default router;
