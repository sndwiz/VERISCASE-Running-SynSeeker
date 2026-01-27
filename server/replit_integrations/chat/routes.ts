import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { chatStorage } from "./storage";
import {
  AVAILABLE_MODELS,
  streamAnthropicResponse,
  getModelInfo,
  getModelsByProvider,
  getVisionModels,
  analyzeEvidenceImage,
  type AIConfig,
  type ChatMessage,
} from "../../ai/providers";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

export function registerChatRoutes(app: Express): void {
  // Get available AI models
  app.get("/api/ai/models", async (_req: Request, res: Response) => {
    try {
      res.json({
        models: AVAILABLE_MODELS,
        visionModels: getVisionModels(),
        providers: {
          anthropic: getModelsByProvider("anthropic"),
          openai: getModelsByProvider("openai"),
          deepseek: getModelsByProvider("deepseek"),
        },
      });
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  // Get all conversations
  app.get("/api/conversations", async (_req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title, model } = req.body;
      const conversation = await chatStorage.createConversation(
        title || "New Chat",
        model || "claude-sonnet-4-5"
      );
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const conversationId = parseInt(Array.isArray(idParam) ? idParam[0] : idParam);
      const { content, model } = req.body;

      // Get conversation to check model preference
      const conversation = await chatStorage.getConversation(conversationId);
      const selectedModel = model || conversation?.model || "claude-sonnet-4-5";

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // Get conversation history for context
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages: ChatMessage[] = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const modelInfo = getModelInfo(selectedModel);
      
      // Validate model exists
      if (!modelInfo) {
        res.setHeader("Content-Type", "application/json");
        return res.status(400).json({ error: `Unknown model: ${selectedModel}` });
      }

      // Check if provider is supported
      if (modelInfo.provider !== "anthropic") {
        res.setHeader("Content-Type", "application/json");
        return res.status(400).json({ 
          error: `Provider ${modelInfo.provider} is not yet implemented. Currently only Anthropic models are supported.`,
          supportedProviders: ["anthropic"],
        });
      }

      const config: AIConfig = {
        provider: modelInfo.provider,
        model: selectedModel,
        maxTokens: 2048,
      };

      let fullResponse = "";

      for await (const chunk of streamAnthropicResponse(chatMessages, config)) {
        if (chunk.content) {
          fullResponse += chunk.content;
          res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
        }
        if (chunk.done) {
          break;
        }
      }

      // Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      // Check if headers already sent (SSE streaming started)
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  // Analyze evidence image with AI vision
  app.post("/api/ai/analyze-evidence", async (req: Request, res: Response) => {
    try {
      const { imageBase64, mediaType, evidenceType } = req.body;

      if (!imageBase64 || !mediaType) {
        return res.status(400).json({ error: "imageBase64 and mediaType are required" });
      }

      const validEvidenceTypes = ["document", "crime_scene", "photo", "diagram"];
      const type = validEvidenceTypes.includes(evidenceType) ? evidenceType : "photo";

      const analysis = await analyzeEvidenceImage(imageBase64, mediaType, type);
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing evidence:", error);
      res.status(500).json({ error: "Failed to analyze evidence" });
    }
  });

  // OCR document with AI
  app.post("/api/ai/ocr", async (req: Request, res: Response) => {
    try {
      const { imageBase64, mediaType } = req.body;

      if (!imageBase64 || !mediaType) {
        return res.status(400).json({ error: "imageBase64 and mediaType are required" });
      }

      const analysis = await analyzeEvidenceImage(imageBase64, mediaType, "document");
      res.json({
        text: analysis.ocrText || "",
        description: analysis.description,
        metadata: analysis.metadata,
      });
    } catch (error) {
      console.error("Error performing OCR:", error);
      res.status(500).json({ error: "Failed to perform OCR" });
    }
  });

  // Legal document analysis
  app.post("/api/ai/analyze-legal-document", async (req: Request, res: Response) => {
    try {
      const { text, documentType } = req.body;

      if (!text) {
        return res.status(400).json({ error: "text is required" });
      }

      const prompt = `You are a legal document analyst. Analyze the following ${documentType || "legal document"} and provide:
1. Document summary
2. Key clauses and their implications
3. Potential risks or issues
4. Missing elements that should be present
5. Recommendations

Document text:
${text}

Provide your analysis in JSON format with fields: summary, keyClauses[], risks[], missingElements[], recommendations[]`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((block) => block.type === "text");
      const responseText = textBlock?.type === "text" ? textBlock.text : "";

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          res.json(JSON.parse(jsonMatch[0]));
        } else {
          res.json({ analysis: responseText });
        }
      } catch {
        res.json({ analysis: responseText });
      }
    } catch (error) {
      console.error("Error analyzing legal document:", error);
      res.status(500).json({ error: "Failed to analyze legal document" });
    }
  });
}
