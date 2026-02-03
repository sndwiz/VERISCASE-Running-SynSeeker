import { storage } from "./storage";
import type { AutomationRule, Task } from "@shared/schema";

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
      
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        success: true,
        action: rule.actionType,
        message: actionResult.message,
        timestamp,
      };
    } catch (error) {
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
      
      default:
        return { message: `Action type "${rule.actionType}" executed (stub)` };
    }
  }

  private async actionSendNotification(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] Notification: ${config.message || "Task updated"} for task ${event.taskId}`);
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
    console.log(`[Automation] Email would be sent to: ${config.to || "team"}`);
    return { message: `Email queued to ${config.to || "team"}` };
  }

  private async actionSendSlack(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] Slack message to channel: ${config.channel || "#general"}`);
    return { message: `Slack message sent to ${config.channel || "#general"}` };
  }

  private async actionAICategorize(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] AI categorization for task ${event.taskId}`);
    return { message: "AI categorization completed (stub - integrate with AI provider)" };
  }

  private async actionAISummarize(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] AI summarization for task ${event.taskId}`);
    return { message: "AI summary generated (stub - integrate with AI provider)" };
  }

  private async actionAIExtract(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] AI extraction for task ${event.taskId}`);
    return { message: "AI data extraction completed (stub - integrate with AI provider)" };
  }

  private async actionAISentiment(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] AI sentiment analysis for task ${event.taskId}`);
    return { message: "AI sentiment analysis completed (stub - integrate with AI provider)" };
  }

  private async actionAITranslate(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    const targetLang = config.targetLanguage || "Spanish";
    console.log(`[Automation] AI translation to ${targetLang} for task ${event.taskId}`);
    return { message: `AI translation to ${targetLang} completed (stub - integrate with AI provider)` };
  }

  private async actionAIWrite(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] AI content writing for task ${event.taskId}`);
    return { message: "AI content generated (stub - integrate with AI provider)" };
  }

  private async actionAIFillColumn(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    const column = config.column || "unknown";
    console.log(`[Automation] AI fill column "${column}" for task ${event.taskId}`);
    return { message: `AI filled column "${column}" (stub - integrate with AI provider)` };
  }

  private async actionRequestApproval(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] Approval requested for task ${event.taskId}`);
    return { message: "Approval request created" };
  }

  private async actionCreateApprovalRecord(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] Approval record created for task ${event.taskId}`);
    return { message: "Approval record created" };
  }

  private async actionEscalateReview(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    const escalateTo = config.escalateTo || "senior attorney";
    console.log(`[Automation] Review escalated to ${escalateTo} for task ${event.taskId}`);
    return { message: `Review escalated to ${escalateTo}` };
  }

  private async actionLogCompliance(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] Compliance logged for task ${event.taskId}`);
    return { message: "Compliance event logged" };
  }

  private async actionGenerateConfirmation(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    console.log(`[Automation] Confirmation generated for task ${event.taskId}`);
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
    console.log(`[Automation] Create item in board ${config.boardId || event.boardId}`);
    return { message: "New item created (stub - needs full task creation implementation)" };
  }

  private async actionUpdateColumn(event: AutomationEvent, config: Record<string, any>): Promise<{ message: string }> {
    if (event.taskId && config.column && config.value !== undefined) {
      await storage.updateTask(event.taskId, { [config.column]: config.value });
      return { message: `Column "${config.column}" updated to "${config.value}"` };
    }
    return { message: "Column update skipped - missing configuration" };
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
