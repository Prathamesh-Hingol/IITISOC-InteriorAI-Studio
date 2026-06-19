import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("Unhandle Exception Captured:", error);

  // 1. Zod input validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Validation Error",
      details: error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      })),
    });
  }

  // 2. Prisma Database Errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint failed
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "Conflict",
        message: `Unique constraint failed on field: ${((error.meta?.target) as string[])?.join(", ") || "unknown"}`,
      });
    }

    // Record not found
    if (error.code === "P2025") {
      return res.status(404).json({
        error: "Not Found",
        message: error.meta?.cause || "Requested database record does not exist",
      });
    }
  }

  // 3. Generic Error
  const statusCode = (error as any).status || (error as any).statusCode || 500;
  const message = error.message || "An unexpected error occurred on the server";

  res.status(statusCode).json({
    error: statusCode === 500 ? "Internal Server Error" : "Error",
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}),
  });
}
