import { Router } from "express";
import { z } from "zod";
import { synseekrClient } from "../services/synseekr-client";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || req.user.claims?.metadata?.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

const configSchema = z.object({
  baseUrl: z.string().url().optional(),
  apiKey: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

router.get("/config", requireAdmin, async (_req: any, res) => {
  try {
    res.json(synseekrClient.getConfig());
  } catch (error) {
    res.status(500).json({ error: "Failed to get SynSeekr config" });
  }
});

router.patch("/config", requireAdmin, async (req: any, res) => {
  try {
    const data = configSchema.parse(req.body);
    const config = synseekrClient.updateConfig(data);
    res.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update SynSeekr config" });
  }
});

router.get("/status", requireAuth, async (_req, res) => {
  try {
    const config = synseekrClient.getConfig();
    if (synseekrClient.isConfigured() && (!config.lastChecked || Date.now() - new Date(config.lastChecked).getTime() > 60000)) {
      await synseekrClient.checkHealth().catch(() => {});
    }
    const freshConfig = synseekrClient.getConfig();
    res.json({
      configured: synseekrClient.isConfigured(),
      enabled: synseekrClient.isEnabled(),
      status: freshConfig.lastStatus || "unknown",
      lastChecked: freshConfig.lastChecked,
      latencyMs: freshConfig.lastLatencyMs,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get status" });
  }
});

router.post("/test", requireAdmin, async (_req: any, res) => {
  try {
    const health = await synseekrClient.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: "Failed to test connection" });
  }
});

router.get("/health", requireAuth, async (_req, res) => {
  try {
    const health = await synseekrClient.checkHealth();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: "Health check failed" });
  }
});

const proxySchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string().min(1),
  body: z.any().optional(),
  timeout: z.number().min(1000).max(120000).optional(),
});

router.post("/proxy", requireAdmin, async (req: any, res) => {
  try {
    const data = proxySchema.parse(req.body);
    const result = await synseekrClient.proxy(
      data.method,
      data.path,
      data.body,
      data.timeout
    );
    res.status(result.statusCode || 200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Proxy request failed" });
  }
});

router.get("/cases", requireAuth, async (_req, res) => {
  try {
    const result = await synseekrClient.getCases();
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cases from SynSeekr" });
  }
});

router.get("/cases/:caseId", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.getCase(req.params.caseId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch case from SynSeekr" });
  }
});

router.post("/analyze-document", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: "documentId is required" });
    }
    const result = await synseekrClient.analyzeDocument(documentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to analyze document" });
  }
});

router.post("/rag-query", requireAuth, async (req, res) => {
  try {
    const { query, caseId } = req.body;
    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }
    const result = await synseekrClient.ragQuery(query, caseId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run RAG query" });
  }
});

router.post("/run-investigation", requireAuth, async (req, res) => {
  try {
    const { caseId } = req.body;
    if (!caseId) {
      return res.status(400).json({ error: "caseId is required" });
    }
    const result = await synseekrClient.runInvestigation(caseId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run investigation" });
  }
});

router.post("/detect-contradictions", requireAuth, async (req, res) => {
  try {
    const { caseId } = req.body;
    if (!caseId) {
      return res.status(400).json({ error: "caseId is required" });
    }
    const result = await synseekrClient.detectContradictions(caseId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to detect contradictions" });
  }
});

router.get("/entities/:caseId", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.extractEntities(req.params.caseId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to extract entities" });
  }
});

router.get("/timeline/:caseId", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.getTimelineEvents(req.params.caseId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get timeline" });
  }
});

router.get("/search", requireAuth, async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: "q parameter is required" });
    }
    const result = await synseekrClient.searchDocuments(query);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to search documents" });
  }
});

router.post("/run-agent", requireAuth, async (req, res) => {
  try {
    const { agentName, caseId } = req.body;
    if (!agentName || !caseId) {
      return res.status(400).json({ error: "agentName and caseId are required" });
    }
    const result = await synseekrClient.runAgent(agentName, caseId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run agent" });
  }
});

router.get("/metrics", requireAdmin, async (_req, res) => {
  try {
    const result = await synseekrClient.getSystemMetrics();
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get system metrics" });
  }
});

router.post("/analysis/queue", requireAuth, async (req, res) => {
  try {
    const { documentId } = req.body;
    if (!documentId) {
      return res.status(400).json({ error: "documentId is required" });
    }
    const result = await synseekrClient.queueAnalysis(documentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to queue analysis" });
  }
});

router.get("/analysis/:documentId", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.getAnalysisResults(req.params.documentId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get analysis results" });
  }
});

router.get("/hot-documents/:caseId", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.getHotDocuments(req.params.caseId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get hot documents" });
  }
});

router.get("/privilege-review/:caseId", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.getPrivilegeReview(req.params.caseId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get privilege review" });
  }
});

router.get("/documents/:documentId/verify", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.verifyDocumentIntegrity(req.params.documentId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to verify document integrity" });
  }
});

router.get("/documents/:documentId/custody-chain", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.getDocumentCustodyChain(req.params.documentId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get custody chain" });
  }
});

router.get("/documents/:documentId/export-court", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.exportForCourt(req.params.documentId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to export for court" });
  }
});

router.post("/memory/sessions", requireAuth, async (req, res) => {
  try {
    const { caseId, title } = req.body;
    const result = await synseekrClient.createMemorySession(caseId, title);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create memory session" });
  }
});

router.get("/memory/sessions/:sessionId/messages", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.getMemorySessionMessages(req.params.sessionId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get session messages" });
  }
});

router.post("/memory/semantic-search", requireAuth, async (req, res) => {
  try {
    const { query, caseId, limit } = req.body;
    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }
    const result = await synseekrClient.semanticMemorySearch(query, caseId, limit);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to search memory" });
  }
});

router.post("/smart-search", requireAuth, async (req, res) => {
  try {
    const { query, caseId } = req.body;
    if (!query || !caseId) {
      return res.status(400).json({ error: "query and caseId are required" });
    }
    const result = await synseekrClient.smartSearch(query, caseId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to run smart search" });
  }
});

router.post("/pii/detect", requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
    const result = await synseekrClient.detectPII(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to detect PII" });
  }
});

router.post("/pii/anonymize", requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
    const result = await synseekrClient.anonymizePII(text);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to anonymize PII" });
  }
});

router.post("/analyze-all", requireAuth, async (req, res) => {
  try {
    const { query, caseId } = req.body;
    if (!query || !caseId) {
      return res.status(400).json({ error: "query and caseId are required" });
    }
    const result = await synseekrClient.analyzeAll(query, caseId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to analyze all" });
  }
});

router.get("/documents/:documentId/full-analysis", requireAuth, async (req, res) => {
  try {
    const result = await synseekrClient.getFullAnalysis(req.params.documentId);
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get full analysis" });
  }
});

router.get("/gpu-status", requireAdmin, async (_req, res) => {
  try {
    const result = await synseekrClient.getGPUStatus();
    if (!result.success) {
      return res.status(result.statusCode || 503).json({ error: result.error });
    }
    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to get GPU status" });
  }
});

export default router;
