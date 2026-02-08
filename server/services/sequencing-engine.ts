import { db } from "../db";
import { eq, and, lte, asc, desc, isNull, or } from "drizzle-orm";
import {
  caseActions,
  caseDeadlines,
  caseFilings,
  matters,
  tasks,
  boards,
  groups,
} from "@shared/models/tables";
import type { CaseDeadline, CaseFiling, InsertCaseAction } from "@shared/models/tables";

export interface NextAction {
  title: string;
  description: string;
  actionType: string;
  requiredDocType: string | null;
  dueDate: string | null;
  daysRemaining: number;
  priority: string;
  status: string;
  deadlineId: string | null;
  filingId: string | null;
}

const STATUS_PIPELINE = ["draft", "review", "final", "file", "served", "confirmed"];

function getDaysRemaining(dueDate: string | null): number {
  if (!dueDate) return 999;
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getPriority(daysRemaining: number, criticality: string): string {
  if (daysRemaining <= 0) return "critical";
  if (daysRemaining <= 3) return "urgent";
  if (daysRemaining <= 7) return "high";
  if (daysRemaining <= 14) return "medium";
  return criticality === "hard" ? "medium" : "low";
}

export async function generateNextActions(matterId: string): Promise<NextAction[]> {
  const pendingDeadlines = await db.select().from(caseDeadlines)
    .where(
      and(
        eq(caseDeadlines.matterId, matterId),
        or(
          eq(caseDeadlines.status, "pending"),
          eq(caseDeadlines.status, "in-progress")
        )
      )
    )
    .orderBy(asc(caseDeadlines.dueDate));

  const actions: NextAction[] = [];

  for (const deadline of pendingDeadlines) {
    const daysRemaining = getDaysRemaining(deadline.dueDate);
    const priority = getPriority(daysRemaining, deadline.criticality || "hard");

    const existingActions = await db.select().from(caseActions)
      .where(
        and(
          eq(caseActions.deadlineId, deadline.id),
          eq(caseActions.matterId, matterId)
        )
      );

    if (existingActions.length === 0) {
      actions.push({
        title: deadline.requiredAction || deadline.title,
        description: `Deadline: ${deadline.title}\nRule: ${deadline.ruleSource || "N/A"}\nAnchor: ${deadline.anchorEvent || "N/A"} (${deadline.anchorDate || "N/A"})`,
        actionType: mapDeadlineToActionType(deadline),
        requiredDocType: deadline.resultDocType || null,
        dueDate: deadline.dueDate,
        daysRemaining,
        priority,
        status: "draft",
        deadlineId: deadline.id,
        filingId: deadline.filingId || null,
      });
    }
  }

  actions.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return actions;
}

function mapDeadlineToActionType(deadline: CaseDeadline): string {
  const action = (deadline.requiredAction || "").toLowerCase();
  if (action.includes("file")) return "file";
  if (action.includes("serve")) return "serve";
  if (action.includes("draft")) return "draft";
  if (action.includes("review")) return "review";
  if (action.includes("prepare")) return "prepare";
  if (action.includes("respond") || action.includes("response")) return "draft";
  return "task";
}

export async function createActionsFromDeadlines(
  matterId: string,
  assignedTo?: string
): Promise<string[]> {
  const nextActions = await generateNextActions(matterId);
  const actionIds: string[] = [];

  for (const action of nextActions) {
    const [created] = await db.insert(caseActions).values({
      matterId,
      deadlineId: action.deadlineId,
      filingId: action.filingId,
      title: action.title,
      description: action.description,
      actionType: action.actionType,
      requiredDocType: action.requiredDocType,
      status: action.status,
      priority: action.priority,
      dueDate: action.dueDate,
      daysRemaining: action.daysRemaining,
      assignedTo: assignedTo || null,
      auditTrail: [
        {
          event: "action_created",
          timestamp: new Date().toISOString(),
          source: "sequencing_engine",
          details: `Auto-generated from deadline`,
        },
      ],
    }).returning();

    actionIds.push(created.id);
  }

  return actionIds;
}

export async function createBoardTasksFromActions(
  matterId: string,
  boardId: string
): Promise<void> {
  const pendingActions = await db.select().from(caseActions)
    .where(
      and(
        eq(caseActions.matterId, matterId),
        isNull(caseActions.taskId)
      )
    );

  if (pendingActions.length === 0) return;

  let [actionGroup] = await db.select().from(groups)
    .where(
      and(
        eq(groups.boardId, boardId),
        eq(groups.title, "Action Items")
      )
    ).limit(1);

  if (!actionGroup) {
    [actionGroup] = await db.insert(groups).values({
      title: "Action Items",
      color: "#ef4444",
      boardId,
      order: 100,
    }).returning();
  }

  for (const action of pendingActions) {
    const [task] = await db.insert(tasks).values({
      title: action.title,
      description: action.description || "",
      status: "not-started",
      priority: action.priority || "medium",
      dueDate: action.dueDate,
      boardId,
      groupId: actionGroup.id,
      assignees: action.assignedTo ? [action.assignedTo] : [],
    }).returning();

    await db.update(caseActions)
      .set({ taskId: task.id })
      .where(eq(caseActions.id, action.id));
  }
}

export async function updateActionStatus(
  actionId: string,
  newStatus: string,
  userId?: string
): Promise<void> {
  const [action] = await db.select().from(caseActions)
    .where(eq(caseActions.id, actionId));

  if (!action) return;

  const currentTrail = (action.auditTrail as any[]) || [];
  currentTrail.push({
    event: "status_change",
    timestamp: new Date().toISOString(),
    source: userId || "system",
    details: `Status changed from ${action.status} to ${newStatus}`,
  });

  await db.update(caseActions)
    .set({
      status: newStatus,
      auditTrail: currentTrail,
      updatedAt: new Date(),
    })
    .where(eq(caseActions.id, actionId));

  if (newStatus === "served" || newStatus === "confirmed") {
    if (action.deadlineId) {
      await db.update(caseDeadlines)
        .set({
          status: "completed",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(caseDeadlines.id, action.deadlineId));
    }
  }

  if (action.taskId) {
    const taskStatusMap: Record<string, string> = {
      draft: "not-started",
      review: "in-progress",
      final: "in-progress",
      file: "in-progress",
      served: "done",
      confirmed: "done",
    };

    await db.update(tasks)
      .set({
        status: taskStatusMap[newStatus] || "not-started",
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, action.taskId));
  }
}

export function getCasePhase(filings: CaseFiling[]): string {
  const types = filings.map((f) => f.docType);

  if (types.some((t) => t === "Settlement/Stipulation")) return "settlement";
  if (types.some((t) => t === "Scheduling Order") && types.some((t) => t.includes("Discovery"))) return "discovery";
  if (types.some((t) => t === "Motion")) return "motions";
  if (types.some((t) => t === "Discovery Request" || t === "Discovery Response")) return "discovery";
  if (types.some((t) => t === "Answer")) return "post-answer";
  if (types.some((t) => t === "Complaint/Petition")) return "pleadings";

  return "initial";
}
