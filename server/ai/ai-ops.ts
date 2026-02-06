import { createHash } from "crypto";
import { logger } from "../utils/logger";

export interface AIOpRecord {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  operation: string;
  inputHash: string;
  outputHash: string;
  inputTokensEst: number;
  outputTokensEst: number;
  costEstUsd: number;
  latencyMs: number;
  status: "success" | "error";
  errorMessage?: string;
  caller: string;
  metadata?: Record<string, unknown>;
}

export interface AIOpsSummary {
  totalCalls: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  successRate: number;
  byModel: Record<string, { calls: number; costUsd: number; avgLatencyMs: number; errorCount: number }>;
  byOperation: Record<string, { calls: number; costUsd: number; avgLatencyMs: number }>;
  recentErrors: Array<{ timestamp: string; model: string; operation: string; error: string }>;
  last24hCalls: number;
  last24hCostUsd: number;
}

const MODEL_RATES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-3-5-sonnet-20241022": { input: 3.0, output: 15.0 },
  "claude-3-opus-20240229": { input: 15.0, output: 75.0 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  "gpt-5.2": { input: 5.0, output: 15.0 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gemini-2.5-flash": { input: 0.075, output: 0.30 },
  "gemini-2.5-pro": { input: 1.25, output: 5.0 },
  "gemini-3-flash-preview": { input: 0.1, output: 0.4 },
};

const MAX_RECORDS = 500;
let opRecords: AIOpRecord[] = [];
let opIdCounter = 0;

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function hashContent(content: string): string {
  if (!content) return "empty";
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = MODEL_RATES[model] || { input: 1.0, output: 3.0 };
  return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

export function startAIOp(
  provider: string,
  model: string,
  operation: string,
  inputContent: string,
  caller: string,
  metadata?: Record<string, unknown>
): { id: string; startTime: number } {
  opIdCounter++;
  const id = `aiop_${Date.now()}_${opIdCounter}`;
  const startTime = performance.now();

  const record: AIOpRecord = {
    id,
    timestamp: new Date().toISOString(),
    provider,
    model,
    operation,
    inputHash: hashContent(inputContent),
    outputHash: "",
    inputTokensEst: estimateTokens(inputContent),
    outputTokensEst: 0,
    costEstUsd: 0,
    latencyMs: 0,
    status: "success",
    caller,
    metadata,
  };

  opRecords.push(record);
  if (opRecords.length > MAX_RECORDS) {
    opRecords = opRecords.slice(-MAX_RECORDS);
  }

  return { id, startTime };
}

export function completeAIOp(
  id: string,
  startTime: number,
  outputContent: string,
  status: "success" | "error" = "success",
  errorMessage?: string
): void {
  const record = opRecords.find((r) => r.id === id);
  if (!record) return;

  const latencyMs = Math.round(performance.now() - startTime);
  const outputTokensEst = estimateTokens(outputContent);
  const costEstUsd = estimateCost(record.model, record.inputTokensEst, outputTokensEst);

  record.outputHash = hashContent(outputContent);
  record.outputTokensEst = outputTokensEst;
  record.costEstUsd = costEstUsd;
  record.latencyMs = latencyMs;
  record.status = status;
  record.errorMessage = errorMessage;

  logger.info("AI op completed", {
    id,
    model: record.model,
    operation: record.operation,
    latencyMs,
    inputTokens: record.inputTokensEst,
    outputTokens: outputTokensEst,
    costUsd: costEstUsd.toFixed(6),
    status,
    caller: record.caller,
  });
}

export function getAIOpsRecords(limit = 50, offset = 0): AIOpRecord[] {
  const sorted = [...opRecords].reverse();
  return sorted.slice(offset, offset + limit);
}

export function getAIOpsSummary(): AIOpsSummary {
  const now = Date.now();
  const last24h = now - 24 * 60 * 60 * 1000;

  const totalCalls = opRecords.length;
  const totalCostUsd = opRecords.reduce((sum, r) => sum + r.costEstUsd, 0);
  const totalLatency = opRecords.reduce((sum, r) => sum + r.latencyMs, 0);
  const successCount = opRecords.filter((r) => r.status === "success").length;

  const byModel: AIOpsSummary["byModel"] = {};
  const byOperation: AIOpsSummary["byOperation"] = {};
  const recentErrors: AIOpsSummary["recentErrors"] = [];

  let last24hCalls = 0;
  let last24hCostUsd = 0;

  for (const r of opRecords) {
    const ts = new Date(r.timestamp).getTime();
    if (ts > last24h) {
      last24hCalls++;
      last24hCostUsd += r.costEstUsd;
    }

    if (!byModel[r.model]) {
      byModel[r.model] = { calls: 0, costUsd: 0, avgLatencyMs: 0, errorCount: 0 };
    }
    byModel[r.model].calls++;
    byModel[r.model].costUsd += r.costEstUsd;
    byModel[r.model].avgLatencyMs += r.latencyMs;
    if (r.status === "error") byModel[r.model].errorCount++;

    if (!byOperation[r.operation]) {
      byOperation[r.operation] = { calls: 0, costUsd: 0, avgLatencyMs: 0 };
    }
    byOperation[r.operation].calls++;
    byOperation[r.operation].costUsd += r.costEstUsd;
    byOperation[r.operation].avgLatencyMs += r.latencyMs;

    if (r.status === "error" && r.errorMessage) {
      recentErrors.push({
        timestamp: r.timestamp,
        model: r.model,
        operation: r.operation,
        error: r.errorMessage,
      });
    }
  }

  for (const model of Object.keys(byModel)) {
    if (byModel[model].calls > 0) {
      byModel[model].avgLatencyMs = Math.round(byModel[model].avgLatencyMs / byModel[model].calls);
    }
  }
  for (const op of Object.keys(byOperation)) {
    if (byOperation[op].calls > 0) {
      byOperation[op].avgLatencyMs = Math.round(byOperation[op].avgLatencyMs / byOperation[op].calls);
    }
  }

  return {
    totalCalls,
    totalCostUsd,
    avgLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
    successRate: totalCalls > 0 ? (successCount / totalCalls) * 100 : 100,
    byModel,
    byOperation,
    recentErrors: recentErrors.slice(-10).reverse(),
    last24hCalls,
    last24hCostUsd,
  };
}
