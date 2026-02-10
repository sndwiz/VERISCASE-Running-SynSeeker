import type { Express, Request, Response } from "express";
import {
  seedModelIntelligence,
  getRecommendations,
  getActiveAlerts,
  dismissAlert,
  getAllIntelligenceEntries,
  getIntelligenceForTask,
  getLastRefreshTime,
  getTaskTypes,
  refreshModelIntelligence,
} from "../services/model-intelligence";
import { streamResponse, type ChatMessage, type AIConfig } from "../ai/providers";
import { getUserId } from "../utils/auth";
import { logger } from "../utils/logger";

export function registerModelIntelligenceRoutes(app: Express): void {
  app.get("/api/model-intel/entries", async (_req: Request, res: Response) => {
    try {
      const entries = await getAllIntelligenceEntries();
      res.json({ entries, count: entries.length });
    } catch (error: any) {
      logger.error("[ModelIntel] Failed to get entries", { error: error.message });
      res.status(500).json({ error: "Failed to fetch model intelligence entries" });
    }
  });

  app.get("/api/model-intel/recommendations", async (req: Request, res: Response) => {
    try {
      const taskType = req.query.task as string | undefined;
      if (taskType) {
        const enriched = await getIntelligenceForTask(taskType);
        return res.json({ taskType, recommendations: enriched });
      }
      const recs = await getRecommendations();
      res.json({ recommendations: recs });
    } catch (error: any) {
      logger.error("[ModelIntel] Failed to get recommendations", { error: error.message });
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  app.get("/api/model-intel/tasks", async (_req: Request, res: Response) => {
    try {
      const tasks = getTaskTypes();
      res.json({ tasks });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch task types" });
    }
  });

  app.get("/api/model-intel/alerts", async (_req: Request, res: Response) => {
    try {
      const alerts = await getActiveAlerts();
      res.json({ alerts, count: alerts.length });
    } catch (error: any) {
      logger.error("[ModelIntel] Failed to get alerts", { error: error.message });
      res.status(500).json({ error: "Failed to fetch model alerts" });
    }
  });

  app.post("/api/model-intel/alerts/:id/dismiss", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      await dismissAlert(req.params.id, String(userId));
      res.json({ success: true });
    } catch (error: any) {
      logger.error("[ModelIntel] Failed to dismiss alert", { error: error.message });
      res.status(500).json({ error: "Failed to dismiss alert" });
    }
  });

  app.post("/api/model-intel/refresh", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const result = await refreshModelIntelligence();
      res.json({ success: true, ...result, refreshedAt: new Date().toISOString() });
    } catch (error: any) {
      logger.error("[ModelIntel] Refresh failed", { error: error.message });
      res.status(500).json({ error: "Failed to refresh model intelligence" });
    }
  });

  app.get("/api/model-intel/status", async (_req: Request, res: Response) => {
    try {
      const lastRefresh = getLastRefreshTime();
      const entries = await getAllIntelligenceEntries();
      const alerts = await getActiveAlerts();
      const tasks = getTaskTypes();
      res.json({
        lastRefresh: lastRefresh?.toISOString() || null,
        totalEntries: entries.length,
        activeAlerts: alerts.length,
        taskTypes: tasks.length,
        isSeeded: entries.length > 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to get status" });
    }
  });

  app.post("/api/model-intel/chat", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "Not authenticated" });

      const { messages: userMessages } = req.body;
      if (!Array.isArray(userMessages) || userMessages.length === 0) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const entries = await getAllIntelligenceEntries();
      const recs = await getRecommendations();
      const alerts = await getActiveAlerts();
      const tasks = getTaskTypes();

      const modelCatalog = entries.map(e => ({
        modelId: e.modelId,
        displayName: e.displayName,
        provider: e.provider,
        category: e.category,
        parameterSize: e.parameterSize,
        contextWindow: e.contextWindow,
        qualityScores: e.qualityScores,
        capabilities: e.capabilities,
        license: e.license,
        tasksRecommended: e.tasksRecommended,
        replacesModelId: e.replacesModelId,
        notes: e.notes,
      }));

      const systemPrompt = `You are the Model Intelligence Advisor for VERICASE, a legal practice management system powered by SynSeekr (self-hosted AI).

Your role is to provide deep analysis and guidance about open-source AI models for the firm's SynSeekr deployment. You have access to the full model intelligence database.

**CURRENT MODEL CATALOG (${entries.length} models tracked):**
${JSON.stringify(modelCatalog, null, 2)}

**TASK-SPECIFIC RECOMMENDATIONS (${recs.length} total across ${tasks.length} task types):**
Task types: ${tasks.join(", ")}
${JSON.stringify(recs.map(r => ({ taskType: r.taskType, modelId: r.modelId, rank: r.rank, reason: r.reason, isCurrentBest: r.isCurrentBest })), null, 2)}

**ACTIVE ALERTS (${alerts.length}):**
${alerts.length > 0 ? JSON.stringify(alerts.map(a => ({ title: a.title, severity: a.severity, description: a.description, suggestedAction: a.suggestedAction })), null, 2) : "None"}

**YOUR EXPERTISE:**
1. Compare models across quality scores, parameter sizes, efficiency, and licensing
2. Recommend optimal models for specific legal AI tasks (NER, PII detection, RAG, document analysis, transcription, embeddings, chat)
3. Advise on upgrade paths (e.g., Qwen 2.5 7B -> 14B -> 32B tradeoffs)
4. Analyze GPU/VRAM requirements and deployment considerations
5. Explain quantization tradeoffs (GGUF, AWQ, GPTQ, etc.)
6. Discuss model architecture differences and their practical implications
7. Legal-specific considerations: accuracy requirements for PII detection, NER reliability for entity extraction, embedding quality for case law retrieval

**GUIDELINES:**
- Be specific with numbers: cite quality scores, parameter counts, context windows
- When comparing models, use structured comparisons
- Always consider the legal practice context — accuracy matters more than speed for most legal tasks
- Be honest about limitations and uncertainties
- Reference the actual data from the catalog above, don't hallucinate model specs`;

      const chatMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...userMessages.map((m: any) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let clientDisconnected = false;
      req.on("close", () => { clientDisconnected = true; });

      const config: AIConfig = {
        provider: "anthropic",
        model: "claude-sonnet-4-5",
        maxTokens: 4096,
      };

      for await (const chunk of streamResponse(chatMessages, config, "model_intel_chat")) {
        if (clientDisconnected) break;
        if (chunk.content) {
          try { res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`); } catch {}
        }
        if (chunk.error) {
          try { res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`); } catch {}
          break;
        }
        if (chunk.done) break;
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      logger.error("[ModelIntel] Chat failed", { error: error.message });
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Chat failed: " + error.message })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process chat request" });
      }
    }
  });

  seedModelIntelligence().catch(err => {
    logger.warn("[ModelIntel] Initial seed failed (tables may not exist yet)", { error: err.message });
  });
}
