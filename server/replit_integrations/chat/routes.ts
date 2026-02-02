import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { chatStorage } from "./storage";
import { storage } from "../../storage";
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

const LEGAL_SYSTEM_PROMPT = `You are VERICASE AI, an expert legal assistant integrated into a comprehensive legal practice management system. You have deep knowledge of:

**Legal Practice Areas:**
- Civil litigation, criminal defense, family law, corporate law, real estate, estate planning
- Discovery procedures, motion practice, trial preparation
- Evidence handling, chain of custody, document authentication
- Legal research and case analysis

**Your Capabilities:**
1. **Document Analysis**: Analyze legal documents, contracts, pleadings, and evidence
2. **Legal Research**: Provide case law citations, statutes, and procedural guidance
3. **Strategic Advice**: Suggest litigation strategies and identify potential issues
4. **Drafting Assistance**: Help draft motions, briefs, discovery requests, and correspondence
5. **Case Timeline**: Analyze chronology and identify key dates and deadlines
6. **Evidence Review**: Evaluate evidence strength and admissibility considerations

**Response Guidelines:**
- Always maintain attorney-client privilege considerations
- Provide balanced analysis considering opposing arguments
- Cite relevant rules of procedure and evidence when applicable
- Use clear, professional legal language
- Flag ethical considerations when relevant
- Never provide definitive legal advice - always note that specific decisions require licensed attorney review

**Matter Context:**
When linked to a specific matter, you have access to the case details, parties, timeline, and documents to provide targeted assistance.`;

async function buildMatterContext(matterId: string): Promise<string> {
  try {
    const matter = await storage.getMatter(matterId);
    if (!matter) return "";

    const client = matter.clientId ? await storage.getClient(matter.clientId) : null;
    const contacts = await storage.getMatterContacts(matterId);
    const timeline = await storage.getTimelineEvents(matterId);
    const files = await storage.getFileItemsWithProfiles(matterId);

    let context = `\n\n**CURRENT MATTER CONTEXT:**\n`;
    context += `- Matter: ${matter.title} (${matter.matterNumber || 'No number'})\n`;
    context += `- Status: ${matter.status}\n`;
    context += `- Practice Area: ${matter.practiceArea || 'Not specified'}\n`;
    if (client) {
      context += `- Client: ${client.name} (${client.type})\n`;
    }
    if (matter.description) {
      context += `- Description: ${matter.description}\n`;
    }
    
    if (contacts.length > 0) {
      context += `\n**Key Parties:**\n`;
      contacts.slice(0, 10).forEach(c => {
        context += `- ${c.name} (${c.role}): ${c.email || c.phone || 'No contact info'}\n`;
      });
    }

    if (timeline.length > 0) {
      context += `\n**Recent Timeline Events:**\n`;
      timeline.slice(0, 5).forEach(t => {
        context += `- ${t.eventDate}: ${t.title} - ${t.description || ''}\n`;
      });
    }

    if (files.length > 0) {
      context += `\n**Filed Documents (${files.length} total):**\n`;
      files.slice(0, 10).forEach(f => {
        context += `- ${f.name}${f.docProfile ? ` [${f.docProfile.docCategory}/${f.docProfile.docType}]` : ''}\n`;
      });
    }

    return context;
  } catch (error) {
    console.error("Error building matter context:", error);
    return "";
  }
}

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
      const { title, model, matterId, systemPrompt } = req.body;
      const conversation = await chatStorage.createConversation(
        title || "New Chat",
        model || "claude-sonnet-4-5",
        matterId,
        systemPrompt
      );
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Update conversation
  app.patch("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const idParam = req.params.id;
      const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam);
      const { title, matterId, systemPrompt } = req.body;
      
      const conversation = await chatStorage.updateConversation(id, {
        title,
        matterId,
        systemPrompt,
      });
      
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Error updating conversation:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  // Get conversations by matter
  app.get("/api/matters/:matterId/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getConversationsByMatter(req.params.matterId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching matter conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
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

      // Get conversation to check model preference and matter context
      const conversation = await chatStorage.getConversation(conversationId);
      const selectedModel = model || conversation?.model || "claude-sonnet-4-5";

      // Build system prompt with legal context and matter info
      let systemPrompt = LEGAL_SYSTEM_PROMPT;
      if (conversation?.systemPrompt) {
        systemPrompt += `\n\n**Custom Instructions:**\n${conversation.systemPrompt}`;
      }
      if (conversation?.matterId) {
        const matterContext = await buildMatterContext(conversation.matterId);
        systemPrompt += matterContext;
      }

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // Get conversation history for context
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      
      // Build chat messages with system prompt as first user message (Anthropic pattern)
      const chatMessages: ChatMessage[] = [];
      
      // For the first message, prepend system context
      messages.forEach((m, index) => {
        if (index === 0 && m.role === "user") {
          chatMessages.push({
            role: "user",
            content: `[System Context - Please keep this in mind for all responses]\n${systemPrompt}\n\n[User Message]\n${m.content}`,
          });
        } else {
          chatMessages.push({
            role: m.role as "user" | "assistant",
            content: m.content,
          });
        }
      });

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
