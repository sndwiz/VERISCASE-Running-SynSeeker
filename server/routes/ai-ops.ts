import { Router, type Request, type Response, type Express } from "express";
import { getAIOpsRecords, getAIOpsSummary } from "../ai/ai-ops";

const router = Router();

router.get("/api/ai-ops/summary", (_req: Request, res: Response) => {
  const summary = getAIOpsSummary();
  res.json(summary);
});

router.get("/api/ai-ops/records", (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const records = getAIOpsRecords(limit, offset);
  res.json({ records, limit, offset });
});

export function registerAIOpsRoutes(app: Express) { app.use(router); }

export default router;
