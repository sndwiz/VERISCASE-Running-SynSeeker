import { eq, desc, asc, and, sql } from "drizzle-orm";
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
      name: "Active Cases",
      description: "Track ongoing legal cases and matters",
      color: "#6366f1",
      icon: "layout-grid",
    });

    // Create sample groups
    const groupsData = [
      { title: "Discovery", color: "#3b82f6", order: 0 },
      { title: "In Progress", color: "#f59e0b", order: 1 },
      { title: "Under Review", color: "#8b5cf6", order: 2 },
      { title: "Completed", color: "#10b981", order: 3 },
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

    // Create sample tasks
    const sampleTasks = [
      { title: "Review contract for Smith Corp acquisition", status: "working-on-it" as const, priority: "high" as const, groupIdx: 1, progress: 60 },
      { title: "Prepare witness statements", status: "not-started" as const, priority: "medium" as const, groupIdx: 0, progress: 0 },
      { title: "File motion for summary judgment", status: "stuck" as const, priority: "critical" as const, groupIdx: 1, progress: 35 },
      { title: "Client meeting preparation - Johnson case", status: "pending-review" as const, priority: "high" as const, groupIdx: 2, progress: 85 },
      { title: "Research precedent cases for IP dispute", status: "working-on-it" as const, priority: "medium" as const, groupIdx: 0, progress: 45 },
      { title: "Draft settlement agreement", status: "done" as const, priority: "low" as const, groupIdx: 3, progress: 100 },
    ];

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

    // Create a second board
    const board2 = await this.createBoard({
      name: "Client Documents",
      description: "Document management and tracking",
      color: "#10b981",
      icon: "file-text",
    });

    const docGroup = await this.createGroup({
      title: "Pending Review",
      color: "#f59e0b",
      collapsed: false,
      boardId: board2.id,
      order: 0,
    });

    // Create sample clients
    const sampleClients = [
      { name: "Smith Corporation", email: "legal@smithcorp.com", notes: "" },
      { name: "Johnson Family Trust", email: "johnson.trust@email.com", notes: "" },
      { name: "Metro Development LLC", email: "contracts@metrodev.com", notes: "" },
    ];

    const clientIds: string[] = [];
    for (const c of sampleClients) {
      const client = await this.createClient(c);
      clientIds.push(client.id);
    }

    // Create sample matters
    const sampleMatters = [
      { name: "Smith Corp Acquisition Review", caseNumber: "2026-CORP-001", clientIdx: 0, matterType: "corporate", practiceArea: "corporate", description: "Review and due diligence for proposed acquisition" },
      { name: "Johnson Estate Planning", caseNumber: "2026-ESTATE-042", clientIdx: 1, matterType: "estate", practiceArea: "estate", description: "Comprehensive estate planning and trust administration" },
      { name: "Metro v. City Development Dispute", caseNumber: "2026-LIT-089", clientIdx: 2, matterType: "litigation", practiceArea: "litigation", description: "Commercial real estate development dispute litigation" },
    ];

    for (const m of sampleMatters) {
      await this.createMatter({
        name: m.name,
        caseNumber: m.caseNumber,
        clientId: clientIds[m.clientIdx],
        matterType: m.matterType,
        practiceArea: m.practiceArea,
        description: m.description,
        status: "active",
        openedDate: new Date().toISOString(),
      });
    }

    console.log("Sample data seeded successfully!");
  }

  // ============ BOARD METHODS ============
  async getBoards(): Promise<Board[]> {
    await this.ensureInitialized();
    const rows = await db.select().from(tables.boards).orderBy(asc(tables.boards.createdAt));
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || "",
      color: r.color || "#6366f1",
      icon: r.icon || "layout-grid",
      columns: (r.columns as ColumnDef[]) || [],
      createdAt: toISOString(r.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(r.updatedAt) || new Date().toISOString(),
    }));
  }

  async getBoard(id: string): Promise<Board | undefined> {
    const [row] = await db.select().from(tables.boards).where(eq(tables.boards.id, id));
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      description: row.description || "",
      color: row.color || "#6366f1",
      icon: row.icon || "layout-grid",
      columns: (row.columns as ColumnDef[]) || [],
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
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
      createdAt: now,
      updatedAt: now,
    }).returning();
    return {
      id: row.id,
      name: row.name,
      description: row.description || "",
      color: row.color || "#6366f1",
      icon: row.icon || "layout-grid",
      columns: (row.columns as ColumnDef[]) || [],
      createdAt: toISOString(row.createdAt) || now.toISOString(),
      updatedAt: toISOString(row.updatedAt) || now.toISOString(),
    };
  }

  async updateBoard(id: string, data: Partial<Board>): Promise<Board | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.columns) updateData.columns = data.columns as any;
    const [row] = await db.update(tables.boards).set(updateData).where(eq(tables.boards.id, id)).returning();
    if (!row) return undefined;
    return {
      id: row.id,
      name: row.name,
      description: row.description || "",
      color: row.color || "#6366f1",
      icon: row.icon || "layout-grid",
      columns: (row.columns as ColumnDef[]) || [],
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
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
}
