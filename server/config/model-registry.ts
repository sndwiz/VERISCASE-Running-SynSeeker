export type ProviderType = "external_api" | "local_runner" | "synseekr";
export type DataPolicy = "local_only" | "sanitized_ok" | "unrestricted";
export type ModelCapability = "chat" | "embeddings" | "vision" | "rerank" | "transcription" | "code" | "ner" | "rel_extraction" | "pii_detection" | "document_analysis" | "rag";

export interface ModelRegistryEntry {
  modelId: string;
  displayName: string;
  provider: string;
  providerType: ProviderType;
  capabilities: ModelCapability[];
  dataPolicy: DataPolicy;
  requiresInternet: boolean;
  maxContext: number;
  maxTokens: number;
  costHint: "free" | "low" | "medium" | "high";
  latencyHint: "fast" | "medium" | "slow";
  supportsVision: boolean;
  available: boolean;
}

function checkEnv(key: string): boolean {
  return !!process.env[key];
}

export function buildModelRegistry(): ModelRegistryEntry[] {
  return [
    {
      modelId: "claude-sonnet-4-5",
      displayName: "Claude Sonnet 4.5",
      provider: "anthropic",
      providerType: "external_api",
      capabilities: ["chat", "vision", "code"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 200000,
      maxTokens: 8192,
      costHint: "medium",
      latencyHint: "medium",
      supportsVision: true,
      available: checkEnv("AI_INTEGRATIONS_ANTHROPIC_API_KEY"),
    },
    {
      modelId: "claude-3-5-sonnet-20241022",
      displayName: "Claude 3.5 Sonnet",
      provider: "anthropic",
      providerType: "external_api",
      capabilities: ["chat", "vision", "code"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 200000,
      maxTokens: 8192,
      costHint: "medium",
      latencyHint: "medium",
      supportsVision: true,
      available: checkEnv("AI_INTEGRATIONS_ANTHROPIC_API_KEY"),
    },
    {
      modelId: "claude-3-opus-20240229",
      displayName: "Claude 3 Opus",
      provider: "anthropic",
      providerType: "external_api",
      capabilities: ["chat", "vision", "code"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 200000,
      maxTokens: 4096,
      costHint: "high",
      latencyHint: "slow",
      supportsVision: true,
      available: checkEnv("AI_INTEGRATIONS_ANTHROPIC_API_KEY"),
    },
    {
      modelId: "claude-3-haiku-20240307",
      displayName: "Claude 3 Haiku",
      provider: "anthropic",
      providerType: "external_api",
      capabilities: ["chat", "vision"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 200000,
      maxTokens: 4096,
      costHint: "low",
      latencyHint: "fast",
      supportsVision: true,
      available: checkEnv("AI_INTEGRATIONS_ANTHROPIC_API_KEY"),
    },
    {
      modelId: "gpt-5.2",
      displayName: "GPT-5.2",
      provider: "openai",
      providerType: "external_api",
      capabilities: ["chat", "vision", "code"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 128000,
      maxTokens: 16384,
      costHint: "high",
      latencyHint: "medium",
      supportsVision: true,
      available: checkEnv("AI_INTEGRATIONS_OPENAI_API_KEY"),
    },
    {
      modelId: "gpt-4o",
      displayName: "GPT-4o",
      provider: "openai",
      providerType: "external_api",
      capabilities: ["chat", "vision", "code"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 128000,
      maxTokens: 4096,
      costHint: "medium",
      latencyHint: "fast",
      supportsVision: true,
      available: checkEnv("AI_INTEGRATIONS_OPENAI_API_KEY"),
    },
    {
      modelId: "gpt-4o-mini",
      displayName: "GPT-4o Mini",
      provider: "openai",
      providerType: "external_api",
      capabilities: ["chat", "vision"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 128000,
      maxTokens: 4096,
      costHint: "low",
      latencyHint: "fast",
      supportsVision: true,
      available: checkEnv("AI_INTEGRATIONS_OPENAI_API_KEY"),
    },
    {
      modelId: "gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      provider: "gemini",
      providerType: "external_api",
      capabilities: ["chat", "vision"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 1000000,
      maxTokens: 8192,
      costHint: "low",
      latencyHint: "fast",
      supportsVision: true,
      available: checkEnv("AI_INTEGRATIONS_GEMINI_API_KEY"),
    },
    {
      modelId: "gemini-2.5-pro",
      displayName: "Gemini 2.5 Pro",
      provider: "gemini",
      providerType: "external_api",
      capabilities: ["chat", "vision"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 1000000,
      maxTokens: 8192,
      costHint: "medium",
      latencyHint: "medium",
      supportsVision: true,
      available: checkEnv("AI_INTEGRATIONS_GEMINI_API_KEY"),
    },
    {
      modelId: "gemini-3-flash-preview",
      displayName: "Gemini 3 Flash",
      provider: "gemini",
      providerType: "external_api",
      capabilities: ["chat", "vision"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 1000000,
      maxTokens: 8192,
      costHint: "low",
      latencyHint: "fast",
      supportsVision: true,
      available: checkEnv("AI_INTEGRATIONS_GEMINI_API_KEY"),
    },
    {
      modelId: "deepseek-chat",
      displayName: "DeepSeek Chat",
      provider: "deepseek",
      providerType: "external_api",
      capabilities: ["chat", "code"],
      dataPolicy: "sanitized_ok",
      requiresInternet: true,
      maxContext: 64000,
      maxTokens: 4096,
      costHint: "low",
      latencyHint: "medium",
      supportsVision: false,
      available: checkEnv("DEEPSEEK_API_KEY"),
    },
    {
      modelId: "synseekr-qwen2.5-7b",
      displayName: "SynSeekr Qwen2.5 7B",
      provider: "synseekr",
      providerType: "synseekr",
      capabilities: ["chat", "rag", "document_analysis", "code"],
      dataPolicy: "local_only",
      requiresInternet: false,
      maxContext: 32768,
      maxTokens: 8192,
      costHint: "free",
      latencyHint: "medium",
      supportsVision: false,
      available: checkEnv("SYNSEEKR_URL"),
    },
    {
      modelId: "synseekr-bge-m3",
      displayName: "SynSeekr BGE-M3 Embeddings",
      provider: "synseekr",
      providerType: "synseekr",
      capabilities: ["embeddings", "rerank"],
      dataPolicy: "local_only",
      requiresInternet: false,
      maxContext: 8192,
      maxTokens: 0,
      costHint: "free",
      latencyHint: "fast",
      supportsVision: false,
      available: checkEnv("SYNSEEKR_URL"),
    },
    {
      modelId: "synseekr-whisper",
      displayName: "SynSeekr Whisper (Audio)",
      provider: "synseekr",
      providerType: "synseekr",
      capabilities: ["transcription"],
      dataPolicy: "local_only",
      requiresInternet: false,
      maxContext: 0,
      maxTokens: 0,
      costHint: "free",
      latencyHint: "slow",
      supportsVision: false,
      available: checkEnv("SYNSEEKR_URL"),
    },
    {
      modelId: "synseekr-gliner",
      displayName: "SynSeekr GLiNER (NER)",
      provider: "synseekr",
      providerType: "synseekr",
      capabilities: ["ner", "rel_extraction"],
      dataPolicy: "local_only",
      requiresInternet: false,
      maxContext: 0,
      maxTokens: 0,
      costHint: "free",
      latencyHint: "fast",
      supportsVision: false,
      available: checkEnv("SYNSEEKR_URL"),
    },
    {
      modelId: "synseekr-presidio",
      displayName: "SynSeekr Presidio (PII)",
      provider: "synseekr",
      providerType: "synseekr",
      capabilities: ["pii_detection"],
      dataPolicy: "local_only",
      requiresInternet: false,
      maxContext: 0,
      maxTokens: 0,
      costHint: "free",
      latencyHint: "fast",
      supportsVision: false,
      available: checkEnv("SYNSEEKR_URL"),
    },
    {
      modelId: "synergy-private",
      displayName: "Synergy Private LLM",
      provider: "private",
      providerType: "local_runner",
      capabilities: ["chat"],
      dataPolicy: "local_only",
      requiresInternet: false,
      maxContext: 32768,
      maxTokens: 4096,
      costHint: "free",
      latencyHint: "medium",
      supportsVision: false,
      available: checkEnv("PRIVATE_AI_SERVER_URL"),
    },
  ];
}

export const MODEL_REGISTRY = buildModelRegistry();

const LEGACY_MODEL_ALIASES: Record<string, string> = {
  "synergy-default": "synseekr-qwen2.5-7b",
  "synergy-legal": "synseekr-qwen2.5-7b",
  "synergy-research": "synseekr-qwen2.5-7b",
  "synseekr-default": "synseekr-qwen2.5-7b",
};

export function resolveModelId(modelId: string): string {
  return LEGACY_MODEL_ALIASES[modelId] || modelId;
}

export function getRegistryModel(modelId: string): ModelRegistryEntry | undefined {
  const resolved = resolveModelId(modelId);
  return MODEL_REGISTRY.find((m) => m.modelId === resolved);
}

export function getAvailableModels(): ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((m) => m.available);
}

export function getLocalModels(): ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((m) => !m.requiresInternet && m.available);
}

export function getExternalModels(): ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((m) => m.requiresInternet && m.available);
}

export function getSynSeekrModels(): ModelRegistryEntry[] {
  return MODEL_REGISTRY.filter((m) => m.providerType === "synseekr" && m.available);
}

export function getSynSeekrChatModel(): ModelRegistryEntry | undefined {
  return MODEL_REGISTRY.find((m) => m.providerType === "synseekr" && m.available && m.capabilities.includes("chat"));
}

export function getPreferredLocalFallback(): ModelRegistryEntry | undefined {
  const synseekrChat = getSynSeekrChatModel();
  if (synseekrChat) return synseekrChat;
  const locals = getLocalModels();
  return locals.find((m) => m.capabilities.includes("chat")) || locals[0];
}
