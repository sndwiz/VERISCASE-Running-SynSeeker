import { db } from "../db";
import { modelIntelligenceEntries, modelRecommendations, modelAlerts } from "@shared/models/tables";
import { eq, desc, and } from "drizzle-orm";
import { logger } from "../utils/logger";
import { MODEL_REGISTRY, getRegistryModel } from "../config/model-registry";

export interface ModelIntelKnowledgeEntry {
  modelId: string;
  displayName: string;
  provider: string;
  category: string;
  capabilities: string[];
  license: string;
  parameterSize: string;
  quantization?: string;
  contextWindow: number;
  qualityScores: Record<string, number>;
  tasksRecommended: string[];
  replacesModelId?: string;
  releasedAt?: string;
  sourceUrl?: string;
  notes?: string;
}

export interface TaskRecommendation {
  taskType: string;
  modelId: string;
  rank: number;
  reason: string;
  performanceNotes?: string;
  sizeEfficiency?: string;
  isCurrentBest: boolean;
}

const CURATED_KNOWLEDGE: ModelIntelKnowledgeEntry[] = [
  {
    modelId: "qwen2.5-7b",
    displayName: "Qwen 2.5 7B",
    provider: "alibaba",
    category: "chat",
    capabilities: ["chat", "code", "rag", "document_analysis"],
    license: "Apache 2.0",
    parameterSize: "7B",
    contextWindow: 131072,
    qualityScores: { general: 78, coding: 75, reasoning: 72, legal: 70 },
    tasksRecommended: ["general_chat", "document_analysis", "code_generation", "rag_queries"],
    releasedAt: "2024-09-19",
    sourceUrl: "https://huggingface.co/Qwen/Qwen2.5-7B-Instruct",
    notes: "Excellent balance of quality and efficiency for 7B class. Strong multilingual support.",
  },
  {
    modelId: "qwen2.5-14b",
    displayName: "Qwen 2.5 14B",
    provider: "alibaba",
    category: "chat",
    capabilities: ["chat", "code", "rag", "document_analysis"],
    license: "Apache 2.0",
    parameterSize: "14B",
    contextWindow: 131072,
    qualityScores: { general: 83, coding: 80, reasoning: 79, legal: 76 },
    tasksRecommended: ["general_chat", "document_analysis", "code_generation", "legal_analysis"],
    replacesModelId: "qwen2.5-7b",
    releasedAt: "2024-09-19",
    sourceUrl: "https://huggingface.co/Qwen/Qwen2.5-14B-Instruct",
    notes: "Significant quality jump over 7B with manageable resource increase. Recommended upgrade path.",
  },
  {
    modelId: "qwen2.5-32b",
    displayName: "Qwen 2.5 32B",
    provider: "alibaba",
    category: "chat",
    capabilities: ["chat", "code", "rag", "document_analysis", "vision"],
    license: "Apache 2.0",
    parameterSize: "32B",
    contextWindow: 131072,
    qualityScores: { general: 87, coding: 85, reasoning: 84, legal: 82 },
    tasksRecommended: ["complex_reasoning", "legal_analysis", "document_analysis", "code_generation"],
    replacesModelId: "qwen2.5-14b",
    releasedAt: "2024-09-19",
    sourceUrl: "https://huggingface.co/Qwen/Qwen2.5-32B-Instruct",
    notes: "Near frontier-level quality. Requires 40GB+ VRAM. Best self-hosted option for complex legal reasoning.",
  },
  {
    modelId: "qwen3-8b",
    displayName: "Qwen 3 8B",
    provider: "alibaba",
    category: "chat",
    capabilities: ["chat", "code", "rag", "document_analysis"],
    license: "Apache 2.0",
    parameterSize: "8B",
    contextWindow: 131072,
    qualityScores: { general: 82, coding: 80, reasoning: 78, legal: 75 },
    tasksRecommended: ["general_chat", "code_generation", "rag_queries", "document_analysis"],
    replacesModelId: "qwen2.5-7b",
    releasedAt: "2025-04-29",
    sourceUrl: "https://huggingface.co/Qwen/Qwen3-8B",
    notes: "Next-gen Qwen with thinking mode. Direct upgrade for Qwen2.5-7B with better reasoning at similar size.",
  },
  {
    modelId: "llama-3.3-70b",
    displayName: "Llama 3.3 70B",
    provider: "meta",
    category: "chat",
    capabilities: ["chat", "code", "document_analysis"],
    license: "Llama 3.3 Community",
    parameterSize: "70B",
    contextWindow: 131072,
    qualityScores: { general: 88, coding: 86, reasoning: 85, legal: 80 },
    tasksRecommended: ["complex_reasoning", "code_generation", "document_analysis"],
    releasedAt: "2024-12-06",
    sourceUrl: "https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct",
    notes: "Top-tier open model. Requires 48GB+ VRAM or quantization. Excellent for complex analysis.",
  },
  {
    modelId: "mistral-small-24b",
    displayName: "Mistral Small 3.1 24B",
    provider: "mistral",
    category: "chat",
    capabilities: ["chat", "code", "vision"],
    license: "Apache 2.0",
    parameterSize: "24B",
    contextWindow: 131072,
    qualityScores: { general: 82, coding: 79, reasoning: 77, legal: 72 },
    tasksRecommended: ["general_chat", "code_generation", "multimodal"],
    releasedAt: "2025-03-18",
    sourceUrl: "https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Instruct-2503",
    notes: "Strong efficiency. Vision capable. Good alternative to Qwen 14B with vision support.",
  },
  {
    modelId: "gemma-3-12b",
    displayName: "Gemma 3 12B",
    provider: "google",
    category: "chat",
    capabilities: ["chat", "code", "vision"],
    license: "Gemma License",
    parameterSize: "12B",
    contextWindow: 131072,
    qualityScores: { general: 79, coding: 76, reasoning: 75, legal: 70 },
    tasksRecommended: ["general_chat", "code_generation"],
    releasedAt: "2025-03-12",
    sourceUrl: "https://huggingface.co/google/gemma-3-12b-it",
    notes: "Google's latest compact model. Vision and multilingual capable.",
  },
  {
    modelId: "deepseek-r1-14b",
    displayName: "DeepSeek R1 14B (Distilled)",
    provider: "deepseek",
    category: "chat",
    capabilities: ["chat", "code", "rag"],
    license: "MIT",
    parameterSize: "14B",
    contextWindow: 131072,
    qualityScores: { general: 80, coding: 82, reasoning: 83, legal: 75 },
    tasksRecommended: ["reasoning", "code_generation", "math", "analysis"],
    releasedAt: "2025-01-20",
    sourceUrl: "https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-14B",
    notes: "Distilled from DeepSeek-R1. Exceptional reasoning for its size. MIT licensed.",
  },
  {
    modelId: "bge-m3",
    displayName: "BGE-M3",
    provider: "baai",
    category: "embeddings",
    capabilities: ["embeddings", "rerank"],
    license: "MIT",
    parameterSize: "568M",
    contextWindow: 8192,
    qualityScores: { retrieval: 90, multilingual: 92, reranking: 85 },
    tasksRecommended: ["embeddings", "semantic_search", "reranking", "rag_retrieval"],
    releasedAt: "2024-01-30",
    sourceUrl: "https://huggingface.co/BAAI/bge-m3",
    notes: "Best-in-class multilingual embeddings. Supports dense, sparse, and ColBERT retrieval.",
  },
  {
    modelId: "nomic-embed-text-v2-moe",
    displayName: "Nomic Embed Text v2 MoE",
    provider: "nomic",
    category: "embeddings",
    capabilities: ["embeddings"],
    license: "Apache 2.0",
    parameterSize: "475M",
    contextWindow: 8192,
    qualityScores: { retrieval: 88, multilingual: 80, efficiency: 92 },
    tasksRecommended: ["embeddings", "semantic_search"],
    releasedAt: "2025-02-18",
    sourceUrl: "https://huggingface.co/nomic-ai/nomic-embed-text-v2-moe",
    notes: "MoE architecture gives near BGE-M3 quality with lower compute. Good alternative.",
  },
  {
    modelId: "whisper-large-v3-turbo",
    displayName: "Whisper Large v3 Turbo",
    provider: "openai",
    category: "transcription",
    capabilities: ["transcription"],
    license: "MIT",
    parameterSize: "809M",
    contextWindow: 0,
    qualityScores: { accuracy: 88, speed: 95, multilingual: 85 },
    tasksRecommended: ["transcription", "audio_processing"],
    releasedAt: "2024-10-01",
    sourceUrl: "https://huggingface.co/openai/whisper-large-v3-turbo",
    notes: "4x faster than v3 with minimal quality loss. Best speed/quality tradeoff for transcription.",
  },
  {
    modelId: "gliner-large-v2.5",
    displayName: "GLiNER Large v2.5",
    provider: "gliner",
    category: "ner",
    capabilities: ["ner", "rel_extraction"],
    license: "Apache 2.0",
    parameterSize: "459M",
    contextWindow: 0,
    qualityScores: { ner_accuracy: 85, zero_shot: 82, legal_entities: 78 },
    tasksRecommended: ["named_entity_recognition", "relation_extraction", "legal_entity_extraction"],
    releasedAt: "2024-09-01",
    sourceUrl: "https://huggingface.co/urchade/gliner_large-v2.5",
    notes: "Zero-shot NER without fine-tuning. Supports custom entity types at inference time.",
  },
  {
    modelId: "presidio-analyzer",
    displayName: "Microsoft Presidio",
    provider: "microsoft",
    category: "pii_detection",
    capabilities: ["pii_detection"],
    license: "MIT",
    parameterSize: "N/A",
    contextWindow: 0,
    qualityScores: { pii_recall: 90, precision: 85, legal_pii: 82 },
    tasksRecommended: ["pii_detection", "pii_anonymization", "data_privacy"],
    releasedAt: "2024-01-01",
    sourceUrl: "https://github.com/microsoft/presidio",
    notes: "Rule-based + ML hybrid PII detection. Extensible with custom recognizers for legal entities.",
  },
  {
    modelId: "reranker-v2-gemma",
    displayName: "BGE Reranker v2 Gemma",
    provider: "baai",
    category: "reranking",
    capabilities: ["rerank"],
    license: "Apache 2.0",
    parameterSize: "2B",
    contextWindow: 8192,
    qualityScores: { reranking: 92, legal_docs: 85, speed: 70 },
    tasksRecommended: ["reranking", "rag_reranking", "search_improvement"],
    releasedAt: "2024-08-01",
    sourceUrl: "https://huggingface.co/BAAI/bge-reranker-v2-gemma",
    notes: "Top reranker for RAG pipelines. Use after initial retrieval to boost relevance.",
  },
];

const CURATED_RECOMMENDATIONS: TaskRecommendation[] = [
  { taskType: "general_chat", modelId: "qwen2.5-7b", rank: 1, reason: "Best quality/efficiency ratio for 7B class. Already deployed in SynSeekr.", isCurrentBest: true, sizeEfficiency: "optimal" },
  { taskType: "general_chat", modelId: "qwen3-8b", rank: 2, reason: "Next-gen upgrade with thinking mode. 5-10% better reasoning. Drop-in replacement.", isCurrentBest: false, sizeEfficiency: "optimal" },
  { taskType: "general_chat", modelId: "qwen2.5-14b", rank: 3, reason: "Significant quality jump. Requires 2x VRAM but notably better output.", isCurrentBest: false, sizeEfficiency: "good" },
  { taskType: "legal_analysis", modelId: "qwen2.5-32b", rank: 1, reason: "Best self-hosted model for complex legal reasoning. Near frontier quality.", isCurrentBest: false, sizeEfficiency: "resource_heavy" },
  { taskType: "legal_analysis", modelId: "deepseek-r1-14b", rank: 2, reason: "Exceptional reasoning for its size. MIT licensed. Good for legal chain-of-thought.", isCurrentBest: false, sizeEfficiency: "good" },
  { taskType: "legal_analysis", modelId: "qwen2.5-7b", rank: 3, reason: "Currently deployed. Adequate for simpler legal tasks.", isCurrentBest: true, sizeEfficiency: "optimal" },
  { taskType: "code_generation", modelId: "qwen2.5-7b", rank: 1, reason: "Strong coding capabilities at 7B. Already deployed.", isCurrentBest: true, sizeEfficiency: "optimal" },
  { taskType: "code_generation", modelId: "deepseek-r1-14b", rank: 2, reason: "Better code quality, especially for complex algorithms.", isCurrentBest: false, sizeEfficiency: "good" },
  { taskType: "embeddings", modelId: "bge-m3", rank: 1, reason: "Best multilingual embeddings. Dense + sparse + ColBERT. Already deployed.", isCurrentBest: true, sizeEfficiency: "optimal" },
  { taskType: "embeddings", modelId: "nomic-embed-text-v2-moe", rank: 2, reason: "MoE architecture. Near BGE-M3 quality with lower compute. Good alternative.", isCurrentBest: false, sizeEfficiency: "efficient" },
  { taskType: "transcription", modelId: "whisper-large-v3-turbo", rank: 1, reason: "4x faster than v3 with minimal quality loss. Best speed/quality ratio.", isCurrentBest: true, sizeEfficiency: "optimal" },
  { taskType: "ner", modelId: "gliner-large-v2.5", rank: 1, reason: "Zero-shot NER with custom entity types. Already deployed.", isCurrentBest: true, sizeEfficiency: "optimal" },
  { taskType: "pii_detection", modelId: "presidio-analyzer", rank: 1, reason: "Industry standard PII detection. Extensible recognizers. Already deployed.", isCurrentBest: true, sizeEfficiency: "optimal" },
  { taskType: "reranking", modelId: "bge-m3", rank: 1, reason: "Dual-purpose: embeddings + reranking. Already deployed.", isCurrentBest: true, sizeEfficiency: "optimal" },
  { taskType: "reranking", modelId: "reranker-v2-gemma", rank: 2, reason: "Dedicated reranker. Higher quality reranking than BGE-M3 but requires separate model.", isCurrentBest: false, sizeEfficiency: "good" },
  { taskType: "document_analysis", modelId: "qwen2.5-7b", rank: 1, reason: "Good document understanding at 7B. Handles legal docs well.", isCurrentBest: true, sizeEfficiency: "optimal" },
  { taskType: "document_analysis", modelId: "qwen2.5-14b", rank: 2, reason: "Notably better comprehension for complex multi-page documents.", isCurrentBest: false, sizeEfficiency: "good" },
  { taskType: "rag_queries", modelId: "qwen2.5-7b", rank: 1, reason: "Strong RAG performance with BGE-M3 retrieval. Currently deployed.", isCurrentBest: true, sizeEfficiency: "optimal" },
  { taskType: "rag_queries", modelId: "qwen3-8b", rank: 2, reason: "Better synthesis of retrieved context. Direct upgrade path.", isCurrentBest: false, sizeEfficiency: "optimal" },
];

let lastRefreshTime: Date | null = null;
let refreshInterval: ReturnType<typeof setInterval> | null = null;

export async function seedModelIntelligence(): Promise<{ entries: number; recommendations: number; alerts: number }> {
  let entriesCount = 0;
  let recsCount = 0;
  let alertsCount = 0;

  for (const entry of CURATED_KNOWLEDGE) {
    const existing = await db.select().from(modelIntelligenceEntries)
      .where(eq(modelIntelligenceEntries.modelId, entry.modelId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(modelIntelligenceEntries).values({
        modelId: entry.modelId,
        displayName: entry.displayName,
        provider: entry.provider,
        category: entry.category,
        capabilities: entry.capabilities,
        license: entry.license,
        parameterSize: entry.parameterSize,
        quantization: entry.quantization,
        contextWindow: entry.contextWindow,
        qualityScores: entry.qualityScores,
        tasksRecommended: entry.tasksRecommended,
        replacesModelId: entry.replacesModelId,
        sourceUrl: entry.sourceUrl,
        notes: entry.notes,
        releasedAt: entry.releasedAt ? new Date(entry.releasedAt) : null,
      });
      entriesCount++;
    }
  }

  for (const rec of CURATED_RECOMMENDATIONS) {
    const existing = await db.select().from(modelRecommendations)
      .where(and(
        eq(modelRecommendations.taskType, rec.taskType),
        eq(modelRecommendations.modelId, rec.modelId),
      ))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(modelRecommendations).values({
        taskType: rec.taskType,
        modelId: rec.modelId,
        rank: rec.rank,
        reason: rec.reason,
        performanceNotes: rec.performanceNotes,
        sizeEfficiency: rec.sizeEfficiency,
        isCurrentBest: rec.isCurrentBest,
      });
      recsCount++;
    }
  }

  alertsCount = await generateUpgradeAlerts();

  lastRefreshTime = new Date();
  logger.info("[ModelIntelligence] Knowledge base seeded", { entries: entriesCount, recommendations: recsCount, alerts: alertsCount });
  return { entries: entriesCount, recommendations: recsCount, alerts: alertsCount };
}

async function generateUpgradeAlerts(): Promise<number> {
  let count = 0;

  const registryChat = MODEL_REGISTRY.filter(m => m.capabilities.includes("chat") && m.providerType === "synseekr");

  for (const currentModel of registryChat) {
    const intel = CURATED_KNOWLEDGE.filter(k => k.replacesModelId === currentModel.modelId.replace("synseekr-", ""));

    for (const upgrade of intel) {
      const existing = await db.select().from(modelAlerts)
        .where(and(
          eq(modelAlerts.currentModelId, currentModel.modelId),
          eq(modelAlerts.suggestedModelId, upgrade.modelId),
        ))
        .limit(1);

      if (existing.length === 0) {
        const qualityImprovement = upgrade.qualityScores.general
          ? Math.round(((upgrade.qualityScores.general - (currentModel.maxContext > 0 ? 78 : 70)) / 78) * 100)
          : 0;

        await db.insert(modelAlerts).values({
          alertType: "upgrade_available",
          currentModelId: currentModel.modelId,
          suggestedModelId: upgrade.modelId,
          taskType: "general",
          title: `Upgrade Available: ${upgrade.displayName}`,
          description: `${upgrade.displayName} (${upgrade.parameterSize}) offers ~${Math.max(qualityImprovement, 5)}% quality improvement over ${currentModel.displayName}. ${upgrade.notes || ""}`,
          priority: qualityImprovement > 10 ? "important" : "info",
        });
        count++;
      }
    }
  }

  return count;
}

export async function getRecommendations(taskType?: string) {
  if (taskType) {
    return db.select().from(modelRecommendations)
      .where(eq(modelRecommendations.taskType, taskType))
      .orderBy(modelRecommendations.rank);
  }
  return db.select().from(modelRecommendations)
    .orderBy(modelRecommendations.taskType, modelRecommendations.rank);
}

export async function getActiveAlerts() {
  return db.select().from(modelAlerts)
    .where(eq(modelAlerts.isDismissed, false))
    .orderBy(desc(modelAlerts.createdAt));
}

export async function dismissAlert(alertId: string, userId: string) {
  return db.update(modelAlerts)
    .set({ isDismissed: true, dismissedBy: userId, dismissedAt: new Date() })
    .where(eq(modelAlerts.id, alertId));
}

export async function getAllIntelligenceEntries() {
  return db.select().from(modelIntelligenceEntries)
    .where(eq(modelIntelligenceEntries.isActive, true))
    .orderBy(modelIntelligenceEntries.category, modelIntelligenceEntries.displayName);
}

export async function getIntelligenceForTask(taskType: string) {
  const recs = await getRecommendations(taskType);
  const entries = await getAllIntelligenceEntries();

  const enriched = recs.map(rec => {
    const entry = entries.find(e => e.modelId === rec.modelId);
    const registryEntry = getRegistryModel(rec.modelId) || getRegistryModel(`synseekr-${rec.modelId}`);
    return {
      ...rec,
      intelligence: entry || null,
      isDeployed: !!registryEntry,
      registryEntry: registryEntry || null,
    };
  });

  return enriched;
}

export function getLastRefreshTime(): Date | null {
  return lastRefreshTime;
}

export function getTaskTypes(): string[] {
  return Array.from(new Set(CURATED_RECOMMENDATIONS.map(r => r.taskType)));
}

export async function refreshModelIntelligence(): Promise<{ entries: number; recommendations: number; alerts: number }> {
  return seedModelIntelligence();
}

export function startPeriodicRefresh(intervalMs: number = 24 * 60 * 60 * 1000) {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(async () => {
    try {
      await refreshModelIntelligence();
      logger.info("[ModelIntelligence] Periodic refresh completed");
    } catch (err: any) {
      logger.error("[ModelIntelligence] Periodic refresh failed", { error: err.message });
    }
  }, intervalMs);
  logger.info("[ModelIntelligence] Periodic refresh scheduled", { intervalMs });
}
