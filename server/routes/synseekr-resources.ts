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

function requireAdminAuth(req: any, res: any, next: any) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

interface ProviderConnectionStatus {
  id: string;
  name: string;
  provider: string;
  connected: boolean;
  managed: "replit" | "user";
  description: string;
  envKey: string;
  maskedKey?: string;
  hasReplitFallback?: boolean;
}

function maskKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  if (key.length <= 8) return "••••";
  return "••••••••" + key.slice(-4);
}

function getActiveKey(providerId: string): string | undefined {
  switch (providerId) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    case "gemini":
      return process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY;
    default:
      return undefined;
  }
}

function getKeySource(providerId: string): "user" | "replit" | "none" {
  switch (providerId) {
    case "anthropic":
      if (process.env.ANTHROPIC_API_KEY) return "user";
      if (process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY) return "replit";
      return "none";
    case "gemini":
      if (process.env.GEMINI_API_KEY) return "user";
      if (process.env.AI_INTEGRATIONS_GEMINI_API_KEY) return "replit";
      return "none";
    case "openai":
      if (process.env.OPENAI_API_KEY) return "user";
      if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY) return "replit";
      return "none";
    case "deepseek":
      if (process.env.DEEPSEEK_API_KEY) return "user";
      return "none";
    default:
      return "none";
  }
}

function getProviderConnections(): ProviderConnectionStatus[] {
  const providers = [
    {
      id: "anthropic",
      name: "Anthropic (Claude)",
      provider: "anthropic",
      description: "Claude Sonnet, Opus, Haiku models for legal analysis and document processing",
      envKey: "ANTHROPIC_API_KEY",
    },
    {
      id: "gemini",
      name: "Google (Gemini)",
      provider: "gemini",
      description: "Gemini Flash and Pro models for fast, cost-effective AI tasks",
      envKey: "GEMINI_API_KEY",
    },
    {
      id: "openai",
      name: "OpenAI (GPT)",
      provider: "openai",
      description: "GPT-4o, GPT-5 series for general-purpose AI, code generation, and analysis",
      envKey: "OPENAI_API_KEY",
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      provider: "deepseek",
      description: "DeepSeek Chat and Coder for cost-effective AI reasoning and code",
      envKey: "DEEPSEEK_API_KEY",
    },
  ];

  return providers.map((p) => {
    const activeKey = getActiveKey(p.id);
    const source = getKeySource(p.id);
    return {
      ...p,
      connected: !!activeKey,
      managed: source === "replit" ? "replit" as const : "user" as const,
      maskedKey: maskKey(activeKey),
      hasReplitFallback: source === "replit" || (source === "user" && !!getReplitKey(p.id)),
    };
  });
}

function getReplitKey(providerId: string): string | undefined {
  switch (providerId) {
    case "anthropic": return process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    case "gemini": return process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    case "openai": return process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    default: return undefined;
  }
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

  app.get("/api/ai-connections", requireAuth, (req: Request, res: Response) => {
    try {
      const connections = getProviderConnections();
      const isAdmin = (req as any).user?.role === "admin";
      const safeConnections = connections.map((c) => ({
        ...c,
        maskedKey: isAdmin ? c.maskedKey : undefined,
      }));
      res.json({ connections: safeConnections, isAdmin });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI connections" });
    }
  });

  app.post("/api/ai-connections/:providerId/key", requireAdminAuth, (req: Request, res: Response) => {
    try {
      const providerId = req.params.providerId as string;
      const { apiKey } = req.body;

      if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
        return res.status(400).json({ error: "Please provide a valid API key (minimum 10 characters)" });
      }

      const providerEnvKeys: Record<string, string> = {
        anthropic: "ANTHROPIC_API_KEY",
        gemini: "GEMINI_API_KEY",
        openai: "OPENAI_API_KEY",
        deepseek: "DEEPSEEK_API_KEY",
      };

      const envKey = providerEnvKeys[providerId];
      if (!envKey) {
        return res.status(400).json({ error: "Unknown provider" });
      }

      process.env[envKey] = apiKey.trim();

      res.json({
        success: true,
        provider: providerId,
        connected: true,
        maskedKey: maskKey(apiKey.trim()),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to save API key" });
    }
  });

  app.delete("/api/ai-connections/:providerId/key", requireAdminAuth, (req: Request, res: Response) => {
    try {
      const providerId = req.params.providerId as string;

      const providerEnvKeys: Record<string, string> = {
        anthropic: "ANTHROPIC_API_KEY",
        gemini: "GEMINI_API_KEY",
        openai: "OPENAI_API_KEY",
        deepseek: "DEEPSEEK_API_KEY",
      };

      const envKey = providerEnvKeys[providerId];
      if (!envKey) {
        return res.status(400).json({ error: "Unknown provider" });
      }

      delete process.env[envKey];

      const stillConnected = !!getActiveKey(providerId);
      res.json({ success: true, provider: providerId, connected: stillConnected });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove API key" });
    }
  });

  app.post("/api/ai-connections/:providerId/test", requireAdminAuth, async (req: Request, res: Response) => {
    try {
      const providerId = req.params.providerId as string;

      const activeKey = getActiveKey(providerId);
      if (!activeKey) {
        return res.json({ success: false, error: "API key not configured" });
      }

      const testFns: Record<string, () => Promise<boolean>> = {
        anthropic: async () => {
          const Anthropic = (await import("@anthropic-ai/sdk")).default;
          const client = new Anthropic({ apiKey: activeKey });
          const result = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 10,
            messages: [{ role: "user", content: "Say ok" }],
          });
          return !!result.content;
        },
        gemini: async () => {
          const { GoogleGenAI } = await import("@google/genai");
          const client = new GoogleGenAI({ apiKey: activeKey });
          const result = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Say ok",
          });
          return !!result.text;
        },
        openai: async () => {
          const OpenAI = (await import("openai")).default;
          const client = new OpenAI({ apiKey: activeKey });
          const result = await client.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: 10,
            messages: [{ role: "user", content: "Say ok" }],
          });
          return !!result.choices?.[0]?.message?.content;
        },
        deepseek: async () => {
          const OpenAI = (await import("openai")).default;
          const client = new OpenAI({
            apiKey: activeKey,
            baseURL: "https://api.deepseek.com/v1",
          });
          const result = await client.chat.completions.create({
            model: "deepseek-chat",
            max_tokens: 10,
            messages: [{ role: "user", content: "Say ok" }],
          });
          return !!result.choices?.[0]?.message?.content;
        },
      };

      const testFn = testFns[providerId];
      if (!testFn) {
        return res.status(400).json({ error: "Unknown provider" });
      }

      const startTime = Date.now();
      const ok = await testFn();
      const latencyMs = Date.now() - startTime;

      res.json({ success: ok, latencyMs });
    } catch (error: any) {
      res.json({ success: false, error: error.message || "Connection test failed" });
    }
  });
}
