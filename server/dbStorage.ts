import { eq, desc, asc, and, or, sql, inArray, isNull } from "drizzle-orm";
import { db } from "./db";
import * as tables from "@shared/models/tables";
import type { IStorage } from "./storage";
import type {
  Board,
  Group,
  Task,
  InsertBoard,
  InsertGroup,
  InsertTask,
  ColumnDef,
  AIConversation,
  AIMessage,
  InsertAIConversation,
  InsertAIMessage,
  EvidenceVaultFile,
  InsertEvidenceVaultFile,
  OCRJob,
  InsertOCRJob,
  TimelineEvent,
  InsertTimelineEvent,
  Thread,
  InsertThread,
  ThreadMessage,
  InsertThreadMessage,
  ThreadDecision,
  InsertThreadDecision,
  MatterContact,
  InsertMatterContact,
  Client,
  InsertClient,
  Matter,
  InsertMatter,
  ResearchResult,
  InsertResearchResult,
  AutomationRule,
  InsertAutomationRule,
  AutomationRun,
  DetectiveNode,
  InsertDetectiveNode,
  DetectiveConnection,
  InsertDetectiveConnection,
  Person,
  FileItem,
  InsertFileItem,
  DocProfile,
  InsertDocProfile,
  FilingTag,
  InsertFilingTag,
  DocumentTemplate,
  InsertDocumentTemplate,
  GeneratedDocument,
  InsertGeneratedDocument,
  DocumentApproval,
  InsertDocumentApproval,
  UpdateDocumentApproval,
  DocumentApprovalAudit,
  ClientForm,
  InsertClientForm,
  ClientFormSubmission,
  InsertClientFormSubmission,
  Meeting,
  InsertMeeting,
  PeopleOrg,
  InsertPeopleOrg,
  FileItemWithProfile,
  TimeEntry,
  InsertTimeEntry,
  CalendarEvent,
  InsertCalendarEvent,
  ApprovalRequest,
  InsertApprovalRequest,
  ApprovalComment,
  InsertApprovalComment,
  AuditLog,
  InsertAuditLog,
  SecurityEvent,
  InsertSecurityEvent,
  Expense,
  InsertExpense,
  Invoice,
  InsertInvoice,
  InvoiceLineItem,
  Payment,
  InsertPayment,
  TrustTransaction,
  InsertTrustTransaction,
} from "@shared/schema";
import { randomUUID } from "crypto";

const defaultColumns: ColumnDef[] = [
  { id: "status", title: "Status", type: "status", width: 120, visible: true, order: 0 },
  { id: "priority", title: "Priority", type: "priority", width: 100, visible: true, order: 1 },
  { id: "dueDate", title: "Due Date", type: "date", width: 100, visible: true, order: 2 },
  { id: "assignees", title: "Assignee", type: "person", width: 100, visible: true, order: 3 },
  { id: "progress", title: "Progress", type: "progress", width: 120, visible: true, order: 4 },
];

function toISOString(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export class DbStorage implements IStorage {
  private initialized = false;

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    // Check if we have any boards - if not, seed sample data
    const existingBoards = await db.select().from(tables.boards).limit(1);
    if (existingBoards.length === 0) {
      await this.seedSampleData();
    }
  }

  private async seedSampleData(): Promise<void> {
    console.log("Seeding sample data...");
    
    // Create a sample board
    const board = await this.createBoard({
      name: "Mercer Case - Master Board",
      description: "State of Utah v. Unknown - Death of Nathan Mercer | Track all investigation tasks, motions, and deadlines",
      color: "#dc2626",
      icon: "layout-grid",
    });

    // Create sample groups
    const groupsData = [
      { title: "Critical - Immediate", color: "#dc2626", order: 0 },
      { title: "Active Investigation", color: "#f59e0b", order: 1 },
      { title: "Discovery & Motions", color: "#3b82f6", order: 2 },
      { title: "Research & Analysis", color: "#8b5cf6", order: 3 },
      { title: "Completed", color: "#10b981", order: 4 },
    ];

    const groupIds: string[] = [];
    for (const g of groupsData) {
      const group = await this.createGroup({
        ...g,
        collapsed: false,
        boardId: board.id,
      });
      groupIds.push(group.id);
    }

    // Create sample tasks (placeholder - full tasks added by seedDemoData)
    const sampleTasks: { title: string; status: any; priority: any; groupIdx: number; progress: number }[] = [];

    for (const t of sampleTasks) {
      await this.createTask({
        title: t.title,
        status: t.status,
        priority: t.priority,
        progress: t.progress,
        boardId: board.id,
        groupId: groupIds[t.groupIdx],
        description: "",
        tags: [],
        assignees: [],
        notes: "",
        customFields: {},
        subtasks: [],
      });
    }

    // Create a second board for evidence tracking
    const board2 = await this.createBoard({
      name: "Evidence & Discovery Tracker",
      description: "Track evidence collection, chain of custody, and discovery requests for Mercer investigation",
      color: "#7c3aed",
      icon: "file-text",
    });

    const evidenceGroups = [
      { title: "Awaiting Analysis", color: "#f59e0b", order: 0 },
      { title: "Under Review", color: "#3b82f6", order: 1 },
      { title: "Processed", color: "#10b981", order: 2 },
    ];

    for (const g of evidenceGroups) {
      await this.createGroup({
        ...g,
        collapsed: false,
        boardId: board2.id,
      });
    }

    console.log("Sample data seeded successfully!");
  }

  // ============ BOARD METHODS ============
  private rowToBoard(r: any): Board {
    return {
      id: r.id,
      name: r.name,
      description: r.description || "",
      color: r.color || "#6366f1",
      icon: r.icon || "layout-grid",
      columns: (r.columns as ColumnDef[]) || [],
      clientId: r.clientId || null,
      matterId: r.matterId || null,
      workspaceId: r.workspaceId || null,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    };
  }

  async getBoards(): Promise<Board[]> {
    await this.ensureInitialized();
    const rows = await db.select().from(tables.boards).orderBy(asc(tables.boards.createdAt));
    return rows.map(r => this.rowToBoard(r));
  }

  async getBoardsByClient(clientId: string): Promise<Board[]> {
    const rows = await db.select().from(tables.boards)
      .where(eq(tables.boards.clientId, clientId))
      .orderBy(asc(tables.boards.createdAt));
    return rows.map(r => this.rowToBoard(r));
  }

  async getBoardsByMatter(matterId: string): Promise<Board[]> {
    const rows = await db.select().from(tables.boards)
      .where(eq(tables.boards.matterId, matterId))
      .orderBy(asc(tables.boards.createdAt));
    return rows.map(r => this.rowToBoard(r));
  }

  async getBoardsByWorkspace(workspaceId: string): Promise<Board[]> {
    const rows = await db.select().from(tables.boards)
      .where(eq(tables.boards.workspaceId, workspaceId))
      .orderBy(asc(tables.boards.createdAt));
    return rows.map(r => this.rowToBoard(r));
  }

  async getBoardsByWorkspaceIds(workspaceIds: string[]): Promise<Board[]> {
    const conditions = [isNull(tables.boards.workspaceId)];
    if (workspaceIds.length > 0) {
      conditions.push(inArray(tables.boards.workspaceId, workspaceIds));
    }
    const rows = await db.select().from(tables.boards)
      .where(or(...conditions))
      .orderBy(asc(tables.boards.createdAt));
    return rows.map(r => this.rowToBoard(r));
  }

  async getBoard(id: string): Promise<Board | undefined> {
    const [row] = await db.select().from(tables.boards).where(eq(tables.boards.id, id));
    if (!row) return undefined;
    return this.rowToBoard(row);
  }

  async createBoard(data: InsertBoard): Promise<Board> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.boards).values({
      id,
      name: data.name,
      description: data.description || "",
      color: data.color || "#6366f1",
      icon: data.icon || "layout-grid",
      columns: (data.columns as any) || defaultColumns,
      clientId: data.clientId || null,
      matterId: data.matterId || null,
      workspaceId: data.workspaceId || null,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.rowToBoard(row);
  }

  async updateBoard(id: string, data: Partial<Board>): Promise<Board | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.columns) updateData.columns = data.columns as any;
    const [row] = await db.update(tables.boards).set(updateData).where(eq(tables.boards.id, id)).returning();
    if (!row) return undefined;
    return this.rowToBoard(row);
  }

  async deleteBoard(id: string): Promise<boolean> {
    const result = await db.delete(tables.boards).where(eq(tables.boards.id, id));
    return true;
  }

  // ============ GROUP METHODS ============
  async getGroups(boardId: string): Promise<Group[]> {
    const rows = await db.select().from(tables.groups).where(eq(tables.groups.boardId, boardId)).orderBy(asc(tables.groups.order));
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      color: r.color || "#6366f1",
      collapsed: r.collapsed || false,
      order: r.order || 0,
      boardId: r.boardId,
    }));
  }

  async getGroup(id: string): Promise<Group | undefined> {
    const [row] = await db.select().from(tables.groups).where(eq(tables.groups.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      title: row.title,
      color: row.color || "#6366f1",
      collapsed: row.collapsed || false,
      order: row.order || 0,
      boardId: row.boardId,
    };
  }

  async createGroup(data: InsertGroup): Promise<Group> {
    const id = randomUUID();
    const existingGroups = await this.getGroups(data.boardId);
    const [row] = await db.insert(tables.groups).values({
      id,
      title: data.title,
      color: data.color || "#6366f1",
      collapsed: data.collapsed || false,
      order: data.order ?? existingGroups.length,
      boardId: data.boardId,
    }).returning();
    return {
      id: row.id,
      title: row.title,
      color: row.color || "#6366f1",
      collapsed: row.collapsed || false,
      order: row.order || 0,
      boardId: row.boardId,
    };
  }

  async updateGroup(id: string, data: Partial<Group>): Promise<Group | undefined> {
    const [row] = await db.update(tables.groups).set(data).where(eq(tables.groups.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      title: row.title,
      color: row.color || "#6366f1",
      collapsed: row.collapsed || false,
      order: row.order || 0,
      boardId: row.boardId,
    };
  }

  async deleteGroup(id: string): Promise<boolean> {
    await db.delete(tables.groups).where(eq(tables.groups.id, id));
    return true;
  }

  // ============ TASK METHODS ============
  async getTasks(boardId?: string): Promise<Task[]> {
    let rows;
    if (boardId) {
      rows = await db.select().from(tables.tasks).where(eq(tables.tasks.boardId, boardId)).orderBy(asc(tables.tasks.order));
    } else {
      rows = await db.select().from(tables.tasks).orderBy(asc(tables.tasks.order));
    }
    return rows.map(r => this.rowToTask(r));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [row] = await db.select().from(tables.tasks).where(eq(tables.tasks.id, id));
    if (!row) return undefined;
    return this.rowToTask(row);
  }

  async getRecentTasks(limit: number = 10): Promise<Task[]> {
    const rows = await db.select().from(tables.tasks).orderBy(desc(tables.tasks.updatedAt)).limit(limit);
    return rows.map(r => this.rowToTask(r));
  }

  private rowToTask(r: any): Task {
    return {
      id: r.id,
      title: r.title,
      description: r.description || "",
      status: r.status || "not-started",
      priority: r.priority || "medium",
      dueDate: r.dueDate || null,
      startDate: r.startDate || null,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
      assignees: (r.assignees as Person[]) || [],
      owner: (r.owner as Person | null) || null,
      progress: r.progress || 0,
      timeEstimate: r.timeEstimate || null,
      timeTracked: r.timeTracked || 0,
      timeLogs: (r.timeLogs as any[]) || [],
      files: (r.files as any[]) || [],
      boardId: r.boardId,
      groupId: r.groupId,
      order: r.order || 0,
      parentTaskId: r.parentTaskId || null,
      tags: (r.tags as string[]) || [],
      notes: r.notes || "",
      lastUpdatedBy: r.lastUpdatedBy || null,
      customFields: (r.customFields as Record<string, any>) || {},
      subtasks: (r.subtasks as { id: string; title: string; completed: boolean }[]) || [],
    };
  }

  async createTask(data: InsertTask): Promise<Task> {
    const id = randomUUID();
    const now = new Date();
    const existingTasks = await this.getTasks(data.boardId);
    const [row] = await db.insert(tables.tasks).values({
      id,
      title: data.title,
      description: data.description || "",
      status: data.status || "not-started",
      priority: data.priority || "medium",
      dueDate: data.dueDate || null,
      startDate: data.startDate || null,
      createdAt: now,
      updatedAt: now,
      assignees: (data.assignees as any) || [],
      owner: (data.owner as any) || null,
      progress: data.progress || 0,
      timeEstimate: data.timeEstimate || null,
      timeTracked: 0,
      timeLogs: [],
      files: [],
      boardId: data.boardId,
      groupId: data.groupId,
      order: existingTasks.length,
      parentTaskId: data.parentTaskId || null,
      tags: (data.tags as any) || [],
      notes: data.notes || "",
      lastUpdatedBy: null,
      customFields: (data.customFields as any) || {},
    }).returning();
    return this.rowToTask(row);
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.assignees) updateData.assignees = data.assignees as any;
    if (data.owner !== undefined) updateData.owner = data.owner as any;
    if (data.timeLogs) updateData.timeLogs = data.timeLogs as any;
    if (data.files) updateData.files = data.files as any;
    if (data.tags) updateData.tags = data.tags as any;
    if (data.customFields) updateData.customFields = data.customFields as any;
    if (data.subtasks) updateData.subtasks = data.subtasks as any;
    const [row] = await db.update(tables.tasks).set(updateData).where(eq(tables.tasks.id, id)).returning();
    if (!row) return undefined;
    return this.rowToTask(row);
  }

  async deleteTask(id: string): Promise<boolean> {
    await db.delete(tables.tasks).where(eq(tables.tasks.id, id));
    return true;
  }

  // ============ AI CONVERSATION METHODS ============
  async getAIConversations(): Promise<AIConversation[]> {
    const rows = await db.select().from(tables.aiConversations).orderBy(desc(tables.aiConversations.updatedAt));
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      provider: (r.provider as any) || "anthropic",
      model: r.model || "claude-sonnet-4-5",
      matterId: r.matterId || undefined,
      boardId: r.boardId || undefined,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async getAIConversation(id: string): Promise<AIConversation | undefined> {
    const [row] = await db.select().from(tables.aiConversations).where(eq(tables.aiConversations.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      title: row.title,
      provider: (row.provider as any) || "anthropic",
      model: row.model || "claude-sonnet-4-5",
      matterId: row.matterId || undefined,
      boardId: row.boardId || undefined,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createAIConversation(data: InsertAIConversation): Promise<AIConversation> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.aiConversations).values({
      id,
      title: data.title,
      provider: data.provider || "anthropic",
      model: data.model || "claude-sonnet-4-5",
      matterId: data.matterId,
      boardId: data.boardId,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      title: row.title,
      provider: (row.provider as any) || "anthropic",
      model: row.model || "claude-sonnet-4-5",
      matterId: row.matterId || undefined,
      boardId: row.boardId || undefined,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async deleteAIConversation(id: string): Promise<boolean> {
    await db.delete(tables.aiConversations).where(eq(tables.aiConversations.id, id));
    return true;
  }

  async getAIMessages(conversationId: string): Promise<AIMessage[]> {
    const rows = await db.select().from(tables.aiMessages).where(eq(tables.aiMessages.conversationId, conversationId)).orderBy(asc(tables.aiMessages.createdAt));
    return rows.map(r => ({
      id: r.id,
      conversationId: r.conversationId,
      role: r.role as any,
      content: r.content,
      attachments: r.attachments as any,
      metadata: r.metadata as any,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
    }));
  }

  async createAIMessage(data: InsertAIMessage): Promise<AIMessage> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.aiMessages).values({
      id,
      conversationId: data.conversationId,
      role: data.role,
      content: data.content,
      attachments: data.attachments as any,
      metadata: data.metadata as any,
      createdAt: now,
    }).returning();
    // Update conversation updatedAt
    await db.update(tables.aiConversations).set({ updatedAt: now }).where(eq(tables.aiConversations.id, data.conversationId));
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role as any,
      content: row.content,
      attachments: row.attachments as any,
      metadata: row.metadata as any,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
    };
  }

  // ============ EVIDENCE VAULT METHODS ============
  async getEvidenceVaultFiles(matterId: string): Promise<EvidenceVaultFile[]> {
    const rows = await db.select().from(tables.evidenceVaultFiles).where(eq(tables.evidenceVaultFiles.matterId, matterId));
    return rows.map(r => this.rowToEvidenceFile(r));
  }

  async getEvidenceVaultFile(id: string): Promise<EvidenceVaultFile | undefined> {
    const [row] = await db.select().from(tables.evidenceVaultFiles).where(eq(tables.evidenceVaultFiles.id, id));
    if (!row) return undefined;
    return this.rowToEvidenceFile(row);
  }

  private rowToEvidenceFile(r: any): EvidenceVaultFile {
    return {
      id: r.id,
      matterId: r.matterId,
      originalName: r.originalName,
      originalUrl: r.originalUrl,
      originalHash: r.originalHash,
      originalSize: r.originalSize,
      originalMimeType: r.originalMimeType,
      evidenceType: r.evidenceType || "document",
      confidentiality: r.confidentiality || "confidential",
      description: r.description || "",
      tags: (r.tags as string[]) || [],
      uploadedBy: r.uploadedBy,
      uploadedAt: toISOString(r.uploadedAt) || new Date().toISOString(),
      chainOfCustody: (r.chainOfCustody as any[]) || [],
      ocrJobId: r.ocrJobId || undefined,
      extractedText: r.extractedText || undefined,
      aiAnalysis: r.aiAnalysis as any || undefined,
      metadata: (r.metadata as Record<string, any>) || {},
    };
  }

  async createEvidenceVaultFile(data: InsertEvidenceVaultFile): Promise<EvidenceVaultFile> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.evidenceVaultFiles).values({
      id,
      matterId: data.matterId,
      originalName: data.originalName,
      originalUrl: data.originalUrl,
      originalHash: data.originalHash,
      originalSize: data.originalSize,
      originalMimeType: data.originalMimeType,
      evidenceType: data.evidenceType || "document",
      confidentiality: data.confidentiality || "confidential",
      description: data.description || "",
      tags: data.tags as any || [],
      uploadedBy: data.uploadedBy,
      uploadedAt: now,
      chainOfCustody: [{ action: "uploaded", by: data.uploadedBy, at: now.toISOString() }] as any,
      metadata: {},
    }).returning();
    return this.rowToEvidenceFile(row);
  }

  async updateEvidenceVaultFile(id: string, data: Partial<EvidenceVaultFile>): Promise<EvidenceVaultFile | undefined> {
    const safeUpdate: any = {};
    if (data.evidenceType !== undefined) safeUpdate.evidenceType = data.evidenceType;
    if (data.confidentiality !== undefined) safeUpdate.confidentiality = data.confidentiality;
    if (data.description !== undefined) safeUpdate.description = data.description;
    if (data.tags !== undefined) safeUpdate.tags = data.tags as any;
    if (data.extractedText !== undefined) safeUpdate.extractedText = data.extractedText;
    if (data.aiAnalysis !== undefined) safeUpdate.aiAnalysis = data.aiAnalysis as any;
    if (data.ocrJobId !== undefined) safeUpdate.ocrJobId = data.ocrJobId;
    
    const [row] = await db.update(tables.evidenceVaultFiles).set(safeUpdate).where(eq(tables.evidenceVaultFiles.id, id)).returning();
    if (!row) return undefined;
    return this.rowToEvidenceFile(row);
  }

  async addChainOfCustodyEntry(id: string, action: string, by: string, notes?: string): Promise<EvidenceVaultFile | undefined> {
    const file = await this.getEvidenceVaultFile(id);
    if (!file) return undefined;
    const newEntry = { action, by, at: new Date().toISOString(), notes };
    const updatedChain = [...file.chainOfCustody, newEntry];
    const [row] = await db.update(tables.evidenceVaultFiles).set({ chainOfCustody: updatedChain as any }).where(eq(tables.evidenceVaultFiles.id, id)).returning();
    if (!row) return undefined;
    return this.rowToEvidenceFile(row);
  }

  // ============ OCR JOBS METHODS ============
  async getOCRJobs(matterId?: string): Promise<OCRJob[]> {
    let rows;
    if (matterId) {
      rows = await db.select().from(tables.ocrJobs).where(eq(tables.ocrJobs.matterId, matterId));
    } else {
      rows = await db.select().from(tables.ocrJobs);
    }
    return rows.map(r => ({
      id: r.id,
      fileId: r.fileId,
      matterId: r.matterId,
      status: (r.status as any) || "pending",
      provider: r.provider || "openai-vision",
      confidence: r.confidence || undefined,
      extractedText: r.extractedText || undefined,
      pageCount: r.pageCount || undefined,
      processingTime: r.processingTime || undefined,
      error: r.error || undefined,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      completedAt: r.completedAt ? toISOString(r.completedAt) || undefined : undefined,
    }));
  }

  async getOCRJob(id: string): Promise<OCRJob | undefined> {
    const [row] = await db.select().from(tables.ocrJobs).where(eq(tables.ocrJobs.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      fileId: row.fileId,
      matterId: row.matterId,
      status: (row.status as any) || "pending",
      provider: row.provider || "openai-vision",
      confidence: row.confidence || undefined,
      extractedText: row.extractedText || undefined,
      pageCount: row.pageCount || undefined,
      processingTime: row.processingTime || undefined,
      error: row.error || undefined,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      completedAt: row.completedAt ? toISOString(row.completedAt) || undefined : undefined,
    };
  }

  async createOCRJob(data: InsertOCRJob): Promise<OCRJob> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.ocrJobs).values({
      id,
      fileId: data.fileId,
      matterId: data.matterId,
      status: "pending",
      provider: data.provider || "openai-vision",
      createdAt: now,
    }).returning();
    return {
      id: row.id,
      fileId: row.fileId,
      matterId: row.matterId,
      status: (row.status as any) || "pending",
      provider: row.provider || "openai-vision",
      createdAt: toISOString(row.createdAt) || now.toISOString(),
    };
  }

  async updateOCRJob(id: string, data: Partial<OCRJob>): Promise<OCRJob | undefined> {
    const updateData: any = { ...data };
    if (data.status === "completed" || data.status === "failed") {
      updateData.completedAt = new Date();
    }
    const [row] = await db.update(tables.ocrJobs).set(updateData).where(eq(tables.ocrJobs.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      fileId: row.fileId,
      matterId: row.matterId,
      status: (row.status as any) || "pending",
      provider: row.provider || "openai-vision",
      confidence: row.confidence || undefined,
      extractedText: row.extractedText || undefined,
      pageCount: row.pageCount || undefined,
      processingTime: row.processingTime || undefined,
      error: row.error || undefined,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      completedAt: row.completedAt ? toISOString(row.completedAt) || undefined : undefined,
    };
  }

  // ============ TIMELINE METHODS ============
  async getTimelineEvents(matterId: string): Promise<TimelineEvent[]> {
    const rows = await db.select().from(tables.timelineEvents).where(eq(tables.timelineEvents.matterId, matterId)).orderBy(desc(tables.timelineEvents.eventDate));
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId,
      eventType: r.eventType as any,
      title: r.title,
      description: r.description || "",
      linkedFileId: r.linkedFileId || undefined,
      linkedTaskId: r.linkedTaskId || undefined,
      linkedThreadId: r.linkedThreadId || undefined,
      createdBy: r.createdBy,
      eventDate: r.eventDate,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      metadata: (r.metadata as Record<string, any>) || {},
    }));
  }

  async createTimelineEvent(data: InsertTimelineEvent): Promise<TimelineEvent> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.timelineEvents).values({
      id,
      matterId: data.matterId,
      eventType: data.eventType,
      title: data.title,
      description: data.description || "",
      linkedFileId: data.linkedFileId,
      linkedTaskId: data.linkedTaskId,
      linkedThreadId: data.linkedThreadId,
      createdBy: data.createdBy,
      eventDate: data.eventDate,
      createdAt: now,
      metadata: data.metadata as any || {},
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      eventType: row.eventType as any,
      title: row.title,
      description: row.description || "",
      linkedFileId: row.linkedFileId || undefined,
      linkedTaskId: row.linkedTaskId || undefined,
      linkedThreadId: row.linkedThreadId || undefined,
      createdBy: row.createdBy,
      eventDate: row.eventDate,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      metadata: (row.metadata as Record<string, any>) || {},
    };
  }

  // ============ THREAD METHODS ============
  async getThreads(matterId: string): Promise<Thread[]> {
    const rows = await db.select().from(tables.threads).where(eq(tables.threads.matterId, matterId)).orderBy(desc(tables.threads.updatedAt));
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId,
      subject: r.subject,
      participants: (r.participants as Person[]) || [],
      status: (r.status as any) || "open",
      priority: (r.priority as any) || "medium",
      linkedFiles: (r.linkedFiles as string[]) || [],
      createdBy: r.createdBy,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async getThread(id: string): Promise<Thread | undefined> {
    const [row] = await db.select().from(tables.threads).where(eq(tables.threads.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      subject: row.subject,
      participants: (row.participants as Person[]) || [],
      status: (row.status as any) || "open",
      priority: (row.priority as any) || "medium",
      linkedFiles: (row.linkedFiles as string[]) || [],
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createThread(data: InsertThread): Promise<Thread> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.threads).values({
      id,
      matterId: data.matterId,
      subject: data.subject,
      participants: data.participants as any || [],
      status: "open",
      priority: data.priority || "medium",
      linkedFiles: data.linkedFiles as any || [],
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      subject: row.subject,
      participants: (row.participants as Person[]) || [],
      status: (row.status as any) || "open",
      priority: (row.priority as any) || "medium",
      linkedFiles: (row.linkedFiles as string[]) || [],
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateThread(id: string, data: Partial<Thread>): Promise<Thread | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.participants) updateData.participants = data.participants as any;
    if (data.linkedFiles) updateData.linkedFiles = data.linkedFiles as any;
    const [row] = await db.update(tables.threads).set(updateData).where(eq(tables.threads.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      subject: row.subject,
      participants: (row.participants as Person[]) || [],
      status: (row.status as any) || "open",
      priority: (row.priority as any) || "medium",
      linkedFiles: (row.linkedFiles as string[]) || [],
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
    const rows = await db.select().from(tables.threadMessages).where(eq(tables.threadMessages.threadId, threadId)).orderBy(asc(tables.threadMessages.createdAt));
    return rows.map(r => ({
      id: r.id,
      threadId: r.threadId,
      senderId: r.senderId,
      senderName: r.senderName,
      content: r.content,
      attachments: (r.attachments as any[]) || [],
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
    }));
  }

  async createThreadMessage(data: InsertThreadMessage): Promise<ThreadMessage> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.threadMessages).values({
      id,
      threadId: data.threadId,
      senderId: data.senderId,
      senderName: data.senderName,
      content: data.content,
      attachments: data.attachments as any || [],
      createdAt: now,
    }).returning();
    // Update thread updatedAt
    await db.update(tables.threads).set({ updatedAt: now }).where(eq(tables.threads.id, data.threadId));
    return {
      id: row.id,
      threadId: row.threadId,
      senderId: row.senderId,
      senderName: row.senderName,
      content: row.content,
      attachments: (row.attachments as any[]) || [],
      createdAt: toISOString(row.createdAt) || now.toISOString(),
    };
  }

  async getThreadDecisions(threadId: string): Promise<ThreadDecision[]> {
    const rows = await db.select().from(tables.threadDecisions).where(eq(tables.threadDecisions.threadId, threadId));
    return rows.map(r => ({
      id: r.id,
      threadId: r.threadId,
      messageId: r.messageId,
      decision: r.decision,
      madeBy: r.madeBy,
      madeAt: toISOString(r.madeAt) || new Date().toISOString(),
      status: (r.status as any) || "pending",
      approvals: r.approvals as any,
    }));
  }

  async createThreadDecision(data: InsertThreadDecision): Promise<ThreadDecision> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.threadDecisions).values({
      id,
      threadId: data.threadId,
      messageId: data.messageId,
      decision: data.decision,
      madeBy: data.madeBy,
      madeAt: now,
      status: "pending",
    }).returning();
    return {
      id: row.id,
      threadId: row.threadId,
      messageId: row.messageId,
      decision: row.decision,
      madeBy: row.madeBy,
      madeAt: toISOString(row.madeAt) || now.toISOString(),
      status: (row.status as any) || "pending",
      approvals: row.approvals as any,
    };
  }

  // ============ CLIENT METHODS ============
  async getClients(): Promise<Client[]> {
    const rows = await db.select().from(tables.clients).orderBy(asc(tables.clients.name));
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email || undefined,
      phone: r.phone || undefined,
      company: r.company || undefined,
      address: r.address || undefined,
      notes: r.notes || "",
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [row] = await db.select().from(tables.clients).where(eq(tables.clients.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      address: row.address || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createClient(data: InsertClient): Promise<Client> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.clients).values({
      id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      address: data.address,
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      address: row.address || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateClient(id: string, data: Partial<Client>): Promise<Client | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    const [row] = await db.update(tables.clients).set(updateData).where(eq(tables.clients.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      address: row.address || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteClient(id: string): Promise<boolean> {
    await db.delete(tables.clients).where(eq(tables.clients.id, id));
    return true;
  }

  // ============ MATTER METHODS ============
  async getMatters(clientId?: string): Promise<Matter[]> {
    let rows;
    if (clientId) {
      rows = await db.select().from(tables.matters).where(eq(tables.matters.clientId, clientId)).orderBy(desc(tables.matters.createdAt));
    } else {
      rows = await db.select().from(tables.matters).orderBy(desc(tables.matters.createdAt));
    }
    return rows.map(r => this.rowToMatter(r));
  }

  async getMatter(id: string): Promise<Matter | undefined> {
    const [row] = await db.select().from(tables.matters).where(eq(tables.matters.id, id));
    if (!row) return undefined;
    return this.rowToMatter(row);
  }

  private rowToMatter(r: any): Matter {
    return {
      id: r.id,
      clientId: r.clientId,
      name: r.name,
      caseNumber: r.caseNumber || undefined,
      matterType: r.matterType,
      status: (r.status as any) || "active",
      description: r.description || "",
      openedDate: r.openedDate,
      closedDate: r.closedDate || undefined,
      assignedAttorneys: (r.assignedAttorneys as Person[]) || [],
      practiceArea: r.practiceArea,
      courtName: r.courtName || undefined,
      judgeAssigned: r.judgeAssigned || undefined,
      opposingCounsel: r.opposingCounsel || undefined,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    };
  }

  async createMatter(data: InsertMatter): Promise<Matter> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.matters).values({
      id,
      clientId: data.clientId,
      name: data.name,
      caseNumber: data.caseNumber,
      matterType: data.matterType,
      status: data.status || "active",
      description: data.description || "",
      openedDate: data.openedDate,
      practiceArea: data.practiceArea,
      courtName: data.courtName,
      judgeAssigned: data.judgeAssigned,
      opposingCounsel: data.opposingCounsel,
      assignedAttorneys: [],
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.rowToMatter(row);
  }

  async updateMatter(id: string, data: Partial<Matter>): Promise<Matter | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.assignedAttorneys) updateData.assignedAttorneys = data.assignedAttorneys as any;
    const [row] = await db.update(tables.matters).set(updateData).where(eq(tables.matters.id, id)).returning();
    if (!row) return undefined;
    return this.rowToMatter(row);
  }

  async deleteMatter(id: string): Promise<boolean> {
    await db.delete(tables.matters).where(eq(tables.matters.id, id));
    return true;
  }

  // ============ MATTER CONTACT METHODS ============
  async getMatterContacts(matterId: string): Promise<MatterContact[]> {
    const rows = await db.select().from(tables.matterContacts).where(eq(tables.matterContacts.matterId, matterId));
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId,
      name: r.name,
      role: r.role as any,
      email: r.email || undefined,
      phone: r.phone || undefined,
      company: r.company || undefined,
      address: r.address || undefined,
      notes: r.notes || "",
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async createMatterContact(data: InsertMatterContact): Promise<MatterContact> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.matterContacts).values({
      id,
      matterId: data.matterId,
      name: data.name,
      role: data.role,
      email: data.email,
      phone: data.phone,
      company: data.company,
      address: data.address,
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      name: row.name,
      role: row.role as any,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      address: row.address || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateMatterContact(id: string, data: Partial<MatterContact>): Promise<MatterContact | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    const [row] = await db.update(tables.matterContacts).set(updateData).where(eq(tables.matterContacts.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      name: row.name,
      role: row.role as any,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      address: row.address || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteMatterContact(id: string): Promise<boolean> {
    await db.delete(tables.matterContacts).where(eq(tables.matterContacts.id, id));
    return true;
  }

  // ============ RESEARCH METHODS ============
  async getResearchResults(matterId: string): Promise<ResearchResult[]> {
    const rows = await db.select().from(tables.researchResults).where(eq(tables.researchResults.matterId, matterId));
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId,
      query: r.query,
      source: r.source,
      citation: r.citation,
      summary: r.summary,
      relevance: r.relevance || 50,
      notes: r.notes || "",
      createdBy: r.createdBy,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
    }));
  }

  async createResearchResult(data: InsertResearchResult): Promise<ResearchResult> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.researchResults).values({
      id,
      matterId: data.matterId,
      query: data.query,
      source: data.source,
      citation: data.citation,
      summary: data.summary,
      relevance: data.relevance || 50,
      notes: data.notes || "",
      createdBy: data.createdBy,
      createdAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      query: row.query,
      source: row.source,
      citation: row.citation,
      summary: row.summary,
      relevance: row.relevance || 50,
      notes: row.notes || "",
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
    };
  }

  async updateResearchResult(id: string, data: Partial<ResearchResult>): Promise<ResearchResult | undefined> {
    const { createdAt, ...updateData } = data as any;
    const [row] = await db.update(tables.researchResults).set(updateData).where(eq(tables.researchResults.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      query: row.query,
      source: row.source,
      citation: row.citation,
      summary: row.summary,
      relevance: row.relevance || 50,
      notes: row.notes || "",
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    };
  }

  // ============ AUTOMATION METHODS ============
  async getAutomationRules(boardId: string): Promise<AutomationRule[]> {
    const rows = await db.select().from(tables.automationRules).where(eq(tables.automationRules.boardId, boardId));
    return rows.map(r => this.rowToAutomationRule(r));
  }

  async getAutomationRule(id: string): Promise<AutomationRule | undefined> {
    const [row] = await db.select().from(tables.automationRules).where(eq(tables.automationRules.id, id));
    if (!row) return undefined;
    return this.rowToAutomationRule(row);
  }

  private rowToAutomationRule(r: any): AutomationRule {
    return {
      id: r.id,
      boardId: r.boardId,
      name: r.name,
      description: r.description || "",
      isActive: r.isActive ?? true,
      triggerType: r.triggerType as any,
      triggerField: r.triggerField || undefined,
      triggerValue: r.triggerValue || undefined,
      conditions: (r.conditions as any[]) || [],
      actionType: r.actionType as any,
      actionConfig: (r.actionConfig as Record<string, any>) || {},
      runCount: r.runCount || 0,
      lastRun: r.lastRun ? toISOString(r.lastRun) || undefined : undefined,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    };
  }

  async createAutomationRule(data: InsertAutomationRule): Promise<AutomationRule> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.automationRules).values({
      id,
      boardId: data.boardId,
      name: data.name,
      description: data.description || "",
      isActive: data.isActive ?? true,
      triggerType: data.triggerType,
      triggerField: data.triggerField,
      triggerValue: data.triggerValue,
      conditions: data.conditions as any || [],
      actionType: data.actionType,
      actionConfig: data.actionConfig as any || {},
      runCount: 0,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.rowToAutomationRule(row);
  }

  async updateAutomationRule(id: string, data: Partial<AutomationRule>): Promise<AutomationRule | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.conditions) updateData.conditions = data.conditions as any;
    if (data.actionConfig) updateData.actionConfig = data.actionConfig as any;
    const [row] = await db.update(tables.automationRules).set(updateData).where(eq(tables.automationRules.id, id)).returning();
    if (!row) return undefined;
    return this.rowToAutomationRule(row);
  }

  async deleteAutomationRule(id: string): Promise<boolean> {
    await db.delete(tables.automationRules).where(eq(tables.automationRules.id, id));
    return true;
  }

  async createAutomationRun(data: Partial<AutomationRun>): Promise<AutomationRun> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.automationRuns).values({
      id,
      ruleId: data.ruleId!,
      taskId: data.taskId,
      triggerData: data.triggerData as any || {},
      actionResult: data.actionResult as any || {},
      status: data.status || "pending",
      executedAt: now,
    }).returning();
    return {
      id: row.id,
      ruleId: row.ruleId,
      taskId: row.taskId || undefined,
      triggerData: (row.triggerData as Record<string, any>) || {},
      actionResult: (row.actionResult as Record<string, any>) || {},
      status: (row.status as any) || "pending",
      error: row.error || undefined,
      executedAt: toISOString(row.executedAt) || now.toISOString(),
      completedAt: row.completedAt ? toISOString(row.completedAt) || undefined : undefined,
    };
  }

  // ============ DETECTIVE BOARD METHODS ============
  async getDetectiveNodes(matterId: string): Promise<DetectiveNode[]> {
    const rows = await db.select().from(tables.detectiveNodes).where(eq(tables.detectiveNodes.matterId, matterId));
    return rows.map(r => this.rowToDetectiveNode(r));
  }

  private rowToDetectiveNode(r: any): DetectiveNode {
    return {
      id: r.id,
      matterId: r.matterId,
      type: r.type as any,
      title: r.title,
      description: r.description || "",
      linkedEvidenceId: r.linkedEvidenceId || undefined,
      linkedContactId: r.linkedContactId || undefined,
      position: r.position as { x: number; y: number },
      color: r.color || "#6366f1",
      icon: r.icon || undefined,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    };
  }

  async createDetectiveNode(data: InsertDetectiveNode): Promise<DetectiveNode> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.detectiveNodes).values({
      id,
      matterId: data.matterId,
      type: data.type,
      title: data.title,
      description: data.description || "",
      linkedEvidenceId: data.linkedEvidenceId,
      linkedContactId: data.linkedContactId,
      position: data.position as any,
      color: data.color || "#6366f1",
      icon: data.icon,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.rowToDetectiveNode(row);
  }

  async updateDetectiveNode(id: string, data: Partial<DetectiveNode>): Promise<DetectiveNode | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.position) updateData.position = data.position as any;
    const [row] = await db.update(tables.detectiveNodes).set(updateData).where(eq(tables.detectiveNodes.id, id)).returning();
    if (!row) return undefined;
    return this.rowToDetectiveNode(row);
  }

  async deleteDetectiveNode(id: string): Promise<boolean> {
    await db.delete(tables.detectiveNodes).where(eq(tables.detectiveNodes.id, id));
    return true;
  }

  async getDetectiveConnections(matterId: string): Promise<DetectiveConnection[]> {
    const rows = await db.select().from(tables.detectiveConnections).where(eq(tables.detectiveConnections.matterId, matterId));
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId,
      sourceNodeId: r.sourceNodeId,
      targetNodeId: r.targetNodeId,
      label: r.label || "",
      connectionType: r.connectionType as any,
      strength: r.strength || 3,
      notes: r.notes || "",
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
    }));
  }

  async createDetectiveConnection(data: InsertDetectiveConnection): Promise<DetectiveConnection> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.detectiveConnections).values({
      id,
      matterId: data.matterId,
      sourceNodeId: data.sourceNodeId,
      targetNodeId: data.targetNodeId,
      label: data.label || "",
      connectionType: data.connectionType,
      strength: data.strength || 3,
      notes: data.notes || "",
      createdAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      sourceNodeId: row.sourceNodeId,
      targetNodeId: row.targetNodeId,
      label: row.label || "",
      connectionType: row.connectionType as any,
      strength: row.strength || 3,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || now.toISOString(),
    };
  }

  async updateDetectiveConnection(id: string, data: Partial<DetectiveConnection>): Promise<DetectiveConnection | undefined> {
    const { createdAt, ...updateData } = data as any;
    const [row] = await db.update(tables.detectiveConnections).set(updateData).where(eq(tables.detectiveConnections.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      sourceNodeId: row.sourceNodeId,
      targetNodeId: row.targetNodeId,
      label: row.label || "",
      connectionType: row.connectionType as any,
      strength: row.strength || 3,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    };
  }

  async deleteDetectiveConnection(id: string): Promise<boolean> {
    await db.delete(tables.detectiveConnections).where(eq(tables.detectiveConnections.id, id));
    return true;
  }

  // ============ FILE ITEMS ============

  async getFileItems(matterId: string): Promise<FileItem[]> {
    const rows = await db.select().from(tables.fileItems).where(eq(tables.fileItems.matterId, matterId));
    return rows.map(r => this.rowToFileItem(r));
  }

  async getFileItem(id: string): Promise<FileItem | undefined> {
    const [row] = await db.select().from(tables.fileItems).where(eq(tables.fileItems.id, id));
    if (!row) return undefined;
    return this.rowToFileItem(row);
  }

  private rowToFileItem(r: any): FileItem {
    return {
      id: r.id,
      matterId: r.matterId,
      serverPath: r.serverPath,
      fileName: r.fileName,
      extension: r.extension || undefined,
      sizeBytes: r.sizeBytes || 0,
      hashSha256: r.hashSha256 || undefined,
      isEmail: r.isEmail || false,
      isAttachment: r.isAttachment || false,
      parentFileId: r.parentFileId || undefined,
      confidentiality: r.confidentiality || "confidential",
      createdUtc: toISOString(r.createdUtc) || undefined,
      modifiedUtc: toISOString(r.modifiedUtc) || undefined,
      ingestedUtc: toISOString(r.ingestedUtc) || new Date().toISOString(),
    };
  }

  async createFileItem(data: InsertFileItem): Promise<FileItem> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.fileItems).values({
      id,
      matterId: data.matterId,
      serverPath: data.serverPath,
      fileName: data.fileName,
      extension: data.extension,
      sizeBytes: data.sizeBytes || 0,
      hashSha256: data.hashSha256,
      isEmail: data.isEmail || false,
      isAttachment: data.isAttachment || false,
      parentFileId: data.parentFileId,
      confidentiality: data.confidentiality || "confidential",
      ingestedUtc: now,
    }).returning();
    return this.rowToFileItem(row);
  }

  async updateFileItem(id: string, data: Partial<FileItem>): Promise<FileItem | undefined> {
    const { ingestedUtc, createdUtc, modifiedUtc, ...updateData } = data as any;
    const [row] = await db.update(tables.fileItems).set(updateData).where(eq(tables.fileItems.id, id)).returning();
    if (!row) return undefined;
    return this.rowToFileItem(row);
  }

  async deleteFileItem(id: string): Promise<boolean> {
    await db.delete(tables.fileItems).where(eq(tables.fileItems.id, id));
    return true;
  }

  // ============ DOC PROFILES ============

  async getDocProfile(fileId: string): Promise<DocProfile | undefined> {
    const [row] = await db.select().from(tables.docProfiles).where(eq(tables.docProfiles.fileId, fileId));
    if (!row) return undefined;
    return this.rowToDocProfile(row);
  }

  private rowToDocProfile(r: any): DocProfile {
    return {
      id: r.id,
      fileId: r.fileId,
      docCategory: r.docCategory,
      docType: r.docType,
      docRole: r.docRole || "primary",
      captionTitle: r.captionTitle || undefined,
      party: r.party || undefined,
      author: r.author || undefined,
      recipient: r.recipient || undefined,
      serviceDate: r.serviceDate || undefined,
      filingDate: r.filingDate || undefined,
      hearingDate: r.hearingDate || undefined,
      docketNumber: r.docketNumber || undefined,
      version: r.version || "final",
      status: r.status || "draft",
      privilegeBasis: r.privilegeBasis || undefined,
      productionId: r.productionId || undefined,
      batesRange: r.batesRange || undefined,
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    };
  }

  async createDocProfile(data: InsertDocProfile): Promise<DocProfile> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.docProfiles).values({
      id,
      fileId: data.fileId,
      docCategory: data.docCategory,
      docType: data.docType,
      docRole: data.docRole || "primary",
      captionTitle: data.captionTitle,
      party: data.party,
      author: data.author,
      recipient: data.recipient,
      serviceDate: data.serviceDate,
      filingDate: data.filingDate,
      hearingDate: data.hearingDate,
      docketNumber: data.docketNumber,
      version: data.version || "final",
      status: data.status || "draft",
      privilegeBasis: data.privilegeBasis,
      productionId: data.productionId,
      batesRange: data.batesRange,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.rowToDocProfile(row);
  }

  async updateDocProfile(fileId: string, data: Partial<DocProfile>): Promise<DocProfile | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.docProfiles).set(updateWithTime).where(eq(tables.docProfiles.fileId, fileId)).returning();
    if (!row) return undefined;
    return this.rowToDocProfile(row);
  }

  async deleteDocProfile(fileId: string): Promise<boolean> {
    await db.delete(tables.docProfiles).where(eq(tables.docProfiles.fileId, fileId));
    return true;
  }

  // ============ FILE ITEMS WITH PROFILES ============

  async getFileItemsWithProfiles(matterId: string): Promise<FileItemWithProfile[]> {
    const fileItems = await this.getFileItems(matterId);
    const result: FileItemWithProfile[] = [];
    for (const file of fileItems) {
      const profile = await this.getDocProfile(file.id);
      const tags = await this.getFileItemTags(file.id);
      result.push({ ...file, profile, tags });
    }
    return result;
  }

  async getFileItemWithProfile(id: string): Promise<FileItemWithProfile | undefined> {
    const file = await this.getFileItem(id);
    if (!file) return undefined;
    const profile = await this.getDocProfile(file.id);
    const tags = await this.getFileItemTags(file.id);
    return { ...file, profile, tags };
  }

  // ============ FILING TAGS ============

  async getFilingTags(): Promise<FilingTag[]> {
    const rows = await db.select().from(tables.filingTags);
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      color: r.color || "#6366f1",
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
    }));
  }

  async createFilingTag(data: InsertFilingTag): Promise<FilingTag> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.filingTags).values({
      id,
      name: data.name,
      color: data.color || "#6366f1",
      createdAt: now,
    }).returning();
    return {
      id: row.id,
      name: row.name,
      color: row.color || "#6366f1",
      createdAt: toISOString(row.createdAt) || now.toISOString(),
    };
  }

  async deleteFilingTag(id: string): Promise<boolean> {
    await db.delete(tables.filingTags).where(eq(tables.filingTags.id, id));
    return true;
  }

  // ============ FILE TAG LINKS ============

  async getFileItemTags(fileId: string): Promise<FilingTag[]> {
    const links = await db.select().from(tables.fileTagLinks).where(eq(tables.fileTagLinks.fileId, fileId));
    const tags: FilingTag[] = [];
    for (const link of links) {
      const [tag] = await db.select().from(tables.filingTags).where(eq(tables.filingTags.id, link.tagId));
      if (tag) {
        tags.push({
          id: tag.id,
          name: tag.name,
          color: tag.color || "#6366f1",
          createdAt: toISOString(tag.createdAt) || new Date().toISOString(),
        });
      }
    }
    return tags;
  }

  async addTagToFileItem(fileId: string, tagId: string): Promise<void> {
    const existing = await db.select().from(tables.fileTagLinks).where(
      and(eq(tables.fileTagLinks.fileId, fileId), eq(tables.fileTagLinks.tagId, tagId))
    );
    if (existing.length === 0) {
      await db.insert(tables.fileTagLinks).values({ id: randomUUID(), fileId, tagId });
    }
  }

  async removeTagFromFileItem(fileId: string, tagId: string): Promise<void> {
    await db.delete(tables.fileTagLinks).where(
      and(eq(tables.fileTagLinks.fileId, fileId), eq(tables.fileTagLinks.tagId, tagId))
    );
  }

  // ============ PEOPLE/ORGS ============

  async getPeopleOrgs(matterId?: string): Promise<PeopleOrg[]> {
    const rows = matterId 
      ? await db.select().from(tables.peopleOrgs).where(eq(tables.peopleOrgs.matterId, matterId))
      : await db.select().from(tables.peopleOrgs);
    return rows.map(r => ({
      id: r.id,
      matterId: r.matterId || undefined,
      name: r.name,
      entityType: r.entityType as any,
      role: r.role as any || undefined,
      email: r.email || undefined,
      phone: r.phone || undefined,
      company: r.company || undefined,
      notes: r.notes || "",
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async createPeopleOrg(data: InsertPeopleOrg): Promise<PeopleOrg> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.peopleOrgs).values({
      id,
      matterId: data.matterId,
      name: data.name,
      entityType: data.entityType,
      role: data.role,
      email: data.email,
      phone: data.phone,
      company: data.company,
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId || undefined,
      name: row.name,
      entityType: row.entityType as any,
      role: row.role as any || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updatePeopleOrg(id: string, data: Partial<PeopleOrg>): Promise<PeopleOrg | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.peopleOrgs).set(updateWithTime).where(eq(tables.peopleOrgs.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId || undefined,
      name: row.name,
      entityType: row.entityType as any,
      role: row.role as any || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      company: row.company || undefined,
      notes: row.notes || "",
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deletePeopleOrg(id: string): Promise<boolean> {
    await db.delete(tables.peopleOrgs).where(eq(tables.peopleOrgs.id, id));
    return true;
  }

  // Time Entries
  async getTimeEntries(matterId?: string): Promise<TimeEntry[]> {
    await this.ensureInitialized();
    const rows = matterId
      ? await db.select().from(tables.timeEntries).where(eq(tables.timeEntries.matterId, matterId)).orderBy(desc(tables.timeEntries.date))
      : await db.select().from(tables.timeEntries).orderBy(desc(tables.timeEntries.date));
    return rows.map(row => ({
      id: row.id,
      matterId: row.matterId,
      taskId: row.taskId || undefined,
      userId: row.userId,
      userName: row.userName,
      date: row.date,
      hours: row.hours,
      description: row.description,
      billableStatus: (row.billableStatus || "billable") as any,
      hourlyRate: row.hourlyRate || undefined,
      activityCode: row.activityCode || undefined,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    }));
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    await this.ensureInitialized();
    const [row] = await db.select().from(tables.timeEntries).where(eq(tables.timeEntries.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      taskId: row.taskId || undefined,
      userId: row.userId,
      userName: row.userName,
      date: row.date,
      hours: row.hours,
      description: row.description,
      billableStatus: (row.billableStatus || "billable") as any,
      hourlyRate: row.hourlyRate || undefined,
      activityCode: row.activityCode || undefined,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createTimeEntry(data: InsertTimeEntry): Promise<TimeEntry> {
    await this.ensureInitialized();
    const now = new Date();
    const [row] = await db.insert(tables.timeEntries).values({
      matterId: data.matterId,
      taskId: data.taskId,
      userId: data.userId,
      userName: data.userName,
      date: data.date,
      hours: data.hours,
      description: data.description,
      billableStatus: data.billableStatus || "billable",
      hourlyRate: data.hourlyRate,
      activityCode: data.activityCode,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      taskId: row.taskId || undefined,
      userId: row.userId,
      userName: row.userName,
      date: row.date,
      hours: row.hours,
      description: row.description,
      billableStatus: (row.billableStatus || "billable") as any,
      hourlyRate: row.hourlyRate || undefined,
      activityCode: row.activityCode || undefined,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateTimeEntry(id: string, data: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.timeEntries).set(updateWithTime).where(eq(tables.timeEntries.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      taskId: row.taskId || undefined,
      userId: row.userId,
      userName: row.userName,
      date: row.date,
      hours: row.hours,
      description: row.description,
      billableStatus: (row.billableStatus || "billable") as any,
      hourlyRate: row.hourlyRate || undefined,
      activityCode: row.activityCode || undefined,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteTimeEntry(id: string): Promise<boolean> {
    await db.delete(tables.timeEntries).where(eq(tables.timeEntries.id, id));
    return true;
  }

  // Expenses
  async getExpenses(filters?: { clientId?: string; matterId?: string }): Promise<Expense[]> {
    await this.ensureInitialized();
    let query = db.select().from(tables.expenses);
    const conditions = [];
    if (filters?.clientId) conditions.push(eq(tables.expenses.clientId, filters.clientId));
    if (filters?.matterId) conditions.push(eq(tables.expenses.matterId, filters.matterId));
    const rows = conditions.length > 0
      ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(tables.expenses.date))
      : await query.orderBy(desc(tables.expenses.date));
    return rows.map(row => ({
      id: row.id,
      matterId: row.matterId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      description: row.description,
      category: row.category as any,
      billable: row.billable ?? true,
      reimbursable: row.reimbursable ?? false,
      vendor: row.vendor || undefined,
      receiptUrl: row.receiptUrl || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    }));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [row] = await db.select().from(tables.expenses).where(eq(tables.expenses.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      description: row.description,
      category: row.category as any,
      billable: row.billable ?? true,
      reimbursable: row.reimbursable ?? false,
      vendor: row.vendor || undefined,
      receiptUrl: row.receiptUrl || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createExpense(data: InsertExpense): Promise<Expense> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.expenses).values({
      id,
      matterId: data.matterId,
      clientId: data.clientId,
      date: data.date,
      amount: data.amount,
      description: data.description,
      category: data.category,
      billable: data.billable ?? true,
      reimbursable: data.reimbursable ?? false,
      vendor: data.vendor || null,
      receiptUrl: data.receiptUrl || null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      description: row.description,
      category: row.category as any,
      billable: row.billable ?? true,
      reimbursable: row.reimbursable ?? false,
      vendor: row.vendor || undefined,
      receiptUrl: row.receiptUrl || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.expenses).set(updateWithTime).where(eq(tables.expenses.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      description: row.description,
      category: row.category as any,
      billable: row.billable ?? true,
      reimbursable: row.reimbursable ?? false,
      vendor: row.vendor || undefined,
      receiptUrl: row.receiptUrl || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteExpense(id: string): Promise<boolean> {
    await db.delete(tables.expenses).where(eq(tables.expenses.id, id));
    return true;
  }

  // Invoices
  async getInvoices(filters?: { clientId?: string; matterId?: string }): Promise<Invoice[]> {
    await this.ensureInitialized();
    let query = db.select().from(tables.invoices);
    const conditions = [];
    if (filters?.clientId) conditions.push(eq(tables.invoices.clientId, filters.clientId));
    if (filters?.matterId) conditions.push(eq(tables.invoices.matterId, filters.matterId!));
    const rows = conditions.length > 0
      ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(tables.invoices.issueDate))
      : await query.orderBy(desc(tables.invoices.issueDate));
    return rows.map(row => ({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      status: (row.status || "draft") as any,
      lineItems: (row.lineItems as InvoiceLineItem[]) || [],
      subtotal: row.subtotal || 0,
      taxRate: row.taxRate || 0,
      taxAmount: row.taxAmount || 0,
      totalAmount: row.totalAmount || 0,
      paidAmount: row.paidAmount || 0,
      balanceDue: row.balanceDue || 0,
      notes: row.notes || undefined,
      paymentTerms: row.paymentTerms || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    }));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [row] = await db.select().from(tables.invoices).where(eq(tables.invoices.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      status: (row.status || "draft") as any,
      lineItems: (row.lineItems as InvoiceLineItem[]) || [],
      subtotal: row.subtotal || 0,
      taxRate: row.taxRate || 0,
      taxAmount: row.taxAmount || 0,
      totalAmount: row.totalAmount || 0,
      paidAmount: row.paidAmount || 0,
      balanceDue: row.balanceDue || 0,
      notes: row.notes || undefined,
      paymentTerms: row.paymentTerms || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createInvoice(data: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const now = new Date();
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(tables.invoices);
    const invoiceNumber = `INV-${(Number(countResult[0]?.count) || 0) + 1001}`;
    const [row] = await db.insert(tables.invoices).values({
      id,
      invoiceNumber,
      clientId: data.clientId,
      matterId: data.matterId || null,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      status: data.status || "draft",
      lineItems: (data.lineItems as any) || [],
      subtotal: data.subtotal || 0,
      taxRate: data.taxRate || 0,
      taxAmount: data.taxAmount || 0,
      totalAmount: data.totalAmount || 0,
      paidAmount: data.paidAmount || 0,
      balanceDue: data.balanceDue || 0,
      notes: data.notes || null,
      paymentTerms: data.paymentTerms || null,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      status: (row.status || "draft") as any,
      lineItems: (row.lineItems as InvoiceLineItem[]) || [],
      subtotal: row.subtotal || 0,
      taxRate: row.taxRate || 0,
      taxAmount: row.taxAmount || 0,
      totalAmount: row.totalAmount || 0,
      paidAmount: row.paidAmount || 0,
      balanceDue: row.balanceDue || 0,
      notes: row.notes || undefined,
      paymentTerms: row.paymentTerms || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime: any = { ...updateData, updatedAt: new Date() };
    if (updateData.lineItems) updateWithTime.lineItems = updateData.lineItems as any;
    const [row] = await db.update(tables.invoices).set(updateWithTime).where(eq(tables.invoices.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      issueDate: row.issueDate,
      dueDate: row.dueDate,
      status: (row.status || "draft") as any,
      lineItems: (row.lineItems as InvoiceLineItem[]) || [],
      subtotal: row.subtotal || 0,
      taxRate: row.taxRate || 0,
      taxAmount: row.taxAmount || 0,
      totalAmount: row.totalAmount || 0,
      paidAmount: row.paidAmount || 0,
      balanceDue: row.balanceDue || 0,
      notes: row.notes || undefined,
      paymentTerms: row.paymentTerms || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteInvoice(id: string): Promise<boolean> {
    await db.delete(tables.invoices).where(eq(tables.invoices.id, id));
    return true;
  }

  // Payments
  async getPayments(filters?: { clientId?: string; invoiceId?: string }): Promise<Payment[]> {
    await this.ensureInitialized();
    let query = db.select().from(tables.payments);
    const conditions = [];
    if (filters?.clientId) conditions.push(eq(tables.payments.clientId, filters.clientId));
    if (filters?.invoiceId) conditions.push(eq(tables.payments.invoiceId, filters.invoiceId));
    const rows = conditions.length > 0
      ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(tables.payments.date))
      : await query.orderBy(desc(tables.payments.date));
    return rows.map(row => ({
      id: row.id,
      invoiceId: row.invoiceId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      method: row.method as any,
      reference: row.reference || undefined,
      notes: row.notes || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    }));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.payments).values({
      id,
      invoiceId: data.invoiceId,
      clientId: data.clientId,
      date: data.date,
      amount: data.amount,
      method: data.method,
      reference: data.reference || null,
      notes: data.notes || null,
      createdBy: data.createdBy,
      createdAt: now,
    }).returning();
    return {
      id: row.id,
      invoiceId: row.invoiceId,
      clientId: row.clientId,
      date: row.date,
      amount: row.amount,
      method: row.method as any,
      reference: row.reference || undefined,
      notes: row.notes || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    };
  }

  // Trust Transactions
  async getTrustTransactions(filters?: { clientId?: string; matterId?: string }): Promise<TrustTransaction[]> {
    await this.ensureInitialized();
    let query = db.select().from(tables.trustTransactions);
    const conditions = [];
    if (filters?.clientId) conditions.push(eq(tables.trustTransactions.clientId, filters.clientId));
    if (filters?.matterId) conditions.push(eq(tables.trustTransactions.matterId, filters.matterId!));
    const rows = conditions.length > 0
      ? await query.where(conditions.length === 1 ? conditions[0] : and(...conditions)).orderBy(desc(tables.trustTransactions.date))
      : await query.orderBy(desc(tables.trustTransactions.date));
    return rows.map(row => ({
      id: row.id,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      date: row.date,
      amount: row.amount,
      type: row.type as any,
      description: row.description,
      reference: row.reference || undefined,
      runningBalance: row.runningBalance || 0,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    }));
  }

  async createTrustTransaction(data: InsertTrustTransaction): Promise<TrustTransaction> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.trustTransactions).values({
      id,
      clientId: data.clientId,
      matterId: data.matterId || null,
      date: data.date,
      amount: data.amount,
      type: data.type,
      description: data.description,
      reference: data.reference || null,
      runningBalance: data.runningBalance || 0,
      createdBy: data.createdBy,
      createdAt: now,
    }).returning();
    return {
      id: row.id,
      clientId: row.clientId,
      matterId: row.matterId || undefined,
      date: row.date,
      amount: row.amount,
      type: row.type as any,
      description: row.description,
      reference: row.reference || undefined,
      runningBalance: row.runningBalance || 0,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
    };
  }

  // Calendar Events
  async getCalendarEvents(matterId?: string): Promise<CalendarEvent[]> {
    await this.ensureInitialized();
    const rows = matterId
      ? await db.select().from(tables.calendarEvents).where(eq(tables.calendarEvents.matterId, matterId)).orderBy(asc(tables.calendarEvents.startDate))
      : await db.select().from(tables.calendarEvents).orderBy(asc(tables.calendarEvents.startDate));
    return rows.map(row => ({
      id: row.id,
      matterId: row.matterId || undefined,
      taskId: row.taskId || undefined,
      title: row.title,
      description: row.description || "",
      eventType: row.eventType as any,
      startDate: row.startDate,
      endDate: row.endDate || undefined,
      allDay: row.allDay || false,
      location: row.location || undefined,
      attendees: (row.attendees as string[]) || [],
      reminderMinutes: row.reminderMinutes || undefined,
      color: row.color || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    }));
  }

  async getCalendarEvent(id: string): Promise<CalendarEvent | undefined> {
    await this.ensureInitialized();
    const [row] = await db.select().from(tables.calendarEvents).where(eq(tables.calendarEvents.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId || undefined,
      taskId: row.taskId || undefined,
      title: row.title,
      description: row.description || "",
      eventType: row.eventType as any,
      startDate: row.startDate,
      endDate: row.endDate || undefined,
      allDay: row.allDay || false,
      location: row.location || undefined,
      attendees: (row.attendees as string[]) || [],
      reminderMinutes: row.reminderMinutes || undefined,
      color: row.color || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    await this.ensureInitialized();
    const now = new Date();
    const [row] = await db.insert(tables.calendarEvents).values({
      matterId: data.matterId,
      taskId: data.taskId,
      title: data.title,
      description: data.description || "",
      eventType: data.eventType,
      startDate: data.startDate,
      endDate: data.endDate,
      allDay: data.allDay || false,
      location: data.location,
      attendees: data.attendees || [],
      reminderMinutes: data.reminderMinutes,
      color: data.color,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      matterId: row.matterId || undefined,
      taskId: row.taskId || undefined,
      title: row.title,
      description: row.description || "",
      eventType: row.eventType as any,
      startDate: row.startDate,
      endDate: row.endDate || undefined,
      allDay: row.allDay || false,
      location: row.location || undefined,
      attendees: (row.attendees as string[]) || [],
      reminderMinutes: row.reminderMinutes || undefined,
      color: row.color || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateCalendarEvent(id: string, data: Partial<CalendarEvent>): Promise<CalendarEvent | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.calendarEvents).set(updateWithTime).where(eq(tables.calendarEvents.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      matterId: row.matterId || undefined,
      taskId: row.taskId || undefined,
      title: row.title,
      description: row.description || "",
      eventType: row.eventType as any,
      startDate: row.startDate,
      endDate: row.endDate || undefined,
      allDay: row.allDay || false,
      location: row.location || undefined,
      attendees: (row.attendees as string[]) || [],
      reminderMinutes: row.reminderMinutes || undefined,
      color: row.color || undefined,
      createdBy: row.createdBy,
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteCalendarEvent(id: string): Promise<boolean> {
    await db.delete(tables.calendarEvents).where(eq(tables.calendarEvents.id, id));
    return true;
  }

  // Approval Requests
  async getApprovalRequests(matterId?: string): Promise<ApprovalRequest[]> {
    await this.ensureInitialized();
    const rows = matterId
      ? await db.select().from(tables.approvalRequests).where(eq(tables.approvalRequests.matterId, matterId)).orderBy(desc(tables.approvalRequests.createdAt))
      : await db.select().from(tables.approvalRequests).orderBy(desc(tables.approvalRequests.createdAt));
    return rows.map(row => ({
      id: row.id,
      fileId: row.fileId,
      matterId: row.matterId,
      title: row.title,
      description: row.description || "",
      requestedBy: row.requestedBy,
      requestedByName: row.requestedByName,
      assignedTo: (row.assignedTo as string[]) || [],
      status: (row.status || "pending") as any,
      dueDate: row.dueDate || undefined,
      priority: (row.priority || "medium") as any,
      comments: (row.comments as ApprovalComment[]) || [],
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    }));
  }

  async getApprovalRequest(id: string): Promise<ApprovalRequest | undefined> {
    await this.ensureInitialized();
    const [row] = await db.select().from(tables.approvalRequests).where(eq(tables.approvalRequests.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      fileId: row.fileId,
      matterId: row.matterId,
      title: row.title,
      description: row.description || "",
      requestedBy: row.requestedBy,
      requestedByName: row.requestedByName,
      assignedTo: (row.assignedTo as string[]) || [],
      status: (row.status || "pending") as any,
      dueDate: row.dueDate || undefined,
      priority: (row.priority || "medium") as any,
      comments: (row.comments as ApprovalComment[]) || [],
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async createApprovalRequest(data: InsertApprovalRequest): Promise<ApprovalRequest> {
    await this.ensureInitialized();
    const now = new Date();
    const [row] = await db.insert(tables.approvalRequests).values({
      fileId: data.fileId,
      matterId: data.matterId,
      title: data.title,
      description: data.description || "",
      requestedBy: data.requestedBy,
      requestedByName: data.requestedByName,
      assignedTo: data.assignedTo,
      status: "pending",
      dueDate: data.dueDate,
      priority: data.priority || "medium",
      comments: [],
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      fileId: row.fileId,
      matterId: row.matterId,
      title: row.title,
      description: row.description || "",
      requestedBy: row.requestedBy,
      requestedByName: row.requestedByName,
      assignedTo: (row.assignedTo as string[]) || [],
      status: (row.status || "pending") as any,
      dueDate: row.dueDate || undefined,
      priority: (row.priority || "medium") as any,
      comments: (row.comments as ApprovalComment[]) || [],
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateApprovalRequest(id: string, data: Partial<ApprovalRequest>): Promise<ApprovalRequest | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.approvalRequests).set(updateWithTime).where(eq(tables.approvalRequests.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      fileId: row.fileId,
      matterId: row.matterId,
      title: row.title,
      description: row.description || "",
      requestedBy: row.requestedBy,
      requestedByName: row.requestedByName,
      assignedTo: (row.assignedTo as string[]) || [],
      status: (row.status || "pending") as any,
      dueDate: row.dueDate || undefined,
      priority: (row.priority || "medium") as any,
      comments: (row.comments as ApprovalComment[]) || [],
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async deleteApprovalRequest(id: string): Promise<boolean> {
    await db.delete(tables.approvalRequests).where(eq(tables.approvalRequests.id, id));
    return true;
  }

  async addApprovalComment(data: InsertApprovalComment): Promise<ApprovalComment> {
    await this.ensureInitialized();
    const request = await this.getApprovalRequest(data.approvalId);
    if (!request) throw new Error("Approval request not found");
    
    const comment: ApprovalComment = {
      id: randomUUID(),
      userId: data.userId,
      userName: data.userName,
      content: data.content,
      decision: data.decision,
      createdAt: new Date().toISOString(),
    };
    
    const updatedComments = [...request.comments, comment];
    let newStatus = request.status;
    if (data.decision) {
      newStatus = data.decision === "approved" ? "approved" : 
                  data.decision === "rejected" ? "rejected" : "vetting";
    }
    
    await db.update(tables.approvalRequests)
      .set({ 
        comments: updatedComments,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(tables.approvalRequests.id, data.approvalId));
    
    return comment;
  }

  // ============ DOCUMENT TEMPLATES (In-Memory for now) ============
  private documentTemplatesCache: Map<string, DocumentTemplate> = new Map();
  private generatedDocumentsCache: Map<string, GeneratedDocument> = new Map();
  private documentApprovalsCache: Map<string, DocumentApproval> = new Map();
  private documentApprovalAuditsCache: Map<string, DocumentApprovalAudit> = new Map();
  private clientFormsCache: Map<string, ClientForm> = new Map();
  private clientFormSubmissionsCache: Map<string, ClientFormSubmission> = new Map();
  private documentTemplatesInitialized = false;

  private initializeDocumentTemplates() {
    if (this.documentTemplatesInitialized) return;
    
    const utahFormatDefaults = {
      paperSize: "8.5x11" as const,
      margins: { top: 1, right: 1, bottom: 1, left: 1 },
      fontSize: 12,
      fontFamily: "Times New Roman",
      lineSpacing: "double" as const,
      requiresCaption: true,
      requiresCertificateOfService: true,
      requiresSignatureBlock: true,
      requiresBilingualNotice: true,
    };

    const templates: DocumentTemplate[] = [
      {
        id: "tpl-motion-continuance",
        name: "Motion for Continuance",
        description: "Request to postpone a scheduled hearing, trial, or deadline in Utah courts",
        category: "motions",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

MOTION FOR CONTINUANCE

{{movingParty}}, by and through counsel, hereby moves this Court for an order continuing the {{eventType}} currently scheduled for {{currentDate}}.

STATEMENT OF FACTS

{{factStatement}}

GROUNDS FOR CONTINUANCE

{{groundsForContinuance}}

PROPOSED NEW DATE

{{movingParty}} respectfully requests that the {{eventType}} be rescheduled to {{proposedDate}}, or such other date as the Court deems appropriate.

GOOD CAUSE

Good cause exists for this continuance because: {{goodCauseStatement}}

WHEREFORE, {{movingParty}} respectfully requests that this Court grant this Motion and continue the {{eventType}} to {{proposedDate}}.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}
{{firmAddress}}
Attorney for {{representedParty}}

CERTIFICATE OF SERVICE

I hereby certify that on {{serviceDate}}, I served a true and correct copy of the foregoing MOTION FOR CONTINUANCE upon the following:

{{opposingCounselInfo}}

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true, placeholder: "Third District Court" },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "movingParty", name: "movingParty", label: "Moving Party", type: "select", required: true, options: ["Plaintiff", "Defendant"] },
          { id: "eventType", name: "eventType", label: "Event Type", type: "select", required: true, options: ["hearing", "trial", "deposition"] },
          { id: "currentDate", name: "currentDate", label: "Current Date", type: "date", required: true },
          { id: "proposedDate", name: "proposedDate", label: "Proposed Date", type: "date", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 7", "URCP Rule 6"],
        formatRequirements: { ...utahFormatDefaults, pageLimit: 25, wordLimit: 7750 },
        bilingualNoticeRequired: true,
        aiPromptInstructions: "Generate a professional motion for continuance following Utah Rules of Civil Procedure.",
        tags: ["motion", "continuance", "civil"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-motion-dismiss",
        name: "Motion to Dismiss",
        description: "Motion to dismiss under Utah Rules of Civil Procedure Rule 12(b)",
        category: "motions",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

MOTION TO DISMISS

{{movingParty}}, by and through counsel, hereby moves this Court pursuant to Utah Rule of Civil Procedure 12(b)({{dismissalBasis}}) for an order dismissing {{dismissTarget}}.

MEMORANDUM IN SUPPORT

I. INTRODUCTION

{{introduction}}

II. STATEMENT OF FACTS

{{factStatement}}

III. ARGUMENT

{{legalArgument}}

IV. CONCLUSION

For the reasons set forth above, {{movingParty}} respectfully requests that this Court grant this Motion and dismiss {{dismissTarget}}.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for {{representedParty}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "dismissalBasis", name: "dismissalBasis", label: "Dismissal Basis", type: "select", required: true, options: ["1 - Lack of jurisdiction", "6 - Failure to state a claim"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 12(b)", "URCP Rule 7"],
        formatRequirements: { ...utahFormatDefaults, pageLimit: 25, wordLimit: 7750 },
        bilingualNoticeRequired: true,
        aiPromptInstructions: "Generate a motion to dismiss following Utah Rules of Civil Procedure Rule 12(b).",
        tags: ["motion", "dismiss", "12(b)"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-civil-complaint",
        name: "Civil Complaint",
        description: "Initial complaint for civil action in Utah courts",
        category: "pleadings",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

COMPLAINT

Plaintiff {{plaintiffName}}, by and through counsel, hereby complains against Defendant as follows:

PARTIES

1. Plaintiff is {{plaintiffDescription}}.
2. Defendant is {{defendantDescription}}.

JURISDICTION AND VENUE

3. This Court has jurisdiction pursuant to {{jurisdictionBasis}}.
4. Venue is proper because {{venueBasis}}.

FACTUAL ALLEGATIONS

{{factualAllegations}}

CAUSES OF ACTION

{{causesOfAction}}

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests judgment against Defendant for:
1. Compensatory damages;
2. Costs and attorney's fees; and
3. Such other relief as the Court deems just.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 3", "URCP Rule 8", "URCP Rule 10"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a civil complaint following Utah Rules of Civil Procedure.",
        tags: ["pleading", "complaint", "civil"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-answer",
        name: "Answer to Complaint",
        description: "Defendant's answer to plaintiff's complaint",
        category: "pleadings",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

ANSWER TO COMPLAINT

Defendant {{defendantName}}, by and through counsel, answers Plaintiff's Complaint as follows:

GENERAL DENIAL

Defendant denies each allegation except as specifically admitted herein.

SPECIFIC RESPONSES

{{specificResponses}}

AFFIRMATIVE DEFENSES

{{affirmativeDefenses}}

PRAYER FOR RELIEF

WHEREFORE, Defendant requests:
1. Dismissal of Plaintiff's Complaint with prejudice;
2. Costs and attorney's fees; and
3. Such other relief as the Court deems just.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Defendant`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 8", "URCP Rule 12"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate an answer to complaint following Utah Rules of Civil Procedure.",
        tags: ["pleading", "answer", "defense"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-subpoena",
        name: "Subpoena",
        description: "Subpoena for witness testimony or document production",
        category: "discovery",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

SUBPOENA

TO: {{subpoenaRecipient}}
    {{recipientAddress}}

YOU ARE COMMANDED:

{{subpoenaType}}

{{specificInstructions}}

Failure to comply may result in contempt of court.

DATED this {{day}} day of {{month}}, {{year}}.

BY THE COURT:
_____________________________
Clerk of Court

ISSUED BY:
_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for {{representedParty}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "court", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "subpoenaRecipient", name: "subpoenaRecipient", label: "Recipient", type: "text", required: true },
          { id: "subpoenaType", name: "subpoenaType", label: "Type", type: "select", required: true, options: ["Testify at hearing", "Testify at deposition", "Produce documents"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 45"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a subpoena following Utah Rules of Civil Procedure Rule 45.",
        tags: ["discovery", "subpoena"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // ============ CIVIL LITIGATION FORMS ============
      {
        id: "tpl-civil-cover-sheet",
        name: "Civil Filing Cover Sheet",
        description: "Required cover sheet for filing civil actions in Utah District Court (Form 1000GE)",
        category: "court-filings",
        jurisdiction: "utah-district-court",
        templateContent: `CIVIL FILING COVER SHEET
Utah District Court (Form 1000GE)

CASE INFORMATION:
Court: {{courtName}}
County: {{courtCounty}}

PARTY INFORMATION:
Plaintiff(s): {{plaintiffName}}
Plaintiff Attorney/Self-Represented: {{plaintiffAttorney}}
Bar Number: {{barNumber}}
Address: {{plaintiffAddress}}
Phone: {{plaintiffPhone}}
Email: {{plaintiffEmail}}

Defendant(s): {{defendantName}}
Defendant Attorney (if known): {{defendantAttorney}}

CASE TYPE (Check one):
{{caseType}}

TIER DESIGNATION (per URCP 26):
{{tierDesignation}}

RELATED CASES:
{{relatedCases}}

JURY DEMAND: {{juryDemand}}

I certify that the information provided is true and correct to the best of my knowledge.

Date: {{filingDate}}
Signature: _____________________________`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true, placeholder: "Third District Court" },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Iron", "Summit", "Tooele"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name(s)", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name(s)", type: "party", required: true },
          { id: "caseType", name: "caseType", label: "Case Type", type: "select", required: true, options: ["Contract", "Personal Injury - Motor Vehicle", "Personal Injury - Other", "Property Damage", "Medical Malpractice", "Product Liability", "Wrongful Death", "Other Tort", "Real Property", "Domestic Relations", "Probate", "Other Civil"] },
          { id: "tierDesignation", name: "tierDesignation", label: "Tier Designation", type: "select", required: true, options: ["Tier 1 (Up to $50,000)", "Tier 2 ($50,001-$300,000)", "Tier 3 (Over $300,000 or non-monetary)"] },
          { id: "juryDemand", name: "juryDemand", label: "Jury Demand", type: "select", required: true, options: ["Yes", "No"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 3", "URCP Rule 26"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a civil filing cover sheet following Utah District Court requirements.",
        tags: ["filing", "cover-sheet", "civil"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-summons-utah",
        name: "Summons (In Utah)",
        description: "Official summons for defendants located within Utah with 21-day response period (Form 1016GE)",
        category: "court-filings",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}

SUMMONS

THE STATE OF UTAH TO THE ABOVE-NAMED DEFENDANT(S):

You are hereby summoned and required to file an answer in writing to the Complaint which is filed with the Clerk of the Court in the above-entitled action, and to serve upon, or mail to, the Plaintiff's attorney at the address below, a copy of your answer within 21 days after service of this Summons upon you.

If you fail to do so, judgment by default will be taken against you for the relief demanded in the Complaint, which has been filed with the Clerk of this Court and a copy of which is hereto attached and herewith served upon you.

Plaintiff's Attorney:
{{attorneyName}}
{{firmName}}
{{firmAddress}}
{{firmPhone}}
{{firmEmail}}

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
Clerk of the Court

By: _____________________________
     Deputy Clerk`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Iron", "Summit", "Tooele"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "attorneyName", name: "attorneyName", label: "Attorney Name", type: "text", required: true },
          { id: "firmName", name: "firmName", label: "Firm Name", type: "text", required: true },
          { id: "firmAddress", name: "firmAddress", label: "Firm Address", type: "text", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 4"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a summons for in-state service following Utah Rules of Civil Procedure Rule 4.",
        tags: ["summons", "service", "civil"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-proof-of-service",
        name: "Proof of Service",
        description: "Certificate proving proper service of summons and complaint (Form 1020GE)",
        category: "court-filings",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}

PROOF OF SERVICE

I, {{serverName}}, being first duly sworn, state:

1. I am over the age of 18 and am not a party to this action.

2. On {{serviceDate}}, at approximately {{serviceTime}}, I served the following documents:
   {{documentsServed}}

3. Service was made on: {{personServed}}
   
4. Location of service: {{serviceLocation}}

5. Method of service:
   {{serviceMethod}}

6. Description of person served:
   Sex: {{personSex}}
   Approximate Age: {{personAge}}
   Hair Color: {{personHair}}
   Height: {{personHeight}}
   Weight: {{personWeight}}

I declare under penalty of perjury under the laws of the State of Utah that the foregoing is true and correct.

Executed on {{executionDate}} at {{executionCity}}, Utah.

_____________________________
{{serverName}}
Process Server

SUBSCRIBED AND SWORN to before me this {{notaryDay}} day of {{notaryMonth}}, {{notaryYear}}.

_____________________________
Notary Public
My Commission Expires: {{commissionExpires}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "serverName", name: "serverName", label: "Process Server Name", type: "text", required: true },
          { id: "serviceDate", name: "serviceDate", label: "Date of Service", type: "date", required: true },
          { id: "personServed", name: "personServed", label: "Person Served", type: "text", required: true },
          { id: "serviceLocation", name: "serviceLocation", label: "Service Location", type: "text", required: true },
          { id: "serviceMethod", name: "serviceMethod", label: "Method of Service", type: "select", required: true, options: ["Personal service to defendant", "Personal service to agent", "Personal service to person of suitable age at dwelling", "Substituted service", "Service by mail with acknowledgment"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 4"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a proof of service affidavit following Utah Rules of Civil Procedure.",
        tags: ["service", "proof", "affidavit"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // ============ PERSONAL INJURY / TORT TEMPLATES ============
      {
        id: "tpl-pi-complaint-negligence",
        name: "Personal Injury Complaint - General Negligence",
        description: "Comprehensive complaint for personal injury claims based on negligence theory",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

COMPLAINT FOR PERSONAL INJURY (NEGLIGENCE)

Plaintiff {{plaintiffName}}, by and through counsel, complains against Defendant {{defendantName}} and alleges as follows:

PARTIES

1. Plaintiff {{plaintiffName}} is a resident of {{plaintiffCounty}} County, State of Utah.

2. Defendant {{defendantName}} is {{defendantDescription}}.

JURISDICTION AND VENUE

3. This Court has jurisdiction over this action pursuant to Utah Code § 78A-5-102.

4. Venue is proper in {{courtCounty}} County pursuant to Utah Code § 78B-3-307 because {{venueBasis}}.

FACTUAL ALLEGATIONS

5. On or about {{incidentDate}}, at approximately {{incidentTime}}, Plaintiff was {{plaintiffActivity}} at {{incidentLocation}}.

6. At that time and place, Defendant {{defendantConduct}}.

7. {{additionalFacts}}

FIRST CAUSE OF ACTION: NEGLIGENCE

8. Plaintiff incorporates by reference paragraphs 1 through 7 as if fully set forth herein.

9. Defendant owed a duty of care to Plaintiff to {{dutyDescription}}.

10. Defendant breached this duty by {{breachDescription}}.

11. As a direct and proximate result of Defendant's negligence, Plaintiff suffered the following injuries and damages:
    a. Physical injuries including but not limited to: {{physicalInjuries}}
    b. Pain and suffering, both past and continuing;
    c. Medical expenses incurred and to be incurred in the amount of {{medicalExpenses}};
    d. Lost wages and earning capacity in the amount of {{lostWages}};
    e. Property damage in the amount of {{propertyDamage}};
    f. Emotional distress and mental anguish;
    g. Loss of enjoyment of life;
    h. Such other damages as may be proven at trial.

12. At the time of the incident, Plaintiff was free of negligence or, alternatively, any negligence attributable to Plaintiff was less than that of Defendant.

PRAYER FOR RELIEF

WHEREFORE, Plaintiff respectfully requests judgment against Defendant as follows:

1. Compensatory damages in an amount to be proven at trial but believed to exceed {{damageAmount}};
2. Special damages for medical expenses, lost wages, and other economic losses;
3. General damages for pain and suffering, emotional distress, and loss of enjoyment of life;
4. Pre-judgment and post-judgment interest as allowed by law;
5. Costs of suit incurred herein;
6. Such other and further relief as the Court deems just and proper.

DEMAND FOR JURY TRIAL

Plaintiff hereby demands a trial by jury on all issues so triable.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}
{{firmAddress}}
Telephone: {{firmPhone}}
Email: {{firmEmail}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Iron", "Summit", "Tooele"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "plaintiffCounty", name: "plaintiffCounty", label: "Plaintiff's County of Residence", type: "text", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "defendantDescription", name: "defendantDescription", label: "Defendant Description", type: "textarea", required: true, placeholder: "e.g., an individual residing in Salt Lake County, Utah" },
          { id: "incidentDate", name: "incidentDate", label: "Date of Incident", type: "date", required: true },
          { id: "incidentLocation", name: "incidentLocation", label: "Location of Incident", type: "text", required: true },
          { id: "physicalInjuries", name: "physicalInjuries", label: "Physical Injuries Sustained", type: "textarea", required: true },
          { id: "damageAmount", name: "damageAmount", label: "Estimated Damages", type: "select", required: true, options: ["$50,000", "$100,000", "$300,000", "$500,000", "$1,000,000"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 8", "URCP Rule 9", "Utah Code § 78B-3-106"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a comprehensive personal injury complaint based on negligence theory, following Utah Rules of Civil Procedure. Include specific factual allegations, clear duty-breach-causation-damages structure, and proper prayer for relief.",
        tags: ["complaint", "personal-injury", "negligence", "tort"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-pi-complaint-mva",
        name: "Motor Vehicle Accident Complaint",
        description: "Personal injury complaint for automobile accident cases with specific allegations for vehicle collisions",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

COMPLAINT FOR PERSONAL INJURY ARISING FROM MOTOR VEHICLE ACCIDENT

Plaintiff {{plaintiffName}}, by and through counsel, complains against Defendant {{defendantName}} and alleges as follows:

PARTIES

1. Plaintiff {{plaintiffName}} is a resident of {{plaintiffCounty}} County, State of Utah.

2. Defendant {{defendantName}} is a resident of {{defendantCounty}} County, State of Utah.

3. At all times relevant hereto, Defendant was the owner and/or operator of a {{defendantVehicle}}.

JURISDICTION AND VENUE

4. This Court has jurisdiction pursuant to Utah Code § 78A-5-102.

5. Venue is proper in {{courtCounty}} County because the accident occurred in this county.

FACTUAL ALLEGATIONS

6. On {{accidentDate}}, at approximately {{accidentTime}}, Plaintiff was operating a {{plaintiffVehicle}} in a {{plaintiffDirection}} direction on {{roadName}} near {{accidentLocation}}.

7. At that time and place, Defendant was operating a {{defendantVehicle}} in a {{defendantDirection}} direction on {{defendantRoad}}.

8. Defendant negligently and carelessly operated the motor vehicle by:
   a. {{negligentAct1}}
   b. {{negligentAct2}}
   c. {{negligentAct3}}
   d. Failing to keep a proper lookout;
   e. Failing to maintain proper control of the vehicle;
   f. Driving in a manner that violated Utah traffic laws.

9. As a direct and proximate result of Defendant's negligence, Defendant's vehicle collided with Plaintiff's vehicle.

10. {{accidentDescription}}

FIRST CAUSE OF ACTION: NEGLIGENCE

11. Plaintiff incorporates by reference paragraphs 1 through 10 as if fully set forth herein.

12. Defendant owed Plaintiff a duty to operate the motor vehicle with reasonable care.

13. Defendant breached this duty by negligently operating the vehicle as described above.

14. As a direct and proximate result of Defendant's negligence, Plaintiff suffered:
    a. Bodily injuries including: {{injuries}}
    b. Past and future pain and suffering;
    c. Past medical expenses in the amount of \${{pastMedical}};
    d. Future medical expenses estimated at \${{futureMedical}};
    e. Lost wages in the amount of \${{lostWages}};
    f. Loss of future earning capacity;
    g. Property damage to Plaintiff's vehicle in the amount of \${{propertyDamage}};
    h. Emotional distress;
    i. Loss of enjoyment of life.

15. Utah is a comparative fault state pursuant to Utah Code § 78B-5-818. Plaintiff's fault, if any, is less than Defendant's fault.

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests judgment against Defendant as follows:

1. Compensatory damages in excess of {{damageAmount}};
2. Special damages for medical expenses, lost wages, and property damage;
3. General damages for pain and suffering;
4. Pre-judgment and post-judgment interest;
5. Costs of suit;
6. Such other relief as the Court deems just.

DEMAND FOR JURY TRIAL

Plaintiff demands a trial by jury.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington", "Cache", "Box Elder", "Iron", "Summit", "Tooele"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "accidentDate", name: "accidentDate", label: "Date of Accident", type: "date", required: true },
          { id: "accidentTime", name: "accidentTime", label: "Time of Accident", type: "text", required: true, placeholder: "e.g., 3:45 PM" },
          { id: "accidentLocation", name: "accidentLocation", label: "Accident Location", type: "text", required: true, placeholder: "e.g., 500 South and State Street, Salt Lake City" },
          { id: "plaintiffVehicle", name: "plaintiffVehicle", label: "Plaintiff's Vehicle", type: "text", required: true, placeholder: "e.g., 2020 Honda Accord" },
          { id: "defendantVehicle", name: "defendantVehicle", label: "Defendant's Vehicle", type: "text", required: true, placeholder: "e.g., 2019 Ford F-150" },
          { id: "injuries", name: "injuries", label: "Injuries Sustained", type: "textarea", required: true },
          { id: "damageAmount", name: "damageAmount", label: "Estimated Damages", type: "select", required: true, options: ["$50,000", "$100,000", "$300,000", "$500,000", "$1,000,000"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 8", "Utah Code § 78B-5-818", "Utah Code § 41-6a"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a comprehensive motor vehicle accident complaint including specific allegations of negligent driving, detailed description of the collision, injuries sustained, and damages claimed. Reference Utah's comparative fault statute.",
        tags: ["complaint", "personal-injury", "motor-vehicle", "auto-accident", "tort"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-pi-complaint-premises",
        name: "Premises Liability / Slip and Fall Complaint",
        description: "Personal injury complaint for slip and fall or dangerous premises conditions",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

COMPLAINT FOR PERSONAL INJURY (PREMISES LIABILITY)

Plaintiff {{plaintiffName}}, by and through counsel, complains against Defendant and alleges:

PARTIES

1. Plaintiff {{plaintiffName}} is a resident of Utah.

2. Defendant {{defendantName}} is {{defendantDescription}} and was at all relevant times the owner, operator, manager, or occupier of the premises located at {{premisesAddress}} ("the Premises").

JURISDICTION AND VENUE

3. This Court has jurisdiction pursuant to Utah Code § 78A-5-102.

4. Venue is proper in {{courtCounty}} County because the incident occurred in this county.

FACTUAL ALLEGATIONS

5. On {{incidentDate}}, at approximately {{incidentTime}}, Plaintiff was lawfully present on the Premises as a {{entrantStatus}}.

6. At that time and place, a dangerous condition existed on the Premises, specifically: {{dangerousCondition}}.

7. This dangerous condition was created by, known to, or should have been known to Defendant through the exercise of reasonable care.

8. Defendant failed to remedy the dangerous condition or adequately warn Plaintiff of its existence.

9. As a result of the dangerous condition, Plaintiff {{incidentDescription}}.

FIRST CAUSE OF ACTION: NEGLIGENCE (PREMISES LIABILITY)

10. Plaintiff incorporates paragraphs 1-9 by reference.

11. As the owner/operator/manager of the Premises, Defendant owed Plaintiff a duty to:
    a. Maintain the Premises in a reasonably safe condition;
    b. Inspect the Premises to discover dangerous conditions;
    c. Remedy dangerous conditions or warn of their existence;
    d. Exercise reasonable care to protect persons lawfully on the Premises.

12. Defendant breached these duties by:
    a. {{breachAct1}}
    b. {{breachAct2}}
    c. Failing to inspect or maintain the Premises;
    d. Failing to warn of the dangerous condition.

13. As a direct and proximate result of Defendant's negligence, Plaintiff suffered:
    a. Physical injuries including: {{injuries}}
    b. Pain and suffering;
    c. Medical expenses: \${{medicalExpenses}};
    d. Lost wages: \${{lostWages}};
    e. Emotional distress;
    f. Permanent impairment and disfigurement;
    g. Loss of enjoyment of life.

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests:
1. Compensatory damages exceeding {{damageAmount}};
2. Special and general damages;
3. Pre-judgment and post-judgment interest;
4. Costs of suit;
5. Such other relief as the Court deems just.

DEMAND FOR JURY TRIAL

Plaintiff demands a jury trial.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "defendantDescription", name: "defendantDescription", label: "Defendant Description", type: "text", required: true, placeholder: "e.g., a Utah corporation doing business as..." },
          { id: "premisesAddress", name: "premisesAddress", label: "Premises Address", type: "text", required: true },
          { id: "incidentDate", name: "incidentDate", label: "Date of Incident", type: "date", required: true },
          { id: "entrantStatus", name: "entrantStatus", label: "Plaintiff's Status", type: "select", required: true, options: ["business invitee", "social guest", "licensee", "customer"] },
          { id: "dangerousCondition", name: "dangerousCondition", label: "Dangerous Condition", type: "textarea", required: true, placeholder: "e.g., wet floor without warning signs, broken step, ice accumulation" },
          { id: "injuries", name: "injuries", label: "Injuries Sustained", type: "textarea", required: true },
          { id: "damageAmount", name: "damageAmount", label: "Estimated Damages", type: "select", required: true, options: ["$50,000", "$100,000", "$300,000", "$500,000"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 8", "Utah Code § 78B-5-818"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a premises liability complaint including specific allegations about the dangerous condition, defendant's knowledge or constructive knowledge, and breach of duty to maintain safe premises.",
        tags: ["complaint", "personal-injury", "premises-liability", "slip-fall", "tort"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-wrongful-death-complaint",
        name: "Wrongful Death Complaint",
        description: "Complaint for wrongful death action under Utah Code § 78B-3-106",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}}, individually and as 
Personal Representative of the Estate 
of {{decedentName}}, deceased,
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

COMPLAINT FOR WRONGFUL DEATH

Plaintiff {{plaintiffName}}, individually and as Personal Representative of the Estate of {{decedentName}}, deceased, by and through counsel, complains against Defendant and alleges:

PARTIES

1. Plaintiff {{plaintiffName}} is {{plaintiffRelationship}} of {{decedentName}}, deceased, and brings this action individually and as the duly appointed Personal Representative of the Estate of {{decedentName}}.

2. {{decedentName}} ("Decedent") was a resident of {{decedentCounty}} County, Utah, at the time of death.

3. Decedent died on {{deathDate}}.

4. Defendant {{defendantName}} is {{defendantDescription}}.

5. The following persons are heirs of the Decedent entitled to damages under Utah Code § 78B-3-106:
   {{heirs}}

JURISDICTION AND VENUE

6. This Court has jurisdiction pursuant to Utah Code § 78A-5-102.

7. Venue is proper in {{courtCounty}} County.

FACTUAL ALLEGATIONS

8. On or about {{incidentDate}}, {{incidentDescription}}.

9. As a direct and proximate result of Defendant's wrongful act, neglect, or default, Decedent suffered fatal injuries and died on {{deathDate}}.

10. {{additionalFacts}}

FIRST CAUSE OF ACTION: WRONGFUL DEATH (Utah Code § 78B-3-106)

11. Plaintiff incorporates paragraphs 1-10 by reference.

12. Pursuant to Utah Code § 78B-3-106, when the death of a person is caused by the wrongful act or neglect of another, the heirs or personal representative may maintain an action for damages.

13. Defendant owed a duty of care to Decedent.

14. Defendant breached this duty by {{breachDescription}}.

15. As a direct and proximate result of Defendant's wrongful conduct, Decedent died.

16. Decedent's heirs have suffered and continue to suffer the following damages:
    a. Loss of financial support Decedent would have provided;
    b. Loss of love, companionship, comfort, care, and consortium;
    c. Loss of Decedent's services in the home;
    d. Funeral and burial expenses in the amount of \${{funeralExpenses}};
    e. Medical expenses incurred prior to death in the amount of \${{medicalExpenses}};
    f. Pain and suffering of Decedent prior to death;
    g. Loss of inheritance.

SECOND CAUSE OF ACTION: NEGLIGENCE

17. Plaintiff incorporates all previous paragraphs by reference.

18. Defendant was negligent in that Defendant failed to exercise reasonable care.

19. Said negligence was the proximate cause of Decedent's death.

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests:
1. Compensatory damages in excess of {{damageAmount}};
2. Special damages for funeral expenses and medical bills;
3. General damages for loss of consortium and companionship;
4. Pre-judgment and post-judgment interest;
5. Costs of suit;
6. Such other relief as the Court deems just.

DEMAND FOR JURY TRIAL

Plaintiff demands a jury trial.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Personal Representative Name", type: "party", required: true },
          { id: "plaintiffRelationship", name: "plaintiffRelationship", label: "Relationship to Decedent", type: "select", required: true, options: ["the surviving spouse", "the surviving child", "the surviving parent", "a sibling"] },
          { id: "decedentName", name: "decedentName", label: "Decedent's Name", type: "party", required: true },
          { id: "deathDate", name: "deathDate", label: "Date of Death", type: "date", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "incidentDate", name: "incidentDate", label: "Date of Incident", type: "date", required: true },
          { id: "incidentDescription", name: "incidentDescription", label: "Description of Incident", type: "textarea", required: true },
          { id: "damageAmount", name: "damageAmount", label: "Estimated Damages", type: "select", required: true, options: ["$300,000", "$500,000", "$1,000,000", "$2,000,000"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["Utah Code § 78B-3-106", "Utah Code § 78B-3-107", "URCP Rule 8"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a wrongful death complaint under Utah Code § 78B-3-106, including identification of heirs, description of the wrongful act causing death, and itemization of damages including economic losses and loss of consortium.",
        tags: ["complaint", "wrongful-death", "tort"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-medical-malpractice-complaint",
        name: "Medical Malpractice Complaint",
        description: "Complaint for medical malpractice/professional negligence with prelitigation requirements",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}}, {{defendantCredentials}},
    Defendant.

COMPLAINT FOR MEDICAL MALPRACTICE

Plaintiff {{plaintiffName}}, by and through counsel, complains against Defendant and alleges:

PARTIES

1. Plaintiff {{plaintiffName}} is a resident of Utah.

2. Defendant {{defendantName}} is a {{healthcareProviderType}} licensed to practice in Utah and was at all relevant times providing medical care to Plaintiff.

3. At all times relevant hereto, Defendant was acting within the course and scope of employment at {{facilityName}}.

JURISDICTION AND VENUE

4. This Court has jurisdiction pursuant to Utah Code § 78A-5-102.

5. Venue is proper in {{courtCounty}} County.

PRELITIGATION REQUIREMENTS

6. Plaintiff has complied with the prelitigation requirements of the Utah Health Care Malpractice Act, Utah Code § 78B-3-401 et seq.

7. Plaintiff has provided Defendant with the required Notice of Intent to Commence Action.

8. Plaintiff has obtained an affidavit from a qualified healthcare provider as required by Utah Code § 78B-3-423.

FACTUAL ALLEGATIONS

9. On or about {{treatmentDate}}, Plaintiff sought medical care from Defendant for {{medicalCondition}}.

10. Defendant undertook to provide medical care and treatment to Plaintiff, thereby establishing a physician-patient relationship.

11. In the course of providing such care, Defendant {{negligentActs}}.

12. {{additionalFacts}}

FIRST CAUSE OF ACTION: MEDICAL MALPRACTICE/PROFESSIONAL NEGLIGENCE

13. Plaintiff incorporates paragraphs 1-12 by reference.

14. Defendant owed Plaintiff a duty to provide medical care in accordance with the standard of care applicable to {{healthcareProviderType}} in the same or similar community.

15. Defendant breached the applicable standard of care by:
    a. {{breachAct1}}
    b. {{breachAct2}}
    c. {{breachAct3}}

16. As a direct and proximate result of Defendant's breach of the standard of care, Plaintiff suffered:
    a. Physical injuries including: {{injuries}}
    b. The need for additional medical treatment;
    c. Pain and suffering;
    d. Medical expenses of \${{medicalExpenses}};
    e. Lost wages of \${{lostWages}};
    f. Permanent impairment;
    g. Emotional distress.

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests:
1. Compensatory damages;
2. Special damages for medical expenses and lost wages;
3. General damages for pain and suffering;
4. Pre-judgment and post-judgment interest;
5. Costs of suit;
6. Such other relief as the Court deems just.

Note: Non-economic damages may be subject to the cap under Utah Code § 78B-3-410.

DEMAND FOR JURY TRIAL

Plaintiff demands a jury trial.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff

CERTIFICATE OF COMPLIANCE WITH PRELITIGATION REQUIREMENTS

I hereby certify that the prelitigation requirements of Utah Code § 78B-3-412 have been met prior to the filing of this Complaint.

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Healthcare Provider Name", type: "party", required: true },
          { id: "defendantCredentials", name: "defendantCredentials", label: "Provider Credentials", type: "text", required: true, placeholder: "e.g., M.D., D.O., R.N." },
          { id: "healthcareProviderType", name: "healthcareProviderType", label: "Provider Type", type: "select", required: true, options: ["physician", "surgeon", "nurse practitioner", "registered nurse", "hospital", "medical clinic"] },
          { id: "facilityName", name: "facilityName", label: "Medical Facility", type: "text", required: true },
          { id: "treatmentDate", name: "treatmentDate", label: "Date of Treatment", type: "date", required: true },
          { id: "medicalCondition", name: "medicalCondition", label: "Medical Condition", type: "text", required: true },
          { id: "negligentActs", name: "negligentActs", label: "Negligent Acts", type: "textarea", required: true },
          { id: "injuries", name: "injuries", label: "Resulting Injuries", type: "textarea", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["Utah Code § 78B-3-401", "Utah Code § 78B-3-410", "Utah Code § 78B-3-412", "Utah Code § 78B-3-423"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a medical malpractice complaint including reference to Utah Health Care Malpractice Act prelitigation requirements, standard of care allegations, and specific acts of negligence. Note the non-economic damages cap.",
        tags: ["complaint", "medical-malpractice", "tort", "professional-negligence"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-product-liability-complaint",
        name: "Product Liability Complaint",
        description: "Complaint for defective product claims under negligence, strict liability, and breach of warranty theories",
        category: "torts",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{manufacturerName}}, {{distributorName}}, 
and {{retailerName}},
    Defendants.

COMPLAINT FOR PRODUCT LIABILITY

Plaintiff, by and through counsel, complains against Defendants and alleges:

PARTIES

1. Plaintiff {{plaintiffName}} is a resident of Utah.

2. Defendant {{manufacturerName}} ("Manufacturer") is a corporation that designed, manufactured, and/or assembled the {{productName}}.

3. Defendant {{distributorName}} ("Distributor") distributed the {{productName}}.

4. Defendant {{retailerName}} ("Retailer") sold the {{productName}} to Plaintiff.

5. Defendants are collectively referred to as "Defendants."

JURISDICTION AND VENUE

6. This Court has jurisdiction pursuant to Utah Code § 78A-5-102.

7. Venue is proper in {{courtCounty}} County.

FACTUAL ALLEGATIONS

8. On or about {{purchaseDate}}, Plaintiff purchased a {{productName}} ("the Product") from Retailer.

9. On {{incidentDate}}, while using the Product in a normal and foreseeable manner, {{incidentDescription}}.

10. The Product was defective in that: {{defectDescription}}.

11. The defect existed at the time the Product left Defendants' control.

12. As a result of the defect, Plaintiff suffered injuries and damages.

FIRST CAUSE OF ACTION: STRICT PRODUCT LIABILITY (Design Defect)

13. Plaintiff incorporates paragraphs 1-12 by reference.

14. The Product was defectively designed in that {{designDefect}}.

15. A reasonable alternative design existed that would have prevented Plaintiff's injuries.

16. The defective design rendered the Product unreasonably dangerous.

17. Plaintiff suffered damages as a direct and proximate result.

SECOND CAUSE OF ACTION: STRICT PRODUCT LIABILITY (Manufacturing Defect)

18. Plaintiff incorporates all previous paragraphs by reference.

19. The Product deviated from its intended design due to a manufacturing defect.

20. The manufacturing defect caused the Product to be unreasonably dangerous.

THIRD CAUSE OF ACTION: FAILURE TO WARN

21. Plaintiff incorporates all previous paragraphs by reference.

22. Defendants knew or should have known of the dangers associated with the Product.

23. Defendants failed to provide adequate warnings or instructions.

24. Adequate warnings would have prevented Plaintiff's injuries.

FOURTH CAUSE OF ACTION: NEGLIGENCE

25. Plaintiff incorporates all previous paragraphs by reference.

26. Defendants owed a duty of care in designing, manufacturing, and distributing the Product.

27. Defendants breached this duty.

28. Plaintiff was injured as a proximate result.

FIFTH CAUSE OF ACTION: BREACH OF WARRANTY

29. Plaintiff incorporates all previous paragraphs by reference.

30. Defendants made express and/or implied warranties regarding the Product.

31. The Product did not conform to these warranties.

32. Plaintiff was damaged as a result.

DAMAGES

33. As a result of Defendants' conduct, Plaintiff suffered:
    a. Physical injuries: {{injuries}}
    b. Medical expenses: \${{medicalExpenses}}
    c. Lost wages: \${{lostWages}}
    d. Pain and suffering
    e. Permanent impairment
    f. Property damage

PRAYER FOR RELIEF

WHEREFORE, Plaintiff requests:
1. Compensatory damages exceeding {{damageAmount}};
2. Punitive damages for willful and wanton conduct;
3. Pre-judgment and post-judgment interest;
4. Costs of suit;
5. Such other relief as the Court deems just.

DEMAND FOR JURY TRIAL

Plaintiff demands a jury trial.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "manufacturerName", name: "manufacturerName", label: "Manufacturer Name", type: "party", required: true },
          { id: "productName", name: "productName", label: "Product Name/Description", type: "text", required: true },
          { id: "purchaseDate", name: "purchaseDate", label: "Purchase Date", type: "date", required: true },
          { id: "incidentDate", name: "incidentDate", label: "Incident Date", type: "date", required: true },
          { id: "defectDescription", name: "defectDescription", label: "Defect Description", type: "textarea", required: true },
          { id: "injuries", name: "injuries", label: "Injuries", type: "textarea", required: true },
          { id: "damageAmount", name: "damageAmount", label: "Estimated Damages", type: "select", required: true, options: ["$100,000", "$300,000", "$500,000", "$1,000,000"] },
        ],
        optionalFields: [],
        utahRuleReferences: ["Utah Code § 78B-6-701", "URCP Rule 8"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a product liability complaint with multiple theories of recovery including strict liability, negligence, and breach of warranty. Include specific allegations about the product defect.",
        tags: ["complaint", "product-liability", "tort", "strict-liability"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // ============ DISCOVERY TEMPLATES ============
      {
        id: "tpl-interrogatories-plaintiff",
        name: "Interrogatories - Plaintiff to Defendant",
        description: "Standard interrogatories from plaintiff to defendant for personal injury cases (Tier 2: 10 interrogatories)",
        category: "discovery",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

PLAINTIFF'S FIRST SET OF INTERROGATORIES TO DEFENDANT

TO: {{defendantName}}, Defendant, and counsel of record:

Pursuant to Rules 26 and 33 of the Utah Rules of Civil Procedure, Plaintiff propounds the following Interrogatories to be answered under oath within twenty-eight (28) days.

DEFINITIONS AND INSTRUCTIONS

1. "You" or "Defendant" refers to {{defendantName}} and any agents, employees, representatives, or attorneys.

2. "Incident" refers to the events of {{incidentDate}} giving rise to this lawsuit.

3. "Document" includes all writings, recordings, and electronically stored information as defined in URCP 34.

INTERROGATORIES

INTERROGATORY NO. 1:
State your full legal name, all other names used, date of birth, current address, and all addresses for the past five years.

INTERROGATORY NO. 2:
State your employment history for the past ten years, including employer name, address, position, and dates of employment.

INTERROGATORY NO. 3:
Describe in detail your version of how the Incident occurred, including all actions taken by you before, during, and after the Incident.

INTERROGATORY NO. 4:
Identify all persons known to you who witnessed or have knowledge of the Incident, including their names, addresses, telephone numbers, and a summary of their knowledge.

INTERROGATORY NO. 5:
Identify all documents, photographs, videos, or other tangible evidence in your possession relating to the Incident.

INTERROGATORY NO. 6:
State whether you have given any written or recorded statements regarding the Incident and identify to whom such statements were given.

INTERROGATORY NO. 7:
Identify all insurance policies that may provide coverage for the claims in this lawsuit, including carrier name, policy number, and coverage limits.

INTERROGATORY NO. 8:
Have you ever been convicted of a crime? If so, state the nature of the crime, date, court, and disposition.

INTERROGATORY NO. 9:
Identify all expert witnesses you intend to call at trial, including their qualifications and the subject matter of their testimony.

INTERROGATORY NO. 10:
Describe any defenses you intend to assert in this action and the factual basis for each defense.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for Plaintiff

CERTIFICATE OF SERVICE

I certify that on {{serviceDate}}, I served a copy of these Interrogatories on Defendant's counsel by {{serviceMethod}}.

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "incidentDate", name: "incidentDate", label: "Incident Date", type: "date", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 26", "URCP Rule 33"],
        formatRequirements: { ...utahFormatDefaults, requiresBilingualNotice: false },
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate standard interrogatories for personal injury cases following URCP Rule 33. Stay within tier limits (10 interrogatories for Tier 2). Focus on incident facts, witnesses, insurance, and defenses.",
        tags: ["discovery", "interrogatories", "personal-injury"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-requests-production",
        name: "Requests for Production of Documents",
        description: "Standard requests for production in civil litigation (Tier 2: 10 requests)",
        category: "discovery",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

{{partyRole}}'S FIRST SET OF REQUESTS FOR PRODUCTION OF DOCUMENTS

TO: {{opposingParty}}, and counsel of record:

Pursuant to Rules 26 and 34 of the Utah Rules of Civil Procedure, {{requestingParty}} requests that {{opposingParty}} produce the following documents for inspection and copying within twenty-eight (28) days.

DEFINITIONS

1. "Document" has the meaning set forth in URCP 34(a) and includes all writings, drawings, graphs, charts, photographs, recordings, and electronically stored information.

2. "Communication" includes all written, oral, and electronic communications.

3. "Incident" refers to the events of {{incidentDate}}.

INSTRUCTIONS

1. Produce all documents in your possession, custody, or control.
2. If any document is withheld on privilege grounds, provide a privilege log.
3. Produce documents as they are kept in the ordinary course of business.

REQUESTS FOR PRODUCTION

REQUEST NO. 1:
All documents relating to the Incident, including but not limited to reports, memoranda, notes, photographs, and videos.

REQUEST NO. 2:
All statements (written or recorded) made by any party or witness concerning the Incident.

REQUEST NO. 3:
All photographs, videos, diagrams, or other visual depictions of the scene of the Incident, any vehicles involved, or any injuries claimed.

REQUEST NO. 4:
All insurance policies, declarations pages, and correspondence with insurers relating to coverage for the claims in this lawsuit.

REQUEST NO. 5:
All documents constituting, referring to, or relating to any investigation of the Incident.

REQUEST NO. 6:
All communications between any parties or witnesses concerning the Incident.

REQUEST NO. 7:
All medical records, bills, and other documents relating to injuries claimed to have resulted from the Incident.

REQUEST NO. 8:
All documents relating to any prior incidents similar to the Incident at issue.

REQUEST NO. 9:
All documents supporting any defenses you intend to assert in this action.

REQUEST NO. 10:
All expert reports, opinions, or other documents prepared by any expert retained in connection with this lawsuit.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for {{requestingParty}}

CERTIFICATE OF SERVICE

I certify that on {{serviceDate}}, I served these Requests by {{serviceMethod}}.

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "partyRole", name: "partyRole", label: "Requesting Party Role", type: "select", required: true, options: ["PLAINTIFF", "DEFENDANT"] },
          { id: "incidentDate", name: "incidentDate", label: "Incident Date", type: "date", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 26", "URCP Rule 34"],
        formatRequirements: { ...utahFormatDefaults, requiresBilingualNotice: false },
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate requests for production of documents following URCP Rule 34. Stay within tier limits. Focus on incident-related documents, insurance, medical records, and expert materials.",
        tags: ["discovery", "production", "documents"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-requests-admission",
        name: "Requests for Admission",
        description: "Requests for admission of facts and authenticity of documents (Tier 2: 10 requests)",
        category: "discovery",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

{{partyRole}}'S FIRST SET OF REQUESTS FOR ADMISSION

TO: {{opposingParty}}, and counsel of record:

Pursuant to Rule 36 of the Utah Rules of Civil Procedure, {{requestingParty}} requests that {{opposingParty}} admit the truth of the following matters within twenty-eight (28) days.

IMPORTANT NOTICE: Pursuant to URCP 36(a)(3), if you fail to respond within 28 days, each matter will be deemed admitted.

REQUESTS FOR ADMISSION

REQUEST FOR ADMISSION NO. 1:
Admit that on {{incidentDate}}, you were present at {{incidentLocation}}.

REQUEST FOR ADMISSION NO. 2:
Admit that the Incident occurred on {{incidentDate}} at approximately {{incidentTime}}.

REQUEST FOR ADMISSION NO. 3:
Admit that at the time of the Incident, you owed a duty of care to {{plaintiffName}}.

REQUEST FOR ADMISSION NO. 4:
Admit that {{factToAdmit1}}.

REQUEST FOR ADMISSION NO. 5:
Admit that {{factToAdmit2}}.

REQUEST FOR ADMISSION NO. 6:
Admit that the document attached hereto as Exhibit A is a true and accurate copy of {{documentDescription}}.

REQUEST FOR ADMISSION NO. 7:
Admit that you have not identified any witnesses who would contradict {{plaintiffName}}'s account of the Incident.

REQUEST FOR ADMISSION NO. 8:
Admit that {{plaintiffName}} was injured as a result of the Incident.

REQUEST FOR ADMISSION NO. 9:
Admit that you have insurance coverage that may apply to the claims in this lawsuit.

REQUEST FOR ADMISSION NO. 10:
Admit that you have no evidence that {{plaintiffName}} was comparatively at fault for the Incident.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for {{requestingParty}}

CERTIFICATE OF SERVICE

I certify that on {{serviceDate}}, I served these Requests by {{serviceMethod}}.

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "partyRole", name: "partyRole", label: "Requesting Party Role", type: "select", required: true, options: ["PLAINTIFF", "DEFENDANT"] },
          { id: "incidentDate", name: "incidentDate", label: "Incident Date", type: "date", required: true },
          { id: "incidentLocation", name: "incidentLocation", label: "Incident Location", type: "text", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 36"],
        formatRequirements: { ...utahFormatDefaults, requiresBilingualNotice: false },
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate requests for admission following URCP Rule 36. Stay within tier limits. Focus on key facts that may be undisputed and document authenticity. Include warning about deemed admitted if no response.",
        tags: ["discovery", "admission", "requests"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // ============ SETTLEMENT / RESOLUTION TEMPLATES ============
      {
        id: "tpl-demand-letter",
        name: "Demand Letter",
        description: "Pre-litigation demand letter for personal injury claims",
        category: "correspondence",
        jurisdiction: "utah-district-court",
        templateContent: `{{firmName}}
{{firmAddress}}
{{firmPhone}} | {{firmEmail}}

{{letterDate}}

VIA CERTIFIED MAIL - RETURN RECEIPT REQUESTED

{{recipientName}}
{{recipientTitle}}
{{insuranceCompany}}
{{recipientAddress}}

Re:    Claimant: {{claimantName}}
       Date of Loss: {{incidentDate}}
       Claim Number: {{claimNumber}}
       Insured: {{insuredName}}
       Policy Number: {{policyNumber}}

Dear {{recipientName}}:

Please be advised that this firm represents {{claimantName}} in connection with injuries sustained on {{incidentDate}} as a result of {{incidentDescription}}.

STATEMENT OF FACTS

{{factStatement}}

LIABILITY

{{liabilityStatement}}

INJURIES AND TREATMENT

As a result of this incident, our client sustained the following injuries:

{{injuryDescription}}

Our client received treatment from the following providers:

{{treatmentProviders}}

DAMAGES

Our client has incurred the following damages:

Medical Expenses:
{{medicalExpensesList}}
TOTAL MEDICAL EXPENSES: \${{totalMedical}}

Lost Wages: \${{lostWages}}

DEMAND

Based on the foregoing, we hereby demand the sum of \${{demandAmount}} in full settlement of all claims arising from this incident.

This demand will remain open for {{responseDeadline}} days from the date of this letter. If we do not receive a satisfactory response, we are prepared to pursue all available legal remedies on behalf of our client.

Please direct all future correspondence regarding this matter to our office.

Sincerely,

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
{{firmName}}

Enclosures: Medical records and bills`,
        requiredFields: [
          { id: "claimantName", name: "claimantName", label: "Claimant Name", type: "party", required: true },
          { id: "incidentDate", name: "incidentDate", label: "Date of Incident", type: "date", required: true },
          { id: "insuranceCompany", name: "insuranceCompany", label: "Insurance Company", type: "text", required: true },
          { id: "claimNumber", name: "claimNumber", label: "Claim Number", type: "text", required: true },
          { id: "insuredName", name: "insuredName", label: "Insured's Name", type: "party", required: true },
          { id: "incidentDescription", name: "incidentDescription", label: "Brief Incident Description", type: "textarea", required: true },
          { id: "injuryDescription", name: "injuryDescription", label: "Injury Description", type: "textarea", required: true },
          { id: "totalMedical", name: "totalMedical", label: "Total Medical Expenses", type: "text", required: true },
          { id: "demandAmount", name: "demandAmount", label: "Settlement Demand Amount", type: "text", required: true },
          { id: "responseDeadline", name: "responseDeadline", label: "Response Deadline (days)", type: "select", required: true, options: ["14", "21", "30", "45"] },
        ],
        optionalFields: [],
        utahRuleReferences: [],
        formatRequirements: { ...utahFormatDefaults, requiresCertificateOfService: false },
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a professional demand letter for personal injury claims. Include clear statement of facts, liability analysis, itemized damages, and specific demand amount with response deadline.",
        tags: ["demand", "settlement", "correspondence"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-motion-summary-judgment",
        name: "Motion for Summary Judgment",
        description: "Motion for summary judgment under URCP Rule 56",
        category: "motions",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

{{movingParty}}'S MOTION FOR SUMMARY JUDGMENT

{{movingPartyName}}, by and through counsel, respectfully moves this Court for summary judgment pursuant to Rule 56 of the Utah Rules of Civil Procedure.

INTRODUCTION

{{introductionStatement}}

STATEMENT OF UNDISPUTED MATERIAL FACTS

1. {{fact1}}

2. {{fact2}}

3. {{fact3}}

4. {{fact4}}

5. {{fact5}}

ARGUMENT

I. LEGAL STANDARD

Summary judgment is appropriate when "there is no genuine dispute as to any material fact and the movant is entitled to judgment as a matter of law." URCP 56(a).

II. {{movingPartyName}} IS ENTITLED TO SUMMARY JUDGMENT

{{legalArgument}}

CONCLUSION

For the foregoing reasons, {{movingPartyName}} respectfully requests that this Court grant summary judgment in {{movingPartyName}}'s favor.

DATED this {{day}} day of {{month}}, {{year}}.

_____________________________
{{attorneyName}}
Utah Bar No. {{barNumber}}
Attorney for {{movingPartyName}}

CERTIFICATE OF SERVICE

I certify that on {{serviceDate}}, I served a copy of this Motion and Memorandum upon counsel for all parties by {{serviceMethod}}.

_____________________________
{{attorneyName}}`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "movingParty", name: "movingParty", label: "Moving Party", type: "select", required: true, options: ["PLAINTIFF", "DEFENDANT"] },
          { id: "introductionStatement", name: "introductionStatement", label: "Introduction", type: "textarea", required: true },
          { id: "legalArgument", name: "legalArgument", label: "Legal Argument", type: "textarea", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 56", "URCP Rule 7"],
        formatRequirements: { ...utahFormatDefaults, pageLimit: 25, wordLimit: 7750 },
        bilingualNoticeRequired: true,
        aiPromptInstructions: "Generate a motion for summary judgment following URCP Rule 56 and Rule 7. Include statement of undisputed facts, legal standard, and detailed argument showing entitlement to judgment as a matter of law.",
        tags: ["motion", "summary-judgment", "dispositive"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "tpl-stipulated-dismissal",
        name: "Stipulated Motion to Dismiss with Prejudice",
        description: "Joint motion to dismiss case following settlement",
        category: "court-filings",
        jurisdiction: "utah-district-court",
        templateContent: `IN THE {{courtName}}
{{courtCounty}} COUNTY, STATE OF UTAH

{{plaintiffName}},
    Plaintiff,

vs.

{{defendantName}},
    Defendant.

Case No. {{caseNumber}}
Judge {{judgeName}}

STIPULATED MOTION TO DISMISS WITH PREJUDICE

The parties, by and through their respective counsel, hereby stipulate and move this Court to dismiss this action with prejudice pursuant to Rule 41(a)(2) of the Utah Rules of Civil Procedure.

STIPULATION

1. The parties have reached a full and final settlement of all claims in this action.

2. Each party shall bear its own costs and attorney's fees unless otherwise agreed.

3. All claims and counterclaims are hereby dismissed with prejudice.

4. This Court shall retain jurisdiction to enforce the terms of the parties' settlement agreement.

WHEREFORE, the parties respectfully request that this Court enter an Order dismissing this action with prejudice.

DATED this {{day}} day of {{month}}, {{year}}.

FOR PLAINTIFF:

_____________________________
{{plaintiffAttorney}}
Utah Bar No. {{plaintiffBarNumber}}
Attorney for Plaintiff

FOR DEFENDANT:

_____________________________
{{defendantAttorney}}
Utah Bar No. {{defendantBarNumber}}
Attorney for Defendant

ORDER

Based upon the foregoing Stipulated Motion, and good cause appearing:

IT IS HEREBY ORDERED that this action is DISMISSED WITH PREJUDICE. Each party shall bear its own costs and attorney's fees.

DATED this _____ day of _____________, ______.

_____________________________
District Court Judge`,
        requiredFields: [
          { id: "courtName", name: "courtName", label: "Court Name", type: "text", required: true },
          { id: "courtCounty", name: "courtCounty", label: "County", type: "select", required: true, options: ["Salt Lake", "Utah", "Davis", "Weber", "Washington"] },
          { id: "plaintiffName", name: "plaintiffName", label: "Plaintiff Name", type: "party", required: true },
          { id: "defendantName", name: "defendantName", label: "Defendant Name", type: "party", required: true },
          { id: "caseNumber", name: "caseNumber", label: "Case Number", type: "case-number", required: true },
          { id: "judgeName", name: "judgeName", label: "Judge Name", type: "text", required: true },
          { id: "plaintiffAttorney", name: "plaintiffAttorney", label: "Plaintiff's Attorney", type: "text", required: true },
          { id: "plaintiffBarNumber", name: "plaintiffBarNumber", label: "Plaintiff's Attorney Bar No.", type: "text", required: true },
          { id: "defendantAttorney", name: "defendantAttorney", label: "Defendant's Attorney", type: "text", required: true },
          { id: "defendantBarNumber", name: "defendantBarNumber", label: "Defendant's Attorney Bar No.", type: "text", required: true },
        ],
        optionalFields: [],
        utahRuleReferences: ["URCP Rule 41(a)(2)"],
        formatRequirements: utahFormatDefaults,
        bilingualNoticeRequired: false,
        aiPromptInstructions: "Generate a stipulated motion to dismiss with prejudice following settlement. Include signature blocks for both parties' counsel and a proposed order.",
        tags: ["dismissal", "settlement", "stipulation"],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    templates.forEach(t => this.documentTemplatesCache.set(t.id, t));
    this.documentTemplatesInitialized = true;
  }

  async getDocumentTemplates(category?: string): Promise<DocumentTemplate[]> {
    this.initializeDocumentTemplates();
    const templates = Array.from(this.documentTemplatesCache.values());
    if (category) {
      return templates.filter(t => t.category === category && t.isActive);
    }
    return templates.filter(t => t.isActive);
  }

  async getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined> {
    this.initializeDocumentTemplates();
    return this.documentTemplatesCache.get(id);
  }

  async createDocumentTemplate(data: InsertDocumentTemplate): Promise<DocumentTemplate> {
    this.initializeDocumentTemplates();
    const now = new Date().toISOString();
    const template: DocumentTemplate = {
      id: randomUUID(),
      name: data.name,
      description: data.description,
      category: data.category,
      jurisdiction: data.jurisdiction,
      templateContent: data.templateContent,
      requiredFields: data.requiredFields || [],
      optionalFields: data.optionalFields || [],
      utahRuleReferences: data.utahRuleReferences || [],
      formatRequirements: data.formatRequirements || {
        paperSize: "8.5x11",
        margins: { top: 1, right: 1, bottom: 1, left: 1 },
        fontSize: 12,
        fontFamily: "Times New Roman",
        lineSpacing: "double",
        requiresCaption: true,
        requiresCertificateOfService: true,
        requiresSignatureBlock: true,
        requiresBilingualNotice: true,
      },
      bilingualNoticeRequired: data.bilingualNoticeRequired ?? true,
      sampleDocument: data.sampleDocument,
      aiPromptInstructions: data.aiPromptInstructions || "",
      tags: data.tags || [],
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.documentTemplatesCache.set(template.id, template);
    return template;
  }

  async updateDocumentTemplate(id: string, data: Partial<DocumentTemplate>): Promise<DocumentTemplate | undefined> {
    this.initializeDocumentTemplates();
    const template = this.documentTemplatesCache.get(id);
    if (!template) return undefined;
    const updated = { ...template, ...data, updatedAt: new Date().toISOString() };
    this.documentTemplatesCache.set(id, updated);
    return updated;
  }

  async deleteDocumentTemplate(id: string): Promise<boolean> {
    this.initializeDocumentTemplates();
    return this.documentTemplatesCache.delete(id);
  }

  async getGeneratedDocuments(matterId?: string): Promise<GeneratedDocument[]> {
    const docs = Array.from(this.generatedDocumentsCache.values());
    if (matterId) return docs.filter(d => d.matterId === matterId);
    return docs;
  }

  async getGeneratedDocument(id: string): Promise<GeneratedDocument | undefined> {
    return this.generatedDocumentsCache.get(id);
  }

  async createGeneratedDocument(data: InsertGeneratedDocument): Promise<GeneratedDocument> {
    const now = new Date().toISOString();
    const doc: GeneratedDocument = {
      id: randomUUID(),
      templateId: data.templateId,
      matterId: data.matterId,
      title: data.title,
      documentType: data.documentType,
      jurisdiction: data.jurisdiction,
      status: "draft",
      content: data.content,
      fieldValues: data.fieldValues || {},
      aiGenerationPrompt: data.aiGenerationPrompt,
      aiGenerationResponse: data.aiGenerationResponse,
      formatCompliance: data.formatCompliance || { isCompliant: false, checks: [], utahRulesChecked: [] },
      version: 1,
      createdBy: data.createdBy,
      createdByName: data.createdByName,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };
    this.generatedDocumentsCache.set(doc.id, doc);
    return doc;
  }

  async updateGeneratedDocument(id: string, data: Partial<GeneratedDocument>): Promise<GeneratedDocument | undefined> {
    const doc = this.generatedDocumentsCache.get(id);
    if (!doc) return undefined;
    const updated = { ...doc, ...data, updatedAt: new Date().toISOString() };
    this.generatedDocumentsCache.set(id, updated);
    return updated;
  }

  async deleteGeneratedDocument(id: string): Promise<boolean> {
    return this.generatedDocumentsCache.delete(id);
  }

  async getDocumentApprovals(documentId?: string): Promise<DocumentApproval[]> {
    const approvals = Array.from(this.documentApprovalsCache.values());
    if (documentId) return approvals.filter(a => a.documentId === documentId);
    return approvals;
  }

  async getDocumentApproval(id: string): Promise<DocumentApproval | undefined> {
    return this.documentApprovalsCache.get(id);
  }

  async createDocumentApproval(data: InsertDocumentApproval): Promise<DocumentApproval> {
    const now = new Date().toISOString();
    const approval: DocumentApproval = {
      id: randomUUID(),
      documentId: data.documentId,
      status: "pending",
      assignedReviewerId: data.assignedReviewerId,
      assignedReviewerName: data.assignedReviewerName,
      createdAt: now,
      updatedAt: now,
    };
    this.documentApprovalsCache.set(approval.id, approval);
    return approval;
  }

  async updateDocumentApproval(id: string, data: UpdateDocumentApproval): Promise<DocumentApproval | undefined> {
    const approval = this.documentApprovalsCache.get(id);
    if (!approval) return undefined;
    const updated: DocumentApproval = {
      ...approval,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    if (data.status === "approved" && data.lawyerInitials) {
      updated.approvalStamp = new Date().toISOString();
    }
    this.documentApprovalsCache.set(id, updated);
    return updated;
  }

  async addDocumentApprovalAudit(data: Partial<DocumentApprovalAudit>): Promise<DocumentApprovalAudit> {
    const audit: DocumentApprovalAudit = {
      id: randomUUID(),
      documentId: data.documentId || "",
      approvalId: data.approvalId || "",
      action: data.action || "created",
      performedBy: data.performedBy || "",
      performedByName: data.performedByName || "",
      performedAt: new Date().toISOString(),
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      notes: data.notes,
      ipAddress: data.ipAddress,
      metadata: data.metadata,
    };
    this.documentApprovalAuditsCache.set(audit.id, audit);
    return audit;
  }

  async getDocumentApprovalAudit(documentId: string): Promise<DocumentApprovalAudit[]> {
    return Array.from(this.documentApprovalAuditsCache.values())
      .filter(a => a.documentId === documentId)
      .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  }

  async getClientForms(): Promise<ClientForm[]> {
    return Array.from(this.clientFormsCache.values()).filter(f => f.isActive);
  }

  async getClientForm(id: string): Promise<ClientForm | undefined> {
    return this.clientFormsCache.get(id);
  }

  async createClientForm(data: InsertClientForm): Promise<ClientForm> {
    const now = new Date().toISOString();
    const form: ClientForm = {
      id: randomUUID(),
      name: data.name,
      description: data.description,
      category: data.category,
      formFields: data.formFields || [],
      isPublic: data.isPublic ?? false,
      requiresSignature: data.requiresSignature ?? false,
      instructions: data.instructions || "",
      thankYouMessage: data.thankYouMessage || "Thank you for your submission.",
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.clientFormsCache.set(form.id, form);
    return form;
  }

  async updateClientForm(id: string, data: Partial<ClientForm>): Promise<ClientForm | undefined> {
    const form = this.clientFormsCache.get(id);
    if (!form) return undefined;
    const updated = { ...form, ...data, updatedAt: new Date().toISOString() };
    this.clientFormsCache.set(id, updated);
    return updated;
  }

  async deleteClientForm(id: string): Promise<boolean> {
    return this.clientFormsCache.delete(id);
  }

  async getClientFormSubmissions(formId?: string): Promise<ClientFormSubmission[]> {
    const submissions = Array.from(this.clientFormSubmissionsCache.values());
    if (formId) return submissions.filter(s => s.formId === formId);
    return submissions;
  }

  async getClientFormSubmission(id: string): Promise<ClientFormSubmission | undefined> {
    return this.clientFormSubmissionsCache.get(id);
  }

  async createClientFormSubmission(data: InsertClientFormSubmission): Promise<ClientFormSubmission> {
    const submission: ClientFormSubmission = {
      id: randomUUID(),
      formId: data.formId,
      matterId: data.matterId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      submittedData: data.submittedData,
      signature: data.signature,
      signedAt: data.signature ? new Date().toISOString() : undefined,
      submittedAt: new Date().toISOString(),
      reviewed: false,
    };
    this.clientFormSubmissionsCache.set(submission.id, submission);
    return submission;
  }

  async updateClientFormSubmission(id: string, data: Partial<ClientFormSubmission>): Promise<ClientFormSubmission | undefined> {
    const submission = this.clientFormSubmissionsCache.get(id);
    if (!submission) return undefined;
    const updated = { ...submission, ...data };
    this.clientFormSubmissionsCache.set(id, updated);
    return updated;
  }

  async getMeetings(): Promise<Meeting[]> {
    const rows = await db.select().from(tables.meetings).orderBy(desc(tables.meetings.createdAt));
    return rows as Meeting[];
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    const [row] = await db.select().from(tables.meetings).where(eq(tables.meetings.id, id));
    return row as Meeting | undefined;
  }

  async createMeeting(data: InsertMeeting): Promise<Meeting> {
    const [row] = await db.insert(tables.meetings).values({
      id: randomUUID(),
      title: data.title,
      matterId: data.matterId || null,
      date: data.date,
      duration: data.duration || 0,
      status: data.status || "recorded",
      participants: data.participants || [],
      summary: data.summary || "",
      mainPoints: data.mainPoints || [],
      topics: data.topics || [],
      transcript: data.transcript || [],
      actionItems: data.actionItems || [],
      tags: data.tags || [],
      createdBy: data.createdBy,
    }).returning();
    return row as Meeting;
  }

  async updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting | undefined> {
    const [row] = await db.update(tables.meetings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tables.meetings.id, id))
      .returning();
    return row as Meeting | undefined;
  }

  async deleteMeeting(id: string): Promise<boolean> {
    const result = await db.delete(tables.meetings).where(eq(tables.meetings.id, id));
    return true;
  }

  // ============ AUDIT LOGS ============
  async createAuditLog(data: InsertAuditLog): Promise<AuditLog> {
    try {
      const [row] = await db.insert(tables.auditLogs).values({
        id: randomUUID(),
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        action: data.action,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        method: data.method || null,
        path: data.path || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        statusCode: data.statusCode || null,
        metadata: data.metadata || {},
        severity: data.severity || "info",
      }).returning();
      return row as AuditLog;
    } catch (error) {
      console.error("Failed to create audit log:", error);
      return {
        id: randomUUID(),
        userId: data.userId || null,
        userEmail: data.userEmail || null,
        action: data.action,
        resourceType: data.resourceType || null,
        resourceId: data.resourceId || null,
        method: data.method || null,
        path: data.path || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        statusCode: data.statusCode || null,
        metadata: data.metadata || {},
        severity: data.severity || "info",
        createdAt: new Date(),
      };
    }
  }

  async getAuditLogs(options?: { userId?: string; action?: string; resourceType?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    const conditions = [];
    if (options?.userId) conditions.push(eq(tables.auditLogs.userId, options.userId));
    if (options?.action) conditions.push(eq(tables.auditLogs.action, options.action));
    if (options?.resourceType) conditions.push(eq(tables.auditLogs.resourceType, options.resourceType));

    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    let query = db.select().from(tables.auditLogs);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const rows = await (query as any).orderBy(desc(tables.auditLogs.createdAt)).limit(limit).offset(offset);
    return rows as AuditLog[];
  }

  async getAuditLogCount(options?: { userId?: string; action?: string; resourceType?: string }): Promise<number> {
    const conditions = [];
    if (options?.userId) conditions.push(eq(tables.auditLogs.userId, options.userId));
    if (options?.action) conditions.push(eq(tables.auditLogs.action, options.action));
    if (options?.resourceType) conditions.push(eq(tables.auditLogs.resourceType, options.resourceType));

    let query = db.select({ count: sql<number>`count(*)` }).from(tables.auditLogs);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const [result] = await query;
    return Number(result.count);
  }

  // ============ SECURITY EVENTS ============
  async createSecurityEvent(data: InsertSecurityEvent): Promise<SecurityEvent> {
    try {
      const [row] = await db.insert(tables.securityEvents).values({
        id: randomUUID(),
        eventType: data.eventType,
        userId: data.userId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        details: data.details || {},
        severity: data.severity || "warning",
      }).returning();
      return row as SecurityEvent;
    } catch (error) {
      console.error("Failed to create security event:", error);
      return {
        id: randomUUID(),
        eventType: data.eventType,
        userId: data.userId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        details: data.details || {},
        severity: data.severity || "warning",
        resolved: false,
        createdAt: new Date(),
      };
    }
  }

  async getSecurityEvents(options?: { eventType?: string; severity?: string; resolved?: boolean; limit?: number }): Promise<SecurityEvent[]> {
    const conditions = [];
    if (options?.eventType) conditions.push(eq(tables.securityEvents.eventType, options.eventType));
    if (options?.severity) conditions.push(eq(tables.securityEvents.severity, options.severity));
    if (options?.resolved !== undefined) conditions.push(eq(tables.securityEvents.resolved, options.resolved));

    let query = db.select().from(tables.securityEvents);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    const rows = await (query as any).orderBy(desc(tables.securityEvents.createdAt)).limit(options?.limit || 100);
    return rows as SecurityEvent[];
  }

  async resolveSecurityEvent(id: string): Promise<SecurityEvent | undefined> {
    const [row] = await db.update(tables.securityEvents)
      .set({ resolved: true })
      .where(eq(tables.securityEvents.id, id))
      .returning();
    return row as SecurityEvent | undefined;
  }
}
