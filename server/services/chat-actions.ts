import { db } from "../db";
import { actionProposals, actionProposalItems, tasks, boards } from "../../shared/models/tables";
import { eq, and, desc } from "drizzle-orm";
import type { ParsedEntity } from "./chat-parser";

interface ChatScope {
  id: string;
  scopeType: string;
  boardId: string | null;
  clientId: string | null;
  matterId: string | null;
}

const ACTION_VERBS = [
  "file", "serve", "submit", "call", "draft", "review", "prepare",
  "send", "schedule", "complete", "finish", "do", "need", "assign",
  "follow up", "followup", "follow-up", "check", "update", "create",
];

export async function detectActionProposals(
  bodyText: string,
  entities: ParsedEntity[],
  messageId: string,
  chat: ChatScope,
  userId: string,
): Promise<any[]> {
  const proposals: any[] = [];
  const detectedItems: any[] = [];

  const mentions = entities.filter(e => e.type === "mention");
  const dateRefs = entities.filter(e => e.type === "date_ref");
  const tags = entities.filter(e => e.type === "tag");

  const lowerText = bodyText.toLowerCase();
  const hasActionVerb = ACTION_VERBS.some(v => lowerText.includes(v));

  const deadlineTags = tags.filter(t =>
    t.value.toLowerCase() === "deadline" ||
    t.value.toLowerCase() === "due" ||
    t.value.toLowerCase() === "urgent"
  );

  if (mentions.length > 0 && hasActionVerb) {
    for (const mention of mentions) {
      detectedItems.push({
        actionType: "create_task",
        payloadJson: {
          title: extractTaskTitle(bodyText, mention.value),
          description: bodyText,
          boardId: chat.boardId,
          assignees: [{ id: "", name: mention.value }],
          dueDate: dateRefs.length > 0 ? dateRefs[0].value : null,
          priority: deadlineTags.length > 0 ? "high" : "medium",
        },
        confidence: mentions.length === 1 && hasActionVerb ? "high" : "medium",
        rationale: `Message mentions @${mention.value} with action language. ${dateRefs.length > 0 ? `Date reference: ${dateRefs[0].value}` : ""}`,
      });
    }
  }

  if (deadlineTags.length > 0 && dateRefs.length > 0) {
    for (const dateRef of dateRefs) {
      const alreadyProposed = detectedItems.some(
        i => i.actionType === "create_task" && i.payloadJson.dueDate === dateRef.value
      );
      if (!alreadyProposed) {
        detectedItems.push({
          actionType: "create_task",
          payloadJson: {
            title: `Deadline: ${dateRef.value}`,
            description: bodyText,
            boardId: chat.boardId,
            dueDate: dateRef.value,
            priority: "high",
          },
          confidence: "medium",
          rationale: `#deadline tag with date reference: ${dateRef.value}`,
        });
      }
    }
  }

  const invoiceTags = tags.filter(t =>
    t.value.toLowerCase() === "invoice" ||
    t.value.toLowerCase() === "receipt" ||
    t.value.toLowerCase() === "billing"
  );
  if (invoiceTags.length > 0) {
    detectedItems.push({
      actionType: "create_task",
      payloadJson: {
        title: `Process ${invoiceTags[0].value}: ${bodyText.substring(0, 60)}`,
        description: bodyText,
        boardId: chat.boardId,
        status: "not-started",
        priority: "medium",
      },
      confidence: "medium",
      rationale: `#${invoiceTags[0].value} tag detected — may need billing/expense processing`,
    });
  }

  if (detectedItems.length > 0) {
    const scopeType = chat.scopeType;
    const scopeId = chat.boardId || chat.clientId || chat.matterId || chat.id;

    const [proposal] = await db.insert(actionProposals).values({
      scopeType,
      scopeId,
      chatId: chat.id,
      sourceMessageId: messageId,
      createdByUserId: userId,
      status: "awaiting_approval",
      summaryText: `Detected ${detectedItems.length} potential action${detectedItems.length > 1 ? "s" : ""} from chat message`,
    }).returning();

    for (const item of detectedItems) {
      await db.insert(actionProposalItems).values({
        proposalId: proposal.id,
        actionType: item.actionType,
        payloadJson: item.payloadJson,
        confidence: item.confidence,
        rationale: item.rationale,
      });
    }

    const items = await db.select().from(actionProposalItems)
      .where(eq(actionProposalItems.proposalId, proposal.id));

    proposals.push({ ...proposal, items });
  }

  return proposals;
}

function extractTaskTitle(text: string, assignee: string): string {
  let title = text.replace(/@\w+/g, "").replace(/#\w+/g, "").trim();
  if (title.length > 80) {
    title = title.substring(0, 77) + "...";
  }
  if (!title) {
    title = `Task for ${assignee}`;
  }
  return title;
}
