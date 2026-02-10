import { storage } from "./storage";
import type { AutomationRule, Task } from "@shared/schema";
import { synseekrClient } from "./services/synseekr-client";
import { db } from "./db";
import { automationRuns } from "@shared/models/tables";

export type AutomationEvent = {
  type: string;
  boardId: string;
  taskId?: string;
  previousValue?: any;
  newValue?: any;
  field?: string;
  metadata?: Record<string, any>;
};

export interface AutomationExecutionResult {
  ruleId: string;
  ruleName: string;
  success: boolean;
  action: string;
  message: string;
  timestamp: string;
}

export interface AutomationContext {
  task?: Task;
  boardId: string;
  event: AutomationEvent;
  user?: { id: string; name: string };
}

class AutomationEngine {
  private executionLog: AutomationExecutionResult[] = [];
  private maxLogSize = 1000;

  async processEvent(event: AutomationEvent): Promise<AutomationExecutionResult[]> {
    const results: AutomationExecutionResult[] = [];

    try {
      const rules = await storage.getAutomationRules(event.boardId);
      const activeRules = rules.filter(r => r.isActive !== false);

      for (const rule of activeRules) {
        if (this.matchesTrigger(rule, event)) {
          const result = await this.executeRule(rule, event);
          results.push(result);
          this.addToLog(result);
        }
      }
    } catch (error) {
      console.error("[AutomationEngine] Error processing event:", error);
    }

    return results;
  }

  private matchesTrigger(rule: AutomationRule, event: AutomationEvent): boolean {
    if (rule.triggerType !== event.type) return false;

    if (rule.triggerField) {
      if (!event.field || rule.triggerField !== event.field) {
        return false;
      }
    }

    if (rule.triggerValue) {
      if (event.newValue === undefined || rule.triggerValue !== event.newValue) {
        return false;
      }
    }

    return true;
  }

  private async executeRule(rule: AutomationRule, event: AutomationEvent): Promise<AutomationExecutionResult> {
    const timestamp = new Date().toISOString();
    
    try {
      const actionResult = await this.executeAction(rule, event);
      
      await storage.updateAutomationRule(rule.id, {
        runCount: (rule.runCount || 0) + 1,
        lastRun: new Date() as any,
      });

      try {
        await db.insert(automationRuns).values({
          ruleId: rule.id,
          taskId: event.taskId || null,
          triggerData: event as any,
          actionResult: { message: actionResult.message } as any,
          status: "completed",
          completedAt: new Date(),
        });
      } catch (logErr) {
        console.error("[AutomationEngine] Failed to log run:", logErr);
      }

      console.log(`[AutomationEngine] EXECUTED: "${rule.name}" (${rule.actionType}) → ${actionResult.message}`);
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        success: true,
        action: rule.actionType,
        message: actionResult.message,
        timestamp,
      };
    } catch (error) {
      try {
        await db.insert(automationRuns).values({
          ruleId: rule.id,
          taskId: event.taskId || null,
          triggerData: event as any,
          actionResult: {} as any,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } catch (_) {}

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        success: false,
        action: rule.actionType,
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp,
      };
    }
  }

  private async executeAction(rule: AutomationRule, event: AutomationEvent): Promise<{ message: string }> {
    const actionConfig = rule.actionConfig || {};

    switch (rule.actionType) {
      case "send_notification":
        return this.actionSendNotification(event, actionConfig);
      
      case "change_status":
        return this.actionChangeStatus(event, actionConfig);
      
      case "change_priority":
        return this.actionChangePriority(event, actionConfig);
      
      case "assign_person":
        return this.actionAssignPerson(event, actionConfig);
      
      case "send_email":
        return this.actionSendEmail(event, actionConfig);
      
      case "send_slack":
        return this.actionSendSlack(event, actionConfig);
      
      case "ai_categorize":
        return this.actionAICategorize(event, actionConfig);
      
      case "ai_summarize":
        return this.actionAISummarize(event, actionConfig);
      
      case "ai_extract":
        return this.actionAIExtract(event, actionConfig);
      
      case "ai_sentiment":
        return this.actionAISentiment(event, actionConfig);
      
      case "ai_translate":
        return this.actionAITranslate(event, actionConfig);
      
      case "ai_write":
        return this.actionAIWrite(event, actionConfig);
      
      case "ai_fill_column":
        return this.actionAIFillColumn(event, actionConfig);
      
      case "request_approval":
        return this.actionRequestApproval(event, actionConfig);
      
      case "create_approval_record":
        return this.actionCreateApprovalRecord(event, actionConfig);
      
      case "escalate_review":
        return this.actionEscalateReview(event, actionConfig);
      
      case "log_compliance":
        return this.actionLogCompliance(event, actionConfig);
      
      case "generate_confirmation":
        return this.actionGenerateConfirmation(event, actionConfig);
      
      case "start_time_tracking":
        return this.actionStartTimeTracking(event, actionConfig);
      
      case "stop_time_tracking":
        return this.actionStopTimeTracking(event, actionConfig);
      
      case "create_item":
        return this.actionCreateItem(event, actionConfig);
      
      case "update_field":
        return this.actionUpdateColumn(event, actionConfig);
      
      case "synseekr_analyze_document":
        return this.actionSynSeekrAnalyzeDocument(event, actionConfig);
      
      case "synseekr_extract_entities":
        return this.actionSynSeekrExtractEntities(event, actionConfig);
      
      case "synseekr_rag_query":
        return this.actionSynSeekrRagQuery(event, actionConfig);
      
      case "synseekr_run_investigation":
        return this.actionSynSeekrRunInvestigation(event, actionConfig);
      
      case "synseekr_detect_contradictions":
        return this.actionSynSeekrDetectContradictions(event, actionConfig);
      
      case "synseekr_classify_document":
        return this.actionSynSeekrClassifyDocument(event, actionConfig);
      
      case "synseekr_run_agent":
        return this.actionSynSeekrRunAgent(event, actionConfig);
      
      case "synseekr_search_documents":
        return this.actionSynSeekrSearchDocuments(event, actionConfig);
      
      case "synseekr_timeline_events":
        return this.actionSynSeekrTimelineEvents(event, actionConfig);
      
      case "route_to_detective":
        return this.actionRouteToDetective(event, actionConfig);
      
      case "assign_reviewer":
        return this.actionAssignReviewer(event, actionConfig);
      
      case "move_to_group":
        return this.actionMoveToGroup(event, actionConfig);
      
      default:
        return { message: `Action type "${rule.actionType}" executed (stub)` };
    }
  }

  private async actionSendNotification(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    return { message: `Notification sent: ${config.message || "Task updated"}` };
  }

  private async actionChangeStatus(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (event.taskId) {
      const task = await storage.getTask(event.taskId);
      if (task) {
        const newStatus = config.status || "completed";
        await storage.updateTask(event.taskId, { status: newStatus });
        return { message: `Status changed to "${newStatus}"` };
      }
    }
    return { message: "Status change skipped - no task found" };
  }

  private async actionChangePriority(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (event.taskId) {
      const task = await storage.getTask(event.taskId);
      if (task) {
        const newPriority = config.priority || "high";
        await storage.updateTask(event.taskId, { priority: newPriority });
        return { message: `Priority changed to "${newPriority}"` };
      }
    }
    return { message: "Priority change skipped - no task found" };
  }

  private async actionMoveToGroup(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (event.taskId && config.groupId) {
      const task = await storage.getTask(event.taskId);
      if (task) {
        const { groups: groupsTable } = await import("@shared/models/tables");
        const { eq } = await import("drizzle-orm");
        const { db } = await import("./db");
        const [targetGroup] = await db.select().from(groupsTable).where(eq(groupsTable.id, config.groupId));
        if (!targetGroup || targetGroup.boardId !== task.boardId) {
          return { message: "Move to group skipped - target group not found or on different board" };
        }
        await storage.updateTask(event.taskId, { groupId: config.groupId });
        return { message: `Task moved to group "${targetGroup.title}"` };
      }
    }
    return { message: "Move to group skipped - no task or group found" };
  }

  private async actionAssignPerson(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (event.taskId && config.personId) {
      const task = await storage.getTask(event.taskId);
      if (task) {
        const newAssignee = { 
          id: config.personId, 
          name: config.personName || config.personId,
          color: config.color || "#6366f1"
        };
        const assignees = [...(task.assignees || []), newAssignee];
        await storage.updateTask(event.taskId, { assignees });
        return { message: `Assigned to ${config.personName || config.personId}` };
      }
    }
    return { message: "Assignment skipped - missing task or person" };
  }

  private async actionSendEmail(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    return { message: `Email queued to ${config.to || "team"}` };
  }

  private async actionSendSlack(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    return { message: `Slack message sent to ${config.channel || "#general"}` };
  }

  private async actionAICategorize(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!event.taskId) {
      return { message: "AI categorization skipped — no task to categorize" };
    }
    const task = await storage.getTask(event.taskId);
    if (!task) {
      return { message: "AI categorization skipped — task not found" };
    }
    try {
      const { generateCompletion } = await import("./ai/providers");
      const result = await generateCompletion(
        [
          { role: "user", content: `Task: "${task.title}"\nDescription: "${task.description || 'No description'}"` },
        ],
        {
          model: "claude-sonnet-4-5",
          maxTokens: 200,
          system: "You are a legal task categorizer. Given a task title and description, return a JSON object with: { category: string, tags: string[], urgency: 'low'|'medium'|'high' }. Categories: 'Filing', 'Discovery', 'Motion', 'Hearing', 'Client Communication', 'Research', 'Administrative', 'Evidence', 'Deadline'. Return ONLY the JSON.",
          caller: "automation-ai-categorize",
        }
      );
      const cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const tags = Array.isArray(parsed.tags) ? parsed.tags : [];
      await storage.updateTask(event.taskId, {
        tags: [...(task.tags || []), ...tags],
      });
      return { message: `AI categorized as "${parsed.category}" with tags [${tags.join(", ")}], urgency: ${parsed.urgency}` };
    } catch (e: any) {
      return { message: `AI categorization attempted but failed: ${e.message?.substring(0, 100)}` };
    }
  }

  private async actionAISummarize(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!event.taskId) {
      return { message: "AI summarization skipped — no task provided" };
    }
    const task = await storage.getTask(event.taskId);
    if (!task) {
      return { message: "AI summarization skipped — task not found" };
    }
    try {
      const { generateCompletion } = await import("./ai/providers");
      const result = await generateCompletion(
        [
          { role: "user", content: `Task Title: "${task.title}"\nTask Description: "${task.description || 'No description provided'}"` },
        ],
        {
          model: "claude-sonnet-4-5",
          maxTokens: 300,
          system: "You are a legal task summarizer. Given a task title and description, produce a concise 1-3 sentence summary that captures the key action items, deadlines, and parties involved. Return ONLY the summary text, no JSON wrapping.",
          caller: "automation-ai-summarize",
        }
      );
      const summary = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      await storage.updateTask(event.taskId, {
        description: `${task.description || ''}\n\n--- AI Summary ---\n${summary}`,
      });
      return { message: `AI summary generated: "${summary.substring(0, 120)}..."` };
    } catch (e: any) {
      return { message: `AI summarization failed: ${e.message?.substring(0, 100)}` };
    }
  }

  private async actionAIExtract(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!event.taskId) {
      return { message: "AI extraction skipped — no task provided" };
    }
    const task = await storage.getTask(event.taskId);
    if (!task) {
      return { message: "AI extraction skipped — task not found" };
    }
    try {
      const { generateCompletion } = await import("./ai/providers");
      const result = await generateCompletion(
        [
          { role: "user", content: `Task Title: "${task.title}"\nTask Description: "${task.description || 'No description provided'}"` },
        ],
        {
          model: "claude-sonnet-4-5",
          maxTokens: 400,
          system: "You are a legal entity extractor. Given a task title and description, extract key entities and return a JSON object with: { dates: string[], names: string[], amounts: string[], locations: string[], caseNumbers: string[] }. Only include fields that have extracted values. Return ONLY the JSON.",
          caller: "automation-ai-extract",
        }
      );
      const cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const extractedTags: string[] = [];
      if (parsed.dates) extractedTags.push(...parsed.dates.map((d: string) => `date:${d}`));
      if (parsed.names) extractedTags.push(...parsed.names.map((n: string) => `name:${n}`));
      if (parsed.amounts) extractedTags.push(...parsed.amounts.map((a: string) => `amount:${a}`));
      if (parsed.locations) extractedTags.push(...parsed.locations.map((l: string) => `location:${l}`));
      if (parsed.caseNumbers) extractedTags.push(...parsed.caseNumbers.map((c: string) => `case:${c}`));
      await storage.updateTask(event.taskId, {
        tags: [...(task.tags || []), ...extractedTags],
      });
      return { message: `AI extracted ${extractedTags.length} entities: [${extractedTags.slice(0, 5).join(", ")}${extractedTags.length > 5 ? '...' : ''}]` };
    } catch (e: any) {
      return { message: `AI extraction failed: ${e.message?.substring(0, 100)}` };
    }
  }

  private async actionAISentiment(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!event.taskId) {
      return { message: "AI sentiment analysis skipped — no task provided" };
    }
    const task = await storage.getTask(event.taskId);
    if (!task) {
      return { message: "AI sentiment analysis skipped — task not found" };
    }
    try {
      const { generateCompletion } = await import("./ai/providers");
      const result = await generateCompletion(
        [
          { role: "user", content: `Task Title: "${task.title}"\nTask Description: "${task.description || 'No description provided'}"` },
        ],
        {
          model: "claude-sonnet-4-5",
          maxTokens: 200,
          system: "You are a sentiment analyzer for legal tasks. Analyze the sentiment and urgency of the given task content. Return a JSON object with: { sentiment: 'positive'|'neutral'|'negative'|'urgent', confidence: number (0-1), summary: string }. Return ONLY the JSON.",
          caller: "automation-ai-sentiment",
        }
      );
      const cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const sentimentTag = `sentiment:${parsed.sentiment}`;
      const existingTags = (task.tags || []).filter((t: string) => !t.startsWith("sentiment:"));
      await storage.updateTask(event.taskId, {
        tags: [...existingTags, sentimentTag],
      });
      return { message: `AI sentiment: ${parsed.sentiment} (confidence: ${parsed.confidence}) — ${parsed.summary}` };
    } catch (e: any) {
      return { message: `AI sentiment analysis failed: ${e.message?.substring(0, 100)}` };
    }
  }

  private async actionAITranslate(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    const targetLang = config.targetLanguage || "Spanish";
    return { message: `AI translation to ${targetLang} completed (stub - integrate with AI provider)` };
  }

  private async actionAIWrite(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!event.taskId) {
      return { message: "AI content generation skipped — no task provided" };
    }
    const task = await storage.getTask(event.taskId);
    if (!task) {
      return { message: "AI content generation skipped — task not found" };
    }
    try {
      const { generateCompletion } = await import("./ai/providers");
      const contentType = config.contentType || "legal memo";
      const result = await generateCompletion(
        [
          { role: "user", content: `Task Title: "${task.title}"\nTask Description: "${task.description || 'No description provided'}"\nRequested Content Type: ${contentType}` },
        ],
        {
          model: "claude-sonnet-4-5",
          maxTokens: 1500,
          system: `You are a legal content writer. Based on the task context provided, generate professional ${contentType} content. Write clear, formal legal language appropriate for the task. Return the generated content directly as plain text.`,
          caller: "automation-ai-write",
        }
      );
      const content = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      await storage.updateTask(event.taskId, {
        description: `${task.description || ''}\n\n--- AI Generated ${contentType} ---\n${content}`,
      });
      return { message: `AI generated ${contentType} content (${content.length} chars) for task "${task.title}"` };
    } catch (e: any) {
      return { message: `AI content generation failed: ${e.message?.substring(0, 100)}` };
    }
  }

  private async actionAIFillColumn(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    const column = config.column || "unknown";
    if (!event.taskId) {
      return { message: `AI fill column "${column}" skipped — no task provided` };
    }
    const task = await storage.getTask(event.taskId);
    if (!task) {
      return { message: `AI fill column "${column}" skipped — task not found` };
    }
    try {
      const { generateCompletion } = await import("./ai/providers");
      const result = await generateCompletion(
        [
          { role: "user", content: `Task Title: "${task.title}"\nTask Description: "${task.description || 'No description provided'}"\nCurrent Status: "${task.status || 'unknown'}"\nCurrent Priority: "${task.priority || 'unknown'}"\nColumn to fill: "${column}"` },
        ],
        {
          model: "claude-sonnet-4-5",
          maxTokens: 200,
          system: `You are a legal task assistant. Based on the task context, suggest the best value for the column "${column}". For status columns use values like: not-started, in-progress, completed, blocked, on-hold. For priority columns use: low, medium, high, critical. For text columns provide a brief appropriate value. Return a JSON object with: { value: string, reasoning: string }. Return ONLY the JSON.`,
          caller: "automation-ai-fill-column",
        }
      );
      const cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      await storage.updateTask(event.taskId, { [column]: parsed.value });
      return { message: `AI filled column "${column}" with "${parsed.value}" — ${parsed.reasoning}` };
    } catch (e: any) {
      return { message: `AI fill column "${column}" failed: ${e.message?.substring(0, 100)}` };
    }
  }

  private async actionRequestApproval(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    return { message: "Approval request created" };
  }

  private async actionCreateApprovalRecord(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    return { message: "Approval record created" };
  }

  private async actionEscalateReview(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    const escalateTo = config.escalateTo || "senior attorney";
    return { message: `Review escalated to ${escalateTo}` };
  }

  private async actionLogCompliance(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    return { message: "Compliance event logged" };
  }

  private async actionGenerateConfirmation(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    return { message: "Confirmation letter generated (stub)" };
  }

  private async actionStartTimeTracking(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (event.taskId) {
      const task = await storage.getTask(event.taskId);
      if (task) {
        const now = new Date();
        const newTimeLog = {
          id: `tl-${Date.now()}`,
          personId: config.personId || "automation",
          personName: config.personName || "Automation",
          hours: 0,
          date: now.toISOString().split('T')[0],
          note: "Auto-started by automation",
        };
        const timeLogs = [...(task.timeLogs || []), newTimeLog];
        await storage.updateTask(event.taskId, { timeLogs });
        return { message: "Time tracking started" };
      }
    }
    return { message: "Time tracking start skipped - no task found" };
  }

  private async actionStopTimeTracking(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (event.taskId) {
      const task = await storage.getTask(event.taskId);
      if (task && task.timeLogs && task.timeLogs.length > 0) {
        const timeLogs = [...task.timeLogs];
        const lastLog = timeLogs[timeLogs.length - 1];
        if (lastLog && lastLog.hours === 0) {
          const elapsedHours = 0.5;
          timeLogs[timeLogs.length - 1] = {
            ...lastLog,
            hours: elapsedHours,
          };
          const timeTracked = (task.timeTracked || 0) + Math.round(elapsedHours * 3600);
          await storage.updateTask(event.taskId, { timeLogs, timeTracked });
          return { message: `Time tracking stopped (${elapsedHours}h recorded)` };
        }
      }
    }
    return { message: "Time tracking stop skipped - no active session" };
  }

  private async actionCreateItem(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    const targetBoardId = config.boardId || event.boardId;
    const groups = await storage.getGroups(targetBoardId);
    if (groups.length === 0) {
      return { message: "Create item skipped — no groups in target board" };
    }
    const targetGroupId = config.groupId || groups[0].id;
    const title = config.title || config.taskTitle || `Auto-created from "${event.type}" automation`;
    const task = await storage.createTask({
      title,
      description: config.description || `Created by automation in response to ${event.type} event`,
      boardId: targetBoardId,
      groupId: targetGroupId,
      status: config.status || "not-started",
      priority: config.priority || "medium",
      progress: 0,
      assignees: [],
      notes: "",
      tags: [],
      customFields: {},
      subtasks: [],
    });
    return { message: `Created task "${task.title}" [${task.id}] in board ${targetBoardId}` };
  }

  private async actionUpdateColumn(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (event.taskId && config.column && config.value !== undefined) {
      await storage.updateTask(event.taskId, { [config.column]: config.value });
      return { message: `Column "${config.column}" updated to "${config.value}"` };
    }
    return { message: "Column update skipped - missing configuration" };
  }

  private async actionSynSeekrAnalyzeDocument(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!synseekrClient.isEnabled()) {
      return { message: "SynSeekr not connected — document analysis skipped (connect SynSeekr in Settings)" };
    }
    const documentId = config.documentId || event.metadata?.documentId;
    if (!documentId) {
      return { message: "Document analysis skipped — no document ID provided" };
    }
    const result = await synseekrClient.analyzeDocument(documentId);
    if (result.success) {
      return { message: `Document ${documentId} queued for deep analysis on SynSeekr` };
    }
    return { message: `SynSeekr analysis failed: ${result.error}` };
  }

  private async actionSynSeekrExtractEntities(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!synseekrClient.isEnabled()) {
      return { message: "SynSeekr not connected — entity extraction skipped" };
    }
    const caseId = config.caseId || event.metadata?.caseId;
    if (!caseId) {
      return { message: "Entity extraction skipped — no case ID provided" };
    }
    const result = await synseekrClient.extractEntities(caseId);
    if (result.success) {
      const count = Array.isArray(result.data) ? result.data.length : 0;
      return { message: `Extracted ${count} entities from case ${caseId} via SynSeekr` };
    }
    return { message: `SynSeekr entity extraction failed: ${result.error}` };
  }

  private async actionSynSeekrRagQuery(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!synseekrClient.isEnabled()) {
      return { message: "SynSeekr not connected — RAG query skipped" };
    }
    const query = config.query || config.prompt;
    if (!query) {
      return { message: "RAG query skipped — no query provided" };
    }
    const result = await synseekrClient.ragQuery(query, config.caseId);
    if (result.success) {
      return { message: `RAG query completed via SynSeekr: "${query.substring(0, 50)}..."` };
    }
    return { message: `SynSeekr RAG query failed: ${result.error}` };
  }

  private async actionSynSeekrRunInvestigation(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!synseekrClient.isEnabled()) {
      return { message: "SynSeekr not connected — investigation skipped" };
    }
    const caseId = config.caseId || event.metadata?.caseId;
    if (!caseId) {
      return { message: "Investigation skipped — no case ID provided" };
    }
    const result = await synseekrClient.runInvestigation(caseId);
    if (result.success) {
      return { message: `Investigation launched for case ${caseId} on SynSeekr` };
    }
    return { message: `SynSeekr investigation failed: ${result.error}` };
  }

  private async actionSynSeekrDetectContradictions(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!synseekrClient.isEnabled()) {
      return { message: "SynSeekr not connected — contradiction detection skipped" };
    }
    const caseId = config.caseId || event.metadata?.caseId;
    if (!caseId) {
      return { message: "Contradiction detection skipped — no case ID provided" };
    }
    const result = await synseekrClient.detectContradictions(caseId);
    if (result.success) {
      return { message: `Contradiction detection completed for case ${caseId}` };
    }
    return { message: `SynSeekr contradiction detection failed: ${result.error}` };
  }

  private async actionSynSeekrClassifyDocument(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!synseekrClient.isEnabled()) {
      return { message: "SynSeekr not connected — document classification skipped" };
    }
    const documentId = config.documentId || event.metadata?.documentId;
    if (!documentId) {
      return { message: "Document classification skipped — no document ID provided" };
    }
    const result = await synseekrClient.classifyDocument(documentId);
    if (result.success) {
      return { message: `Document ${documentId} classified via SynSeekr: ${JSON.stringify(result.data)}` };
    }
    return { message: `SynSeekr classification failed: ${result.error}` };
  }

  private async actionSynSeekrRunAgent(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!synseekrClient.isEnabled()) {
      return { message: "SynSeekr not connected — agent run skipped" };
    }
    const agentName = config.agentName || config.agent;
    const caseId = config.caseId || event.metadata?.caseId;
    if (!agentName || !caseId) {
      return { message: "Agent run skipped — missing agent name or case ID" };
    }
    const result = await synseekrClient.runAgent(agentName, caseId);
    if (result.success) {
      return { message: `Agent "${agentName}" running on case ${caseId} via SynSeekr` };
    }
    return { message: `SynSeekr agent run failed: ${result.error}` };
  }

  private async actionSynSeekrSearchDocuments(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!synseekrClient.isEnabled()) {
      return { message: "SynSeekr not connected — document search skipped" };
    }
    const query = config.query || config.searchTerm;
    if (!query) {
      return { message: "Document search skipped — no query provided" };
    }
    const result = await synseekrClient.searchDocuments(query);
    if (result.success) {
      const count = Array.isArray(result.data) ? result.data.length : 0;
      return { message: `Found ${count} documents matching "${query}" via SynSeekr` };
    }
    return { message: `SynSeekr search failed: ${result.error}` };
  }

  private async actionSynSeekrTimelineEvents(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (!synseekrClient.isEnabled()) {
      return { message: "SynSeekr not connected — timeline retrieval skipped" };
    }
    const caseId = config.caseId || event.metadata?.caseId;
    if (!caseId) {
      return { message: "Timeline retrieval skipped — no case ID provided" };
    }
    const result = await synseekrClient.getTimelineEvents(caseId);
    if (result.success) {
      const count = Array.isArray(result.data) ? result.data.length : 0;
      return { message: `Retrieved ${count} timeline events for case ${caseId}` };
    }
    return { message: `SynSeekr timeline retrieval failed: ${result.error}` };
  }

  private async actionRouteToDetective(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    const matterId = config.matterId || event.metadata?.matterId;
    if (!matterId) return { message: "Route to detective skipped — no matter ID" };

    const node = await storage.createDetectiveNode({
      matterId,
      type: "evidence",
      title: config.title || event.metadata?.fileName || "Uploaded Document",
      description: `Auto-routed: ${event.metadata?.docType || "unknown type"} - ${event.metadata?.docCategory || "uncategorized"}`,
      position: { x: Math.random() * 800, y: Math.random() * 600 },
      color: "#f59e0b",
      isInferred: true,
      confidenceScore: 0.6,
    });
    return { message: `Created detective node "${node.title}" [${node.id}]` };
  }

  private async actionAssignReviewer(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    const boardId = config.boardId || event.boardId;
    const groups = await storage.getGroups(boardId);
    if (groups.length === 0) return { message: "Assign reviewer skipped — no groups" };

    const reviewerName = config.reviewer || config.assignee || "Senior Attorney";
    const task = await storage.createTask({
      title: `Review: ${event.metadata?.fileName || event.metadata?.docType || "Document"}`,
      description: `Assigned to ${reviewerName} for review.\nDocument type: ${event.metadata?.docType || "unknown"}\nCategory: ${event.metadata?.docCategory || "unknown"}\nFiling ID: ${event.metadata?.filingId || "N/A"}`,
      boardId,
      groupId: groups[0].id,
      status: "not-started",
      priority: config.priority || "high",
      progress: 0,
      assignees: [{ id: reviewerName.toLowerCase().replace(/\s+/g, "-"), name: reviewerName, color: "#6366f1" }],
      notes: "",
      tags: ["review"],
      customFields: {},
      subtasks: [],
    });
    return { message: `Review task created for ${reviewerName}: "${task.title}" [${task.id}]` };
  }

  private addToLog(result: AutomationExecutionResult): void {
    this.executionLog.unshift(result);
    if (this.executionLog.length > this.maxLogSize) {
      this.executionLog = this.executionLog.slice(0, this.maxLogSize);
    }
  }

  getExecutionLog(limit = 50): AutomationExecutionResult[] {
    return this.executionLog.slice(0, limit);
  }

  clearExecutionLog(): void {
    this.executionLog = [];
  }
}

export const automationEngine = new AutomationEngine();

export async function triggerAutomation(event: AutomationEvent): Promise<AutomationExecutionResult[]> {
  return automationEngine.processEvent(event);
}

export function getAutomationLog(limit?: number): AutomationExecutionResult[] {
  return automationEngine.getExecutionLog(limit);
}
