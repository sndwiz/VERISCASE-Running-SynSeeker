import Anthropic from "@anthropic-ai/sdk";

export type AIProvider = "anthropic" | "openai" | "deepseek" | "private";

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
    id: "gpt-4o",
    name: "GPT-4o (Coming Soon)",
    provider: "openai",
    supportsVision: true,
    maxTokens: 4096,
    contextWindow: 128000,
    available: false,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo (Coming Soon)",
    provider: "openai",
    supportsVision: true,
    maxTokens: 4096,
    contextWindow: 128000,
    available: false,
  },
  {
    id: "deepseek-vl",
    name: "DeepSeek VL (Coming Soon)",
    provider: "deepseek",
    supportsVision: true,
    maxTokens: 4096,
    contextWindow: 32000,
    available: false,
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat (Coming Soon)",
    provider: "deepseek",
    supportsVision: false,
    maxTokens: 4096,
    contextWindow: 32000,
    available: false,
  },
];

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

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

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export async function analyzeImageWithVision(
  imageBase64: string,
  mediaType: string,
  prompt: string,
  config: AIConfig
): Promise<string> {
  if (config.provider !== "anthropic") {
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
  return textBlock?.type === "text" ? textBlock.text : "";
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
  const responseText = await analyzeImageWithVision(imageBase64, mediaType, prompt, config);

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", e);
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

export function getModelInfo(modelId: string): AIModel | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === modelId);
}

export function getModelsByProvider(provider: AIProvider): AIModel[] {
  return AVAILABLE_MODELS.filter((m) => m.provider === provider);
}

export function getVisionModels(): AIModel[] {
  return AVAILABLE_MODELS.filter((m) => m.supportsVision);
}
