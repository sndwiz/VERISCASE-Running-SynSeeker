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
}
