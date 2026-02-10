import { getRegistryModel, getLocalModels, getAvailableModels, getPreferredLocalFallback, resolveModelId, type ModelRegistryEntry } from "../config/model-registry";
import { logger } from "../utils/logger";

export type RuntimeMode = "online" | "batmode";
export type PayloadClassification = "raw" | "derived" | "sanitized" | "public";
export type CasePolicy = "privileged" | "sealed" | "pii_heavy" | "confidential" | "standard";
export type RedactionStatus = "not_run" | "passed" | "failed";

export interface PolicyRequest {
  mode: RuntimeMode;
  requestedModelId: string;
  casePolicy?: CasePolicy;
  payloadClassification?: PayloadClassification;
  redactionStatus?: RedactionStatus;
  userId?: string;
  matterId?: string;
  caller?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  effectiveModelId: string;
  effectiveProvider: string;
  requiredSteps: string[];
  reason: string;
  wasFallback: boolean;
  originalModelId: string;
}

let currentMode: RuntimeMode = "online";
let selectedModelId: string = "claude-sonnet-4-5";

export function getMode(): RuntimeMode {
  return currentMode;
}

export function setMode(mode: RuntimeMode): void {
  const previous = currentMode;
  currentMode = mode;
  logger.info(`[policy-engine] Mode changed: ${previous} -> ${mode}`);
}

export function getSelectedModel(): string {
  return selectedModelId;
}

export function setSelectedModel(modelId: string): void {
  selectedModelId = resolveModelId(modelId);
  logger.info(`[policy-engine] Selected model changed to: ${selectedModelId}`);
}

export function evaluatePolicy(request: PolicyRequest): PolicyDecision {
  const { mode, requestedModelId, casePolicy, payloadClassification, redactionStatus } = request;
  const model = getRegistryModel(requestedModelId);

  if (!model) {
    const fallback = findFallbackModel(mode);
    return {
      allowed: !!fallback,
      effectiveModelId: fallback?.modelId || "claude-sonnet-4-5",
      effectiveProvider: fallback?.provider || "anthropic",
      requiredSteps: [],
      reason: `Model "${requestedModelId}" not found in registry. ${fallback ? `Using fallback: ${fallback.displayName}` : "No fallback available."}`,
      wasFallback: true,
      originalModelId: requestedModelId,
    };
  }

  if (mode === "batmode") {
    if (model.requiresInternet) {
      const localFallback = findFallbackModel("batmode");
      if (localFallback) {
        return {
          allowed: true,
          effectiveModelId: localFallback.modelId,
          effectiveProvider: localFallback.provider,
          requiredSteps: [],
          reason: `BATMODE active. ${model.displayName} requires internet. Using local model: ${localFallback.displayName}`,
          wasFallback: true,
          originalModelId: requestedModelId,
        };
      }
      return {
        allowed: false,
        effectiveModelId: requestedModelId,
        effectiveProvider: model.provider,
        requiredSteps: [],
        reason: "BATMODE active. No local models available. Cannot process request offline.",
        wasFallback: false,
        originalModelId: requestedModelId,
      };
    }
    return {
      allowed: true,
      effectiveModelId: model.modelId,
      effectiveProvider: model.provider,
      requiredSteps: [],
      reason: "BATMODE active. Local model approved.",
      wasFallback: false,
      originalModelId: requestedModelId,
    };
  }

  if (!model.available) {
    const fallback = findFallbackModel(mode);
    return {
      allowed: !!fallback,
      effectiveModelId: fallback?.modelId || requestedModelId,
      effectiveProvider: fallback?.provider || model.provider,
      requiredSteps: [],
      reason: `${model.displayName} not available (missing API key). ${fallback ? `Using fallback: ${fallback.displayName}` : "No fallback."}`,
      wasFallback: true,
      originalModelId: requestedModelId,
    };
  }

  const effectivePolicy = casePolicy || "standard";
  const effectivePayload = payloadClassification || "derived";
  const requiredSteps: string[] = [];

  if (model.providerType === "external_api") {
    if (effectivePolicy === "privileged" || effectivePolicy === "sealed") {
      const localFallback = findFallbackModel("batmode");
      if (localFallback) {
        return {
          allowed: true,
          effectiveModelId: localFallback.modelId,
          effectiveProvider: localFallback.provider,
          requiredSteps: [],
          reason: `Case is ${effectivePolicy}. External models blocked. Using local: ${localFallback.displayName}`,
          wasFallback: true,
          originalModelId: requestedModelId,
        };
      }
      return {
        allowed: false,
        effectiveModelId: requestedModelId,
        effectiveProvider: model.provider,
        requiredSteps: effectivePayload === "raw" ? ["redact", "sanitize"] : [],
        reason: `Case is ${effectivePolicy}. External models blocked and no local models available. Cannot process request.`,
        wasFallback: false,
        originalModelId: requestedModelId,
      };
    }

    if (effectivePayload === "raw" && model.dataPolicy !== "unrestricted") {
      if (redactionStatus === "not_run" || !redactionStatus) {
        requiredSteps.push("redact");
      } else if (redactionStatus === "failed") {
        return {
          allowed: false,
          effectiveModelId: requestedModelId,
          effectiveProvider: model.provider,
          requiredSteps: ["redact"],
          reason: "Redaction failed. Cannot send raw data to external API. Fix redaction or switch to a local model.",
          wasFallback: false,
          originalModelId: requestedModelId,
        };
      }
    }

    if (effectivePolicy === "pii_heavy" && effectivePayload !== "sanitized") {
      requiredSteps.push("pii_wash");
    }
  }

  return {
    allowed: true,
    effectiveModelId: model.modelId,
    effectiveProvider: model.provider,
    requiredSteps,
    reason: requiredSteps.length > 0
      ? `Approved with conditions: ${requiredSteps.join(", ")} required before processing.`
      : "Approved. Model and policy compatible.",
    wasFallback: false,
    originalModelId: requestedModelId,
  };
}

function findFallbackModel(mode: RuntimeMode): ModelRegistryEntry | undefined {
  if (mode === "batmode") {
    return getPreferredLocalFallback();
  }
  const preferred = getPreferredLocalFallback();
  if (preferred) return preferred;
  const available = getAvailableModels();
  return available.find((m) => m.capabilities.includes("chat")) || available[0];
}

export interface PolicyAuditEntry {
  timestamp: string;
  userId?: string;
  matterId?: string;
  caller?: string;
  mode: RuntimeMode;
  requestedModelId: string;
  effectiveModelId: string;
  allowed: boolean;
  wasFallback: boolean;
  reason: string;
  externalCallMade: boolean;
  requiredSteps: string[];
}

const policyAuditLog: PolicyAuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 500;

export function recordPolicyDecision(request: PolicyRequest, decision: PolicyDecision): void {
  const entry: PolicyAuditEntry = {
    timestamp: new Date().toISOString(),
    userId: request.userId,
    matterId: request.matterId,
    caller: request.caller,
    mode: request.mode,
    requestedModelId: decision.originalModelId,
    effectiveModelId: decision.effectiveModelId,
    allowed: decision.allowed,
    wasFallback: decision.wasFallback,
    reason: decision.reason,
    externalCallMade: decision.allowed && getRegistryModel(decision.effectiveModelId)?.requiresInternet === true,
    requiredSteps: decision.requiredSteps,
  };
  policyAuditLog.push(entry);
  if (policyAuditLog.length > MAX_AUDIT_ENTRIES) {
    policyAuditLog.shift();
  }
}

export function getPolicyAuditLog(limit = 50): PolicyAuditEntry[] {
  if (limit <= 0) return [];
  return policyAuditLog.slice(-limit).reverse();
}

export function getPolicyState() {
  return {
    mode: currentMode,
    selectedModelId,
    modeLabel: currentMode === "batmode" ? "BATMODE — OFFLINE PRIVATE" : "ONLINE",
  };
}
