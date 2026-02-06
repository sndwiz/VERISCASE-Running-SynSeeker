import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { logger } from "./logger";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    const safeMessage = err.statusCode >= 500 ? "Internal Server Error" : err.message;
    if (err.statusCode >= 500) {
      logger.error("AppError", { status: err.statusCode, message: err.message, stack: err.stack });
    }
    return res.status(err.statusCode).json({
      error: safeMessage,
      ...(err.statusCode < 500 && err.details && { details: err.details }),
    });
  }
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: err.errors,
    });
  }
  logger.error("Unhandled error", { message: err.message, stack: err.stack });
  res.status(500).json({ error: "Internal Server Error" });
}
