import { eq, desc, asc, or, inArray, isNull } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type {
  Board,
  Group,
  Task,
  InsertBoard,
  InsertGroup,
  InsertTask,
  ColumnDef,
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

export class BoardsStorage {

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
}
