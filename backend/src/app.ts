import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import apiRoutes from "./routes";
import { errorHandler } from "./middleware/error";

dotenv.config();

const app = express();

// Configure CORS to accept requests from our Vite frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

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
