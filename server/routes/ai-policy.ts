import type { Express, Request, Response } from "express";
import { getAvailableModels, getLocalModels, getExternalModels, MODEL_REGISTRY } from "../config/model-registry";
import { getMode, setMode, getSelectedModel, setSelectedModel, evaluatePolicy, getPolicyState, getPolicyAuditLog, type RuntimeMode } from "../ai/policy-engine";
import { logger } from "../utils/logger";
import { storage } from "../storage";

export function registerAIPolicyRoutes(app: Express): void {
  app.get("/api/ai/models", (_req: Request, res: Response) => {
    const available = getAvailableModels();
    const all = MODEL_REGISTRY.map((m) => ({
      ...m,
      isLocal: !m.requiresInternet,
      allowedInBatmode: !m.requiresInternet,
    }));
    res.json({ models: all, availableCount: available.length });
  });

  app.get("/api/ai/models/local", (_req: Request, res: Response) => {
    res.json({ models: getLocalModels() });
  });

  app.get("/api/ai/models/external", (_req: Request, res: Response) => {
    res.json({ models: getExternalModels() });
  });

  app.get("/api/ai/policy/state", (_req: Request, res: Response) => {
    res.json(getPolicyState());
  });

  app.post("/api/ai/policy/mode", async (req: Request, res: Response) => {
    const { mode } = req.body;
    if (mode !== "online" && mode !== "batmode") {
      return res.status(400).json({ error: "Mode must be 'online' or 'batmode'" });
    }

    const previousMode = getMode();
    setMode(mode as RuntimeMode);

    try {
      const userId = (req as any).dbUser?.id || (req as any).user?.claims?.sub || "system";
      await storage.createAuditLog({
        userId,
        action: "mode_change",
        resourceType: "ai_policy",
        resourceId: "runtime_mode",
        metadata: { previousMode, newMode: mode },
        severity: mode === "batmode" ? "warning" : "info",
      });
    } catch (err) {
      logger.error("[ai-policy] Failed to audit mode change", { error: (err as any)?.message });
    }

    logger.info(`[ai-policy] Mode changed: ${previousMode} -> ${mode}`);
    res.json(getPolicyState());
  });

  app.post("/api/ai/policy/select-model", (req: Request, res: Response) => {
    const { modelId } = req.body;
    if (!modelId || typeof modelId !== "string") {
      return res.status(400).json({ error: "modelId is required" });
    }

    setSelectedModel(modelId);

    const decision = evaluatePolicy({
      mode: getMode(),
      requestedModelId: modelId,
    });

    res.json({
      ...getPolicyState(),
      decision: {
        allowed: decision.allowed,
        effectiveModelId: decision.effectiveModelId,
        reason: decision.reason,
        wasFallback: decision.wasFallback,
        requiredSteps: decision.requiredSteps,
      },
    });
  });

  app.get("/api/ai/policy/audit", (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json({ entries: getPolicyAuditLog(limit) });
  });

  app.post("/api/ai/policy/evaluate", (req: Request, res: Response) => {
    const { modelId, casePolicy, payloadClassification, redactionStatus } = req.body;
    if (!modelId) {
      return res.status(400).json({ error: "modelId is required" });
    }

    const decision = evaluatePolicy({
      mode: getMode(),
      requestedModelId: modelId,
      casePolicy,
      payloadClassification,
      redactionStatus,
      userId: (req as any).dbUser?.id,
      matterId: req.body.matterId,
    });

    res.json({ decision });
  });
}
