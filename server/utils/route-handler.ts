import type { Request, Response } from "express";
import { z } from "zod";
import { logger } from "./logger";

type AsyncHandler = (req: Request, res: Response) => Promise<void>;

export function handler(fn: AsyncHandler): AsyncHandler {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return void res.status(400).json({ error: error.errors });
      }
      logger.error("Route error", { path: req.path, error: String(error) });
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  return schema.parse(body);
}

export function notFound(res: Response, entity: string): void {
  res.status(404).json({ error: `${entity} not found` });
}
