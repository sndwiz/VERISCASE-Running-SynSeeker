import type { Request, Response } from "express";
import { z } from "zod";
import { AppError } from "./errors";
import { logger } from "./logger";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

export function handler(fn: AsyncHandler): AsyncHandler {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }
      if (error instanceof AppError) {
        const safeMessage = error.statusCode >= 500 ? "Internal Server Error" : error.message;
        if (error.statusCode >= 500) {
          logger.error("AppError", { status: error.statusCode, message: error.message });
        }
        return void res.status(error.statusCode).json({
          error: safeMessage,
          ...(error.statusCode < 500 && error.details && { details: error.details }),
        });
      }
      logger.error("Route error", { path: req.path, error: String(error) });
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
}

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}

export function notFound(res: Response, entity: string): void {
  res.status(404).json({ error: `${entity} not found` });
}
