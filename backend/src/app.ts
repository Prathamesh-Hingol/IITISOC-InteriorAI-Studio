import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/error";
import { requestLogger } from "./middleware/logger";

dotenv.config();

const app = express();

// Render and most reverse proxies forward the real client IP in one hop.
// This makes the global IP limiter identify visitors correctly after deployment.
app.set("trust proxy", 1);

// Log all incoming HTTP requests
app.use(requestLogger);

// Allow requests from any origin (open CORS for development).
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));

app.use(express.json());

// Clerk Global Middleware: authenticates requests and binds auth state to Express req.auth
app.use(clerkMiddleware());

// API Routes
app.use("/api", apiRoutes);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Centralized error handler
app.use(errorHandler);

export default app;
