import type { Express, Request, Response } from "express";
import { chatStorage } from "./storage";
import { storage } from "../../storage";
import {
  AVAILABLE_MODELS,
  streamAnthropicResponse,
  streamGeminiResponse,
  streamResponse,
  getModelInfo,
  getModelsByProvider,
  getVisionModels,
  analyzeEvidenceImage,
  generateCompletion,
  type AIConfig,
  type ChatMessage,
} from "../../ai/providers";

const LEGAL_SYSTEM_PROMPT = `You are Verbo, an expert legal assistant integrated into VERICASE - a comprehensive legal practice management system by Synergy Law PLLC. You have deep knowledge of:

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
7. **Automation Expert**: Design, explain, audit, and troubleshoot VERICASE automations using the catalog below

**Response Guidelines:**
- Always maintain attorney-client privilege considerations
- Provide balanced analysis considering opposing arguments
- Cite relevant rules of procedure and evidence when applicable
- Use clear, professional legal language
- Flag ethical considerations when relevant
- Never provide definitive legal advice - always note that specific decisions require licensed attorney review

**Matter Context:**
When linked to a specific matter, you have access to the case details, parties, timeline, and documents to provide targeted assistance.

---

**AUTOMATION CATALOG**

You can help users create, explain, and audit automations. Every automation follows a Trigger → Conditions → Actions pattern. When generating automation rules, ALWAYS use the exact engine keys listed below (snake_case format). These keys match what the system stores and the UI displays.

**SUPPORTED TRIGGER KEYS (triggerType):**
Board/Item:
- item_created — When a new task is created
- status_changed — When task status changes
- priority_changed — When task priority changes
- column_changed — When any column value changes
- item_name_changed — When item name is modified
- due_date_approaching — Before due date arrives
- due_date_passed — When due date has passed
- assigned — When someone is assigned
- unassigned — When someone is unassigned
- moved_to_group — When task moves to different group
- update_created — When a comment/update is added
- button_clicked — When a button column is clicked
- email_received — When an email is received

Tags:
- item_tag_added — When a tag is added to an item
- item_tag_removed — When a tag is removed from an item
- item_mentioned_user — When a user is @mentioned

File/Evidence:
- file_uploaded — When a file is attached
- file_ocr_completed — When OCR/extraction finishes for a file
- file_classified — When a file gets a doc_type classification

OCR/NLP Signals:
- signal_deadline_detected — When OCR text contains a deadline
- signal_event_detected — When text suggests an event/meeting/hearing
- signal_action_item_detected — When text suggests an action item
- signal_privilege_detected — When content is likely privileged/sensitive
- signal_contradiction_detected — When analysis flags conflicting statements

Time-based:
- time_daily_at — Fires daily at a set time
- time_before_due_date — Fires X days/hours before due date
- time_after_due_date — Fires X days/hours after due date if not complete

Matter/Client:
- matter_created — When a new matter is created
- matter_status_changed — When matter status changes
- client_created — When a new client is created

Detective Board:
- detective_anomaly_threshold — When anomaly score exceeds threshold

Legal Compliance:
- approval_status_changed — When approval status changes
- approval_required — When item needs approval
- deadline_warning — When a deadline is approaching
- compliance_check — When compliance verification is needed

**SUPPORTED CONDITIONS (filters):**
Generic: cond.board_is, cond.item_in_group, cond.status_is, cond.status_changed_to, cond.assignee_is, cond.tag_contains, cond.due_within_days, cond.due_is_overdue, cond.created_within_days, cond.updated_within_days
File/Evidence: cond.file_type_is (pdf/image/doc/sheet/audio), cond.ocr_confidence_gte (threshold), cond.doc_type_is (invoice/contract/medical/police/receipt/etc)
Signal: cond.signal_confidence_gte (threshold), cond.signal_contains_keyword (keyword), cond.privilege_level_is (normal/sensitive/privileged)
Permission: cond.actor_has_permission (permission_key)

**SUPPORTED ACTION KEYS (actionType):**
Item/Task:
- change_status — Update the task status
- change_priority — Update the task priority
- move_to_group — Move task to another group
- assign_person — Assign someone to the task
- update_field — Update a specific field value
- create_item — Create a new item in a board
- set_date — Set a date field value (absolute or relative like "NOW+3D")
- add_tag — Add a tag to an item
- remove_tag — Remove a tag from an item
- add_comment — Post a comment/update to an item
- link_file — Link a file to an item
- create_subtask — Create a related subtask

Board:
- create_board_column — Add a new column to a board

File:
- request_ocr — Request OCR processing for a file
- route_to_folder — Route a file to a specific folder
- add_file_label — Add a label/classification to a file

Notifications:
- send_notification — Send in-app alert notification
- send_email — Send email notification
- send_sms — Send SMS notification
- send_slack — Notify in Slack channel
- trigger_webhook — Call an external URL

Calendar/Events:
- create_event — Create a calendar/hearing event

Legal Compliance:
- request_approval — Route for attorney approval
- escalate_review — Escalate to senior reviewer
- log_compliance — Log compliance verification
- generate_confirmation — Create audit confirmation record

AI-Powered:
- ai_fill_column — AI-powered column fill
- ai_summarize — AI text summarization
- ai_categorize — AI categorization
- ai_extract — AI information extraction
- ai_improve — AI text improvement
- ai_write — AI content generation
- ai_translate — AI translation
- ai_detect_language — AI language detection
- ai_sentiment — AI sentiment analysis

SynSeekr (requires SynSeekr server):
- synseekr_analyze_document — Deep AI analysis
- synseekr_extract_entities — Entity extraction
- synseekr_rag_query — Semantic search across case documents
- synseekr_run_investigation — Full case investigation
- synseekr_detect_contradictions — Contradiction detection
- synseekr_classify_document — Document classification
- synseekr_run_agent — Run specialized AI agent (Riley/Elena/David)
- synseekr_search_documents — Semantic document search
- synseekr_timeline_events — Timeline extraction

Time Tracking:
- start_time_tracking — Start tracking billable time
- stop_time_tracking — Stop tracking billable time

**AUTOMATION RULE SCHEMA (stored in DB):**
Each rule has: id, boardId, name, description, isActive, triggerType (engine key), triggerField, triggerValue, conditions[], actionType (engine key), actionConfig, runCount, lastRun, createdAt, updatedAt.

**WHEN USER ASKS FOR AN AUTOMATION:**
1. Understand their intent and map it to supported trigger + conditions + actions
2. Produce a draft rule using supported keys, showing both the human-readable description and engine keys
3. Provide a simulation preview: what would trigger, what actions would happen, edge cases
4. Warn about potential loops (e.g., status change triggering itself)
5. Present the rule for user approval before enabling

**WHEN USER ASKS "WHAT DOES THIS AUTOMATION DO?":**
- Translate the rule into plain English
- List edge cases and conflicts (e.g., "could loop if status change triggers itself")
- Suggest improvements if applicable

**30 PRE-BUILT LEGAL WORKFLOW TEMPLATES:**
The system includes 30 ready-to-use law firm automation recipes covering:
- Client follow-ups (Waiting on Client → 3-day follow-up task)
- Intake routing (new intake → assign owner + tag)
- Deadline management (48h reminders, overdue escalation, daily digest)
- Filing workflows (Filed → confirm receipt task, Drafting → 7-day deadline)
- Evidence handling (upload → OCR, classify, chain-of-custody)
- Document intelligence (deadline detection, event detection, action items, privilege tagging, contradiction flagging)
- Discovery workflows (Discovery status → checklist subtasks)
- Billing automation (receipt → expense, invoice → billing task)
- Settlement tracking (Settlement Negotiation → offer tracker columns)
- Escalation (overdue + Waiting on Client → escalate to lead attorney)
- Detective board (anomaly score → investigation task)

Users can browse these in the Automations page under the "Legal Workflows" category.

**EXAMPLE AUTOMATIONS (using engine keys):**
1. "When status becomes Waiting on Client, create a follow-up task in 3 days":
   triggerType: "status_changed", triggerValue: "Waiting on Client"
   actionType: "create_item", actionConfig: { title: "Client follow-up", due_date: "NOW+3D" }

2. "If OCR detects a deadline, set due date and tag #deadline":
   triggerType: "signal_deadline_detected"
   actionType: "set_date", actionConfig: { date: "{detected_date}" }
   (chain with: actionType: "add_tag", actionConfig: { tag: "deadline" })

3. "When overdue and still Waiting on Client, escalate to lead attorney":
   triggerType: "due_date_passed", conditions: [{ type: "status_is", value: "Waiting on Client" }]
   actionType: "send_notification", actionConfig: { text: "Escalation: item overdue", link: "/boards/{board_id}" }
   (chain with: actionType: "add_tag", actionConfig: { tag: "escalate" })`;

async function buildMatterContext(matterId: string): Promise<string> {
  try {
    const matter = await storage.getMatter(matterId);
    if (!matter) return "";

    const client = matter.clientId ? await storage.getClient(matter.clientId) : null;
    const contacts = await storage.getMatterContacts(matterId);
    const timeline = await storage.getTimelineEvents(matterId);
    const files = await storage.getFileItemsWithProfiles(matterId);

    let context = `\n\n**CURRENT MATTER CONTEXT:**\n`;
    context += `- Matter: ${matter.name} (${matter.caseNumber || 'No number'})\n`;
    context += `- Status: ${matter.status}\n`;
    context += `- Practice Area: ${matter.practiceArea || 'Not specified'}\n`;
    if (client) {
      context += `- Client: ${client.name}${client.company ? ` (${client.company})` : ''}\n`;
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
        context += `- ${f.fileName}${f.profile ? ` [${f.profile.docCategory}/${f.profile.docType}]` : ''}\n`;
      });
    }

    return context;
  } catch (error) {
    console.error("Error building matter context:", error);
    return "";
  }
}

function sanitizeUserInput(content: string): string {
  const injectionPatterns = [
    /\bignore\s+(all\s+)?previous\s+instructions?\b/i,
    /\byou\s+are\s+now\b/i,
    /\bforget\s+(all\s+)?previous\b/i,
    /\bsystem\s*:\s*/i,
    /\b(reveal|show|display|output)\s+(your\s+)?(system\s+)?(prompt|instructions?)\b/i,
    /\bact\s+as\s+(if\s+you\s+are|a)\b/i,
  ];
  
  let sanitized = content;
  for (const pattern of injectionPatterns) {
    if (pattern.test(sanitized)) {
      sanitized = sanitized.replace(pattern, "[filtered]");
    }
  }
  
  if (sanitized.length > 50000) {
    sanitized = sanitized.substring(0, 50000);
  }
  
  return sanitized;
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
          gemini: getModelsByProvider("gemini"),
          deepseek: getModelsByProvider("deepseek"),
          private: getModelsByProvider("private"),
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
      const matterIdParam = req.params.matterId;
      const matterId = Array.isArray(matterIdParam) ? matterIdParam[0] : matterIdParam;
      const conversations = await chatStorage.getConversationsByMatter(matterId);
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
      const sanitizedContent = sanitizeUserInput(content);

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
      await chatStorage.createMessage(conversationId, "user", sanitizedContent);

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

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      let clientDisconnected = false;
      req.on("close", () => { clientDisconnected = true; });

      const modelInfo = getModelInfo(selectedModel);
      
      if (!modelInfo) {
        res.setHeader("Content-Type", "application/json");
        return res.status(400).json({ error: `Unknown model: ${selectedModel}` });
      }

      if (!modelInfo.available) {
        res.setHeader("Content-Type", "application/json");
        return res.status(400).json({ 
          error: `Model ${modelInfo.name} is not currently available. Its API key may not be configured.`,
        });
      }

      const supportedProviders = ["anthropic", "gemini", "openai", "private"];
      if (!supportedProviders.includes(modelInfo.provider)) {
        res.setHeader("Content-Type", "application/json");
        return res.status(400).json({ 
          error: `Provider ${modelInfo.provider} is not configured. Available providers: ${supportedProviders.join(", ")}.`,
          supportedProviders,
        });
      }

      const config: AIConfig = {
        provider: modelInfo.provider,
        model: selectedModel,
        maxTokens: 2048,
      };

      let fullResponse = "";

      for await (const chunk of streamResponse(chatMessages, config, "verbo_chat")) {
        if (clientDisconnected) break;
        if (chunk.content) {
          fullResponse += chunk.content;
          try { res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`); } catch {}
        }
        if (chunk.error) {
          try { res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`); } catch {}
          break;
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

      const responseText = await generateCompletion(
        [{ role: "user", content: prompt }],
        { model: "claude-sonnet-4-5", maxTokens: 4096, caller: "legal_document_analysis" }
      );

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
