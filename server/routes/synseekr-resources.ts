import type { Express, Request, Response } from "express";
import { synseekrClient } from "../services/synseekr-client";
import { getMode, getPolicyState, getSelectedModel } from "../ai/policy-engine";
import { getAIOpsSummary } from "../ai/ai-ops";
import { getAvailableModels, getSynSeekrModels, getLocalModels } from "../config/model-registry";

function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function registerSynSeekrResourceRoutes(app: Express): void {
  app.get("/api/synseekr-resources/dashboard", requireAuth, async (_req: Request, res: Response) => {
    try {
      const policy = getPolicyState();
      const isBatmode = policy.mode === "batmode";
      const synseekrModels = getSynSeekrModels();
      const localModels = getLocalModels();
      const allAvailable = getAvailableModels();
      const aiOpsSummary = getAIOpsSummary();

      let systemMetrics = null;
      let gpuStatus = null;
      let synseekrHealth = null;

      if (isBatmode && synseekrClient.isEnabled()) {
        const [metricsResult, gpuResult, healthResult] = await Promise.allSettled([
          synseekrClient.getSystemMetrics(),
          synseekrClient.getGPUStatus(),
          synseekrClient.checkHealth(),
        ]);

        if (metricsResult.status === "fulfilled" && metricsResult.value.success) {
          systemMetrics = metricsResult.value.data;
        }
        if (gpuResult.status === "fulfilled" && gpuResult.value.success) {
          gpuStatus = gpuResult.value.data;
        }
        if (healthResult.status === "fulfilled") {
          synseekrHealth = healthResult.value;
        }
      } else if (synseekrClient.isConfigured()) {
        try {
          synseekrHealth = await synseekrClient.checkHealth();
        } catch {}
      }

      res.json({
        policy,
        isBatmode,
        selectedModel: getSelectedModel(),
        synseekrConfigured: synseekrClient.isConfigured(),
        synseekrEnabled: synseekrClient.isEnabled(),
        synseekrHealth,
        systemMetrics,
        gpuStatus,
        modelCounts: {
          total: allAvailable.length,
          synseekr: synseekrModels.length,
          local: localModels.length,
          cloud: allAvailable.length - localModels.length,
        },
        aiOps: {
          totalCalls: aiOpsSummary.totalCalls,
          totalCostUsd: aiOpsSummary.totalCostUsd,
          last24hCalls: aiOpsSummary.last24hCalls,
          last24hCostUsd: aiOpsSummary.last24hCostUsd,
          avgLatencyMs: aiOpsSummary.avgLatencyMs,
          successRate: aiOpsSummary.successRate,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resource dashboard data" });
    }
  });
}
