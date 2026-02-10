import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { startAIOp, completeAIOp } from "./ai-ops";
import { evaluatePolicy, getMode, getSelectedModel, recordPolicyDecision, type PolicyDecision, type PolicyRequest } from "./policy-engine";
import { getRegistryModel } from "../config/model-registry";
import { logger } from "../utils/logger";

export type AIProvider = "anthropic" | "openai" | "gemini" | "deepseek" | "private" | "synseekr";

function getDeepSeekClient(): OpenAI {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key not configured. Set DEEPSEEK_API_KEY.");
  }
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1",
  });
}

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  supportsVision: boolean;
  maxTokens: number;
  contextWindow: number;
  available: boolean;
}

export interface AIConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | MessageContent[];
}

export interface MessageContent {
  type: "text" | "image";
  text?: string;
  source?: {
    type: "base64";
    media_type: string;
    data: string;
  };
}

export interface StreamChunk {
  content?: string;
  done?: boolean;
  error?: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: "claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    provider: "anthropic",
    supportsVision: true,
    maxTokens: 8192,
    contextWindow: 200000,
    available: true,
  },
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    supportsVision: true,
    maxTokens: 8192,
    contextWindow: 200000,
    available: true,
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    supportsVision: true,
    maxTokens: 4096,
    contextWindow: 200000,
    available: true,
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    supportsVision: true,
    maxTokens: 4096,
    contextWindow: 200000,
    available: true,
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    provider: "openai",
    supportsVision: true,
    maxTokens: 16384,
    contextWindow: 128000,
    available: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    supportsVision: true,
    maxTokens: 4096,
    contextWindow: 128000,
    available: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    supportsVision: true,
    maxTokens: 4096,
    contextWindow: 128000,
    available: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    supportsVision: true,
    maxTokens: 8192,
    contextWindow: 1000000,
    available: !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "gemini",
    supportsVision: true,
    maxTokens: 8192,
    contextWindow: 1000000,
    available: !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    provider: "gemini",
    supportsVision: true,
    maxTokens: 8192,
    contextWindow: 1000000,
    available: !!process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  },
  {
    id: "synseekr-qwen2.5-7b",
    name: "SynSeekr Qwen2.5 7B",
    provider: "synseekr",
    supportsVision: false,
    maxTokens: 8192,
    contextWindow: 32768,
    available: !!process.env.SYNSEEKR_URL,
  },
  {
    id: "synergy-private",
    name: "Synergy Private LLM",
    provider: "private",
    supportsVision: false,
    maxTokens: 4096,
    contextWindow: 32768,
    available: !!process.env.PRIVATE_AI_SERVER_URL,
  },
];

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

function getOpenAIClient(): OpenAI {
  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured. Please set up OpenAI integration.");
  }
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

function getGeminiClient(): GoogleGenAI {
  if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured. Please set up Gemini integration.");
  }
  return new GoogleGenAI({
    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
    httpOptions: {
      apiVersion: "",
      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
    },
  });
}

export async function* streamAnthropicResponse(
  messages: ChatMessage[],
  config: AIConfig
): AsyncGenerator<StreamChunk> {
  const apiMessages = messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: typeof m.content === "string" ? m.content : m.content.map((c) => {
      if (c.type === "text") {
        return { type: "text" as const, text: c.text || "" };
      }
      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: (c.source?.media_type || "image/png") as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: c.source?.data || "",
        },
      };
    }),
  }));

  const stream = anthropic.messages.stream({
    model: config.model,
    max_tokens: config.maxTokens || 2048,
    messages: apiMessages,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      const content = event.delta.text;
      if (content) {
        yield { content };
      }
    }
  }
  yield { done: true };
}

export async function* streamOpenAIResponse(
  messages: ChatMessage[],
  config: AIConfig
): AsyncGenerator<StreamChunk> {
  const apiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content } as OpenAI.ChatCompletionMessageParam;
    }
    const parts: OpenAI.ChatCompletionContentPart[] = m.content.map((c) => {
      if (c.type === "text") {
        return { type: "text" as const, text: c.text || "" };
      }
      return {
        type: "image_url" as const,
        image_url: {
          url: `data:${c.source?.media_type || "image/png"};base64,${c.source?.data || ""}`,
        },
      };
    });
    return { role: m.role as "user", content: parts } as OpenAI.ChatCompletionMessageParam;
  });

  const openai = getOpenAIClient();
  const stream = await openai.chat.completions.create({
    model: config.model,
    max_tokens: config.maxTokens || 2048,
    messages: apiMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield { content };
    }
  }
  yield { done: true };
}

export async function* streamGeminiResponse(
  messages: ChatMessage[],
  config: AIConfig
): AsyncGenerator<StreamChunk> {
  const chatMessages = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: typeof m.content === "string" 
      ? [{ text: m.content }]
      : m.content.map((c) => {
          if (c.type === "text") {
            return { text: c.text || "" };
          }
          return {
            inlineData: {
              mimeType: c.source?.media_type || "image/png",
              data: c.source?.data || "",
            },
          };
        }),
  }));

  const gemini = getGeminiClient();
  const stream = await gemini.models.generateContentStream({
    model: config.model,
    contents: chatMessages,
  });

  for await (const chunk of stream) {
    const content = chunk.text || "";
    if (content) {
      yield { content };
    }
  }
  yield { done: true };
}

export async function* streamDeepSeekResponse(
  messages: ChatMessage[],
  config: AIConfig
): AsyncGenerator<StreamChunk> {
  const apiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content } as OpenAI.ChatCompletionMessageParam;
    }
    const parts: OpenAI.ChatCompletionContentPart[] = m.content.map((c) => {
      if (c.type === "text") {
        return { type: "text" as const, text: c.text || "" };
      }
      return { type: "text" as const, text: "[image not supported by DeepSeek]" };
    });
    return { role: m.role as "user", content: parts } as OpenAI.ChatCompletionMessageParam;
  });

  const deepseek = getDeepSeekClient();
  const stream = await deepseek.chat.completions.create({
    model: config.model,
    max_tokens: config.maxTokens || 2048,
    messages: apiMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield { content };
    }
  }
  yield { done: true };
}

function getPrivateServerClient(): OpenAI {
  if (!process.env.PRIVATE_AI_SERVER_URL) {
    throw new Error("Private AI server not configured. Set PRIVATE_AI_SERVER_URL to your server's API endpoint.");
  }
  return new OpenAI({
    apiKey: process.env.PRIVATE_AI_SERVER_KEY || "not-needed",
    baseURL: process.env.PRIVATE_AI_SERVER_URL,
  });
}

export async function* streamPrivateServerResponse(
  messages: ChatMessage[],
  config: AIConfig
): AsyncGenerator<StreamChunk> {
  const apiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => {
    if (typeof m.content === "string") {
      return { role: m.role, content: m.content } as OpenAI.ChatCompletionMessageParam;
    }
    const parts: OpenAI.ChatCompletionContentPart[] = m.content.map((c) => {
      if (c.type === "text") {
        return { type: "text" as const, text: c.text || "" };
      }
      return {
        type: "image_url" as const,
        image_url: {
          url: `data:${c.source?.media_type || "image/png"};base64,${c.source?.data || ""}`,
        },
      };
    });
    return { role: m.role as "user", content: parts } as OpenAI.ChatCompletionMessageParam;
  });

  const privateClient = getPrivateServerClient();
  const modelId = config.model.startsWith("synergy-") ? (process.env.PRIVATE_AI_MODEL_NAME || config.model) : config.model;
  
  try {
    const stream = await privateClient.chat.completions.create({
      model: modelId,
      max_tokens: config.maxTokens || 2048,
      messages: apiMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { content };
      }
    }
    yield { done: true };
  } catch (err: any) {
    yield { error: `Synergy Private Server error: ${err.message}` };
    yield { done: true };
  }
}

function resolveProviderFromModel(modelId: string): AIProvider {
  const entry = getRegistryModel(modelId);
  if (!entry) return "anthropic";
  const providerMap: Record<string, AIProvider> = {
    anthropic: "anthropic",
    openai: "openai",
    gemini: "gemini",
    deepseek: "deepseek",
    private: "private",
    synseekr: "synseekr",
  };
  return providerMap[entry.provider] || "anthropic";
}

function enforcePolicyGate(modelId: string, caller: string): PolicyDecision {
  const request: PolicyRequest = {
    mode: getMode(),
    requestedModelId: modelId,
    caller,
  };
  const decision = evaluatePolicy(request);
  recordPolicyDecision(request, decision);
  return decision;
}

export async function* streamResponse(
  messages: ChatMessage[],
  config: AIConfig,
  caller: string = "unknown"
): AsyncGenerator<StreamChunk> {
  const decision = enforcePolicyGate(config.model, caller);
  if (!decision.allowed) {
    logger.warn(`[policy-engine] BLOCKED stream: ${decision.reason}`, { caller, model: config.model });
    yield { error: `Policy blocked: ${decision.reason}` };
    yield { done: true };
    return;
  }
  if (decision.wasFallback) {
    logger.info(`[policy-engine] Fallback: ${config.model} -> ${decision.effectiveModelId}`, { caller });
    config = { ...config, model: decision.effectiveModelId, provider: resolveProviderFromModel(decision.effectiveModelId) };
  }

  const inputSummary = messages.map((m) => typeof m.content === "string" ? m.content : "[multimodal]").join("\n");
  const { id, startTime } = startAIOp(config.provider, config.model, "stream_chat", inputSummary, caller);
  let fullOutput = "";
  let hadError = false;

  try {
    let innerGen: AsyncGenerator<StreamChunk>;
    switch (config.provider) {
      case "anthropic":
        innerGen = streamAnthropicResponse(messages, config);
        break;
      case "openai":
        innerGen = streamOpenAIResponse(messages, config);
        break;
      case "gemini":
        innerGen = streamGeminiResponse(messages, config);
        break;
      case "deepseek":
        innerGen = streamDeepSeekResponse(messages, config);
        break;
      case "private":
        innerGen = streamPrivateServerResponse(messages, config);
        break;
      case "synseekr": {
        async function* streamSynSeekrResponse(msgs: ChatMessage[], cfg: AIConfig): AsyncGenerator<StreamChunk> {
          try {
            const { synseekrClient } = await import("../services/synseekr-client");
            if (!synseekrClient.isEnabled()) {
              yield { error: "SynSeekr server not available. Check SYNSEEKR_URL configuration." };
              yield { done: true };
              return;
            }
            const result = await synseekrClient.proxy("POST", "/api/v1/completions", {
              messages: msgs.map(m => ({ role: m.role, content: typeof m.content === "string" ? m.content : "[multimodal]" })),
              model: cfg.model || "default",
              max_tokens: cfg.maxTokens || 2048,
              system: cfg.systemPrompt,
              stream: false,
            });
            if (result.success && result.data?.content) {
              const text = typeof result.data.content === "string"
                ? result.data.content
                : result.data.content?.[0]?.text || JSON.stringify(result.data.content);
              yield { content: text };
            } else {
              yield { error: result.error || "SynSeekr returned no content" };
            }
            yield { done: true };
          } catch (err: any) {
            yield { error: err.message || "SynSeekr stream failed" };
            yield { done: true };
          }
        }
        innerGen = streamSynSeekrResponse(messages, config);
        break;
      }
      default:
        completeAIOp(id, startTime, "", "error", `Provider ${config.provider} not supported`);
        yield { error: `Provider ${config.provider} not supported` };
        yield { done: true };
        return;
    }

    for await (const chunk of innerGen) {
      if (chunk.content) fullOutput += chunk.content;
      if (chunk.error) hadError = true;
      yield chunk;
    }

    completeAIOp(id, startTime, fullOutput, hadError ? "error" : "success", hadError ? "Stream contained error" : undefined);
  } catch (err: any) {
    completeAIOp(id, startTime, fullOutput, "error", err.message || "Unknown error");
    yield { error: err.message || "AI request failed" };
    yield { done: true };
  }
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function analyzeImageWithVision(
  imageBase64: string,
  mediaType: string,
  prompt: string,
  config: AIConfig,
  caller: string = "vision_analysis"
): Promise<string> {
  const decision = enforcePolicyGate(config.model, caller);
  if (!decision.allowed) {
    logger.warn(`[policy-engine] BLOCKED vision: ${decision.reason}`, { caller, model: config.model });
    throw new Error(`Policy blocked: ${decision.reason}`);
  }
  if (decision.wasFallback) {
    logger.info(`[policy-engine] Vision fallback: ${config.model} -> ${decision.effectiveModelId}`, { caller });
    config = { ...config, model: decision.effectiveModelId, provider: resolveProviderFromModel(decision.effectiveModelId) };
  }

  const { id, startTime } = startAIOp(config.provider, config.model, "vision_analysis", prompt, caller);

  try {
    if (config.provider !== "anthropic") {
      completeAIOp(id, startTime, "", "error", `Vision analysis with ${config.provider} not yet implemented`);
      throw new Error(`Vision analysis with ${config.provider} not yet implemented`);
    }

    const validMediaType = (mediaType as ImageMediaType) || "image/png";

    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens || 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: validMediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const result = textBlock?.type === "text" ? textBlock.text : "";
    completeAIOp(id, startTime, result, "success");
    return result;
  } catch (err: any) {
    completeAIOp(id, startTime, "", "error", err.message || "Vision analysis failed");
    throw err;
  }
}

export async function analyzeEvidenceImage(
  imageBase64: string,
  mediaType: string,
  evidenceType: "document" | "crime_scene" | "photo" | "diagram"
): Promise<{
  ocrText?: string;
  description: string;
  analysis: {
    observations: string[];
    inconsistencies: string[];
    scientificNotes?: string[];
    physicsAnalysis?: string;
  };
  metadata: Record<string, unknown>;
}> {
  const prompts: Record<string, string> = {
    document: `You are a legal document analyst. Analyze this document image and:
1. Extract all visible text (OCR)
2. Identify document type, date, parties involved
3. Note any signatures, stamps, or official markings
4. Flag any potential issues (alterations, inconsistencies, missing information)
5. Provide a structured analysis

Return your analysis in this JSON format:
{
  "ocrText": "extracted text...",
  "description": "brief description",
  "analysis": {
    "observations": ["observation1", ...],
    "inconsistencies": ["issue1", ...]
  },
  "metadata": { "documentType": "...", "date": "...", "parties": [...] }
}`,
    
    crime_scene: `You are a forensic analyst. Analyze this crime scene photo and:
1. Describe what you observe in detail
2. Note positions, distances, and spatial relationships
3. Apply physics principles (blood spatter patterns, gravity, trajectory analysis)
4. Identify any inconsistencies that might suggest staging or alteration
5. Note environmental factors (lighting, weather conditions visible)
6. Identify potential evidence markers or items of interest

Return your analysis in this JSON format:
{
  "description": "detailed scene description",
  "analysis": {
    "observations": ["observation1", ...],
    "inconsistencies": ["issue1", ...],
    "scientificNotes": ["physics/forensic note1", ...],
    "physicsAnalysis": "trajectory, gravity, impact analysis..."
  },
  "metadata": { "sceneType": "...", "evidenceItems": [...], "environmentalConditions": {...} }
}`,
    
    photo: `Analyze this photograph as potential evidence:
1. Describe the subject matter and context
2. Note any visible timestamps, metadata indicators
3. Identify people, objects, or locations visible
4. Note lighting, shadows, and any signs of digital alteration
5. Assess the evidentiary value

Return your analysis in this JSON format:
{
  "description": "photo description",
  "analysis": {
    "observations": ["observation1", ...],
    "inconsistencies": ["issue1", ...]
  },
  "metadata": { "subjects": [...], "location": "...", "timeIndicators": [...] }
}`,
    
    diagram: `Analyze this diagram or technical drawing:
1. Describe the diagram type and purpose
2. Extract any text, labels, or measurements
3. Note the relationships or flows depicted
4. Identify any technical specifications

Return your analysis in this JSON format:
{
  "ocrText": "extracted text/labels...",
  "description": "diagram description",
  "analysis": {
    "observations": ["observation1", ...]
  },
  "metadata": { "diagramType": "...", "measurements": {...}, "specifications": {...} }
}`,
  };

  const config: AIConfig = {
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    maxTokens: 4096,
  };

  const prompt = prompts[evidenceType] || prompts.photo;
  const responseText = await analyzeImageWithVision(imageBase64, mediaType, prompt, config, `evidence_${evidenceType}`);

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e: any) {
    logger.error("Failed to parse AI response as JSON:", { error: e?.message });
  }

  return {
    description: responseText,
    analysis: {
      observations: [responseText],
      inconsistencies: [],
    },
    metadata: {},
  };
}

async function generateCompletionViaSynSeekr(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: { model?: string; maxTokens?: number; system?: string; caller?: string } = {}
): Promise<string | null> {
  try {
    const { synseekrClient } = await import("../services/synseekr-client");
    if (!synseekrClient.isEnabled()) return null;

    const result = await synseekrClient.proxy("POST", "/api/v1/completions", {
      messages,
      model: options.model || "default",
      max_tokens: options.maxTokens || 2048,
      system: options.system,
    });

    if (result.success && result.data?.content) {
      return typeof result.data.content === "string" 
        ? result.data.content 
        : result.data.content?.[0]?.text || JSON.stringify(result.data.content);
    }
    return null;
  } catch {
    return null;
  }
}

export async function generateCompletion(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: {
    model?: string;
    maxTokens?: number;
    system?: string;
    caller?: string;
  } = {}
): Promise<string> {
  const model = options.model || "claude-sonnet-4-5";
  const maxTokens = options.maxTokens || 2048;
  const caller = options.caller || "generateCompletion";

  const decision = enforcePolicyGate(model, caller);
  if (!decision.allowed) {
    logger.warn(`[policy-engine] BLOCKED completion: ${decision.reason}`, { caller, model });
    throw new Error(`Policy blocked: ${decision.reason}`);
  }

  const effectiveModel = decision.wasFallback ? decision.effectiveModelId : model;
  const effectiveProvider = resolveProviderFromModel(effectiveModel);
  if (decision.wasFallback) {
    logger.info(`[policy-engine] Fallback: ${model} -> ${effectiveModel} (provider: ${effectiveProvider})`, { caller });
  }

  const { id, startTime } = startAIOp(effectiveProvider, effectiveModel, "completion", messages.map(m => m.content).join("\n").slice(0, 200), caller);

  if (effectiveProvider === "synseekr") {
    const synseekrResult = await generateCompletionViaSynSeekr(messages, { ...options, model: effectiveModel });
    if (synseekrResult !== null) {
      completeAIOp(id, startTime, synseekrResult.slice(0, 500), "success");
      return synseekrResult;
    }
    completeAIOp(id, startTime, "", "error", "SynSeekr server not available or returned no result");
    throw new Error("SynSeekr server not available. Check SYNSEEKR_URL configuration and server status.");
  }

  const synseekrResult = await generateCompletionViaSynSeekr(messages, options);
  if (synseekrResult !== null) {
    completeAIOp(id, startTime, synseekrResult.slice(0, 500), "success");
    return synseekrResult;
  }

  try {
    if (effectiveProvider === "private") {
      const privateClient = getPrivateServerClient();
      const modelId = effectiveModel.startsWith("synergy-") ? (process.env.PRIVATE_AI_MODEL_NAME || effectiveModel) : effectiveModel;
      const apiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      } as OpenAI.ChatCompletionMessageParam));
      const response = await privateClient.chat.completions.create({
        model: modelId,
        max_tokens: maxTokens,
        messages: apiMessages,
      });
      const result = response.choices[0]?.message?.content || "";
      completeAIOp(id, startTime, result.slice(0, 500), "success");
      return result;
    }

    if (effectiveProvider === "deepseek") {
      const deepseek = getDeepSeekClient();
      const apiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      } as OpenAI.ChatCompletionMessageParam));
      const response = await deepseek.chat.completions.create({
        model: effectiveModel,
        max_tokens: maxTokens,
        messages: apiMessages,
      });
      const result = response.choices[0]?.message?.content || "";
      completeAIOp(id, startTime, result.slice(0, 500), "success");
      return result;
    }

    if (effectiveProvider === "openai") {
      const openai = getOpenAIClient();
      const apiMessages: OpenAI.ChatCompletionMessageParam[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      } as OpenAI.ChatCompletionMessageParam));
      const response = await openai.chat.completions.create({
        model: effectiveModel,
        max_tokens: maxTokens,
        messages: apiMessages,
      });
      const result = response.choices[0]?.message?.content || "";
      completeAIOp(id, startTime, result.slice(0, 500), "success");
      return result;
    }

    if (effectiveProvider === "gemini") {
      const gemini = getGeminiClient();
      const chatMessages = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      const response = await gemini.models.generateContent({
        model: effectiveModel,
        contents: chatMessages,
      });
      const result = response.text || "";
      completeAIOp(id, startTime, result.slice(0, 500), "success");
      return result;
    }

    const response = await anthropic.messages.create({
      model: effectiveModel,
      max_tokens: maxTokens,
      ...(options.system ? { system: options.system } : {}),
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const result = textBlock?.type === "text" ? textBlock.text : "";
    completeAIOp(id, startTime, result.slice(0, 500), "success");
    return result;
  } catch (err: any) {
    completeAIOp(id, startTime, "", "error", err.message || "Completion failed");
    throw err;
  }
}

export function getModelInfo(modelId: string): AIModel | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === modelId);
}

export function getModelsByProvider(provider: AIProvider): AIModel[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === provider);
}

export function getVisionModels(): AIModel[] {
  return AVAILABLE_MODELS.filter((m) => m.supportsVision);
}

export async function getActiveAIProvider(): Promise<string> {
  try {
    const mod = await import("../services/synseekr-client");
    return mod.synseekrClient.isEnabled() ? "synseekr" : "anthropic";
  } catch {
    return "anthropic";
  }
}
