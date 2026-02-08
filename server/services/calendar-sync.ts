import { db } from "../db";
import {
  calendarEvents,
  caseDeadlines,
  caseActions,
  caseFilings,
  tasks,
  meetings,
  invoices,
  approvalRequests,
  matters,
} from "@shared/models/tables";
import { eq, and, isNotNull, ne } from "drizzle-orm";

export type CalendarSourceType =
  | "efiling-deadline"
  | "efiling-action"
  | "efiling-filing"
  | "board-task"
  | "meeting"
  | "invoice"
  | "approval"
  | "manual";

interface SyncResult {
  created: number;
  updated: number;
  removed: number;
}

function mapEventType(sourceType: CalendarSourceType): string {
  switch (sourceType) {
    case "efiling-deadline": return "deadline";
    case "efiling-action": return "filing";
    case "efiling-filing": return "filing";
    case "board-task": return "deadline";
    case "meeting": return "meeting";
    case "invoice": return "deadline";
    case "approval": return "deadline";
    default: return "other";
  }
}

function sourceColor(sourceType: CalendarSourceType): string {
  switch (sourceType) {
    case "efiling-deadline": return "#f59e0b";
    case "efiling-action": return "#10b981";
    case "efiling-filing": return "#3b82f6";
    case "board-task": return "#8b5cf6";
    case "meeting": return "#06b6d4";
    case "invoice": return "#ef4444";
    case "approval": return "#f97316";
    default: return "#6b7280";
  }
}

export async function syncSingleEvent(
  sourceType: CalendarSourceType,
  sourceId: string,
  data: {
    title: string;
    startDate: string;
    endDate?: string;
    matterId?: string | null;
    description?: string;
    eventType?: string;
    location?: string;
  },
  userId: string = "system"
): Promise<void> {
  if (!data.startDate) return;

  const existing = await db.select().from(calendarEvents)
    .where(and(
      eq(calendarEvents.sourceType, sourceType),
      eq(calendarEvents.sourceId, sourceId),
    )).limit(1);

  if (existing.length > 0) {
    await db.update(calendarEvents)
      .set({
        title: data.title,
        startDate: data.startDate,
        endDate: data.endDate || null,
        matterId: data.matterId || null,
        description: data.description || "",
        eventType: data.eventType || mapEventType(sourceType),
        location: data.location || null,
        color: sourceColor(sourceType),
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.id, existing[0].id));
  } else {
    await db.insert(calendarEvents).values({
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate || null,
      matterId: data.matterId || null,
      description: data.description || "",
      eventType: data.eventType || mapEventType(sourceType),
      allDay: true,
      color: sourceColor(sourceType),
      sourceType,
      sourceId,
      autoSynced: true,
      createdBy: userId,
    });
  }
}

export async function removeSyncedEvent(
  sourceType: CalendarSourceType,
  sourceId: string
): Promise<void> {
  await db.delete(calendarEvents)
    .where(and(
      eq(calendarEvents.sourceType, sourceType),
      eq(calendarEvents.sourceId, sourceId),
    ));
}

export async function syncDeadlineToCalendar(deadlineId: string, userId?: string): Promise<void> {
  const [deadline] = await db.select().from(caseDeadlines)
    .where(eq(caseDeadlines.id, deadlineId));
  if (!deadline || !deadline.dueDate) return;

  const [matter] = deadline.matterId
    ? await db.select().from(matters).where(eq(matters.id, deadline.matterId))
    : [null];

  const prefix = matter ? `[${matter.name}] ` : "";
  await syncSingleEvent("efiling-deadline", deadlineId, {
    title: `${prefix}${deadline.title}`,
    startDate: deadline.dueDate,
    matterId: deadline.matterId,
    description: `${deadline.ruleSource || "Deadline"} | ${deadline.criticality || "standard"} priority${deadline.requiredAction ? ` | Action: ${deadline.requiredAction}` : ""}`,
    eventType: "deadline",
  }, userId);
}

export async function syncActionToCalendar(actionId: string, userId?: string): Promise<void> {
  const [action] = await db.select().from(caseActions)
    .where(eq(caseActions.id, actionId));
  if (!action || !action.dueDate) return;

  const [matter] = action.matterId
    ? await db.select().from(matters).where(eq(matters.id, action.matterId))
    : [null];

  const prefix = matter ? `[${matter.name}] ` : "";
  await syncSingleEvent("efiling-action", actionId, {
    title: `${prefix}${action.title}`,
    startDate: action.dueDate,
    matterId: action.matterId,
    description: `${action.actionType} | Priority: ${action.priority || "medium"}${action.description ? ` | ${action.description}` : ""}`,
    eventType: "filing",
  }, userId);
}

export async function syncFilingToCalendar(filingId: string, userId?: string): Promise<void> {
  const [filing] = await db.select().from(caseFilings)
    .where(eq(caseFilings.id, filingId));
  if (!filing) return;

  const dateToUse = filing.hearingDate || filing.filedDate || filing.servedDate;
  if (!dateToUse) return;

  const [matter] = filing.matterId
    ? await db.select().from(matters).where(eq(matters.id, filing.matterId))
    : [null];

  const prefix = matter ? `[${matter.name}] ` : "";
  const eventType = filing.hearingDate ? "hearing" : "filing";
  await syncSingleEvent("efiling-filing", filingId, {
    title: `${prefix}${filing.docType}: ${filing.originalFileName}`,
    startDate: dateToUse,
    matterId: filing.matterId,
    description: `${filing.docType}${filing.docSubtype ? ` (${filing.docSubtype})` : ""} | ${filing.sourceType}`,
    eventType,
  }, userId);
}

export async function syncTaskToCalendar(taskId: string, userId?: string): Promise<void> {
  const [task] = await db.select().from(tasks)
    .where(eq(tasks.id, taskId));
  if (!task) return;

  const dateToUse = task.dueDate || task.startDate;
  if (!dateToUse) return;

  await syncSingleEvent("board-task", taskId, {
    title: task.title,
    startDate: dateToUse,
    endDate: task.dueDate && task.startDate && task.dueDate !== task.startDate ? task.dueDate : undefined,
    description: `Status: ${task.status || "not-started"} | Priority: ${task.priority || "medium"}`,
    eventType: "deadline",
  }, userId);
}

export async function syncMeetingToCalendar(meetingId: string, userId?: string): Promise<void> {
  const [meeting] = await db.select().from(meetings)
    .where(eq(meetings.id, meetingId));
  if (!meeting || !meeting.date) return;

  const [matter] = meeting.matterId
    ? await db.select().from(matters).where(eq(matters.id, meeting.matterId))
    : [null];

  const prefix = matter ? `[${matter.name}] ` : "";
  await syncSingleEvent("meeting", meetingId, {
    title: `${prefix}${meeting.title}`,
    startDate: meeting.date,
    matterId: meeting.matterId,
    description: meeting.summary || "",
    eventType: "meeting",
  }, userId);
}

export async function syncInvoiceToCalendar(invoiceId: string, userId?: string): Promise<void> {
  const [invoice] = await db.select().from(invoices)
    .where(eq(invoices.id, invoiceId));
  if (!invoice || !invoice.dueDate) return;

  await syncSingleEvent("invoice", invoiceId, {
    title: `Invoice #${invoice.invoiceNumber} Due`,
    startDate: invoice.dueDate,
    matterId: invoice.matterId,
    description: `Amount: $${invoice.totalAmount?.toFixed(2) || "0.00"} | Status: ${invoice.status || "draft"}`,
    eventType: "deadline",
  }, userId);
}

export async function syncApprovalToCalendar(approvalId: string, userId?: string): Promise<void> {
  const [approval] = await db.select().from(approvalRequests)
    .where(eq(approvalRequests.id, approvalId));
  if (!approval || !approval.dueDate) return;

  const [matter] = approval.matterId
    ? await db.select().from(matters).where(eq(matters.id, approval.matterId))
    : [null];

  const prefix = matter ? `[${matter.name}] ` : "";
  await syncSingleEvent("approval", approvalId, {
    title: `${prefix}Approval: ${approval.title}`,
    startDate: approval.dueDate,
    matterId: approval.matterId,
    description: `Requested by: ${approval.requestedByName} | Status: ${approval.status || "pending"}`,
    eventType: "deadline",
  }, userId);
}

export async function fullCalendarSync(userId?: string): Promise<SyncResult> {
  let created = 0;
  let updated = 0;

  const allDeadlines = await db.select().from(caseDeadlines)
    .where(isNotNull(caseDeadlines.dueDate));
  for (const d of allDeadlines) {
    const existed = await db.select({ id: calendarEvents.id }).from(calendarEvents)
      .where(and(eq(calendarEvents.sourceType, "efiling-deadline"), eq(calendarEvents.sourceId, d.id)))
      .limit(1);
    await syncDeadlineToCalendar(d.id, userId);
    if (existed.length > 0) updated++; else created++;
  }

  const allActions = await db.select().from(caseActions)
    .where(isNotNull(caseActions.dueDate));
  for (const a of allActions) {
    const existed = await db.select({ id: calendarEvents.id }).from(calendarEvents)
      .where(and(eq(calendarEvents.sourceType, "efiling-action"), eq(calendarEvents.sourceId, a.id)))
      .limit(1);
    await syncActionToCalendar(a.id, userId);
    if (existed.length > 0) updated++; else created++;
  }

  const allFilings = await db.select().from(caseFilings);
  for (const f of allFilings) {
    const dateToUse = f.hearingDate || f.filedDate || f.servedDate;
    if (!dateToUse) continue;
    const existed = await db.select({ id: calendarEvents.id }).from(calendarEvents)
      .where(and(eq(calendarEvents.sourceType, "efiling-filing"), eq(calendarEvents.sourceId, f.id)))
      .limit(1);
    await syncFilingToCalendar(f.id, userId);
    if (existed.length > 0) updated++; else created++;
  }

  const allTasks = await db.select().from(tasks);
  for (const t of allTasks) {
    if (!t.dueDate && !t.startDate) continue;
    const existed = await db.select({ id: calendarEvents.id }).from(calendarEvents)
      .where(and(eq(calendarEvents.sourceType, "board-task"), eq(calendarEvents.sourceId, t.id)))
      .limit(1);
    await syncTaskToCalendar(t.id, userId);
    if (existed.length > 0) updated++; else created++;
  }

  const allMeetings = await db.select().from(meetings);
  for (const m of allMeetings) {
    if (!m.date) continue;
    const existed = await db.select({ id: calendarEvents.id }).from(calendarEvents)
      .where(and(eq(calendarEvents.sourceType, "meeting"), eq(calendarEvents.sourceId, m.id)))
      .limit(1);
    await syncMeetingToCalendar(m.id, userId);
    if (existed.length > 0) updated++; else created++;
  }

  const allInvoices = await db.select().from(invoices);
  for (const inv of allInvoices) {
    if (!inv.dueDate) continue;
    const existed = await db.select({ id: calendarEvents.id }).from(calendarEvents)
      .where(and(eq(calendarEvents.sourceType, "invoice"), eq(calendarEvents.sourceId, inv.id)))
      .limit(1);
    await syncInvoiceToCalendar(inv.id, userId);
    if (existed.length > 0) updated++; else created++;
  }

  const allApprovals = await db.select().from(approvalRequests);
  for (const a of allApprovals) {
    if (!a.dueDate) continue;
    const existed = await db.select({ id: calendarEvents.id }).from(calendarEvents)
      .where(and(eq(calendarEvents.sourceType, "approval"), eq(calendarEvents.sourceId, a.id)))
      .limit(1);
    await syncApprovalToCalendar(a.id, userId);
    if (existed.length > 0) updated++; else created++;
  }

  const removed = 0;
  return { created, updated, removed };
}
