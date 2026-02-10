import { eq, desc } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type {
  ApprovalRequest,
  InsertApprovalRequest,
  ApprovalComment,
  ApprovalInitial,
  InsertApprovalComment,
} from "@shared/schema";
import { randomUUID } from "crypto";

export class ApprovalsStorage {

  private mapApprovalRow(row: any): ApprovalRequest {
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
      type: (row.type || "general") as any,
      sourceData: (row.sourceData as Record<string, any>) || {},
      initials: (row.initials as ApprovalInitial[]) || [],
      revisionNotes: row.revisionNotes || "",
      comments: (row.comments as ApprovalComment[]) || [],
      createdAt: toISOString(row.createdAt) || new Date().toISOString(),
      updatedAt: toISOString(row.updatedAt) || new Date().toISOString(),
    };
  }

  async getApprovalRequests(matterId?: string): Promise<ApprovalRequest[]> {
    const rows = matterId
      ? await db.select().from(tables.approvalRequests).where(eq(tables.approvalRequests.matterId, matterId)).orderBy(desc(tables.approvalRequests.createdAt))
      : await db.select().from(tables.approvalRequests).orderBy(desc(tables.approvalRequests.createdAt));
    return rows.map(row => this.mapApprovalRow(row));
  }

  async getApprovalRequest(id: string): Promise<ApprovalRequest | undefined> {
    const [row] = await db.select().from(tables.approvalRequests).where(eq(tables.approvalRequests.id, id));
    if (!row) return undefined;
    return this.mapApprovalRow(row);
  }

  async createApprovalRequest(data: InsertApprovalRequest): Promise<ApprovalRequest> {
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
      type: data.type || "general",
      sourceData: data.sourceData || {},
      initials: [],
      revisionNotes: "",
      comments: [],
      createdAt: now,
      updatedAt: now,
    }).returning();
    return this.mapApprovalRow(row);
  }

  async updateApprovalRequest(id: string, data: Partial<ApprovalRequest>): Promise<ApprovalRequest | undefined> {
    const { createdAt, updatedAt, ...updateData } = data as any;
    const updateWithTime = { ...updateData, updatedAt: new Date() };
    const [row] = await db.update(tables.approvalRequests).set(updateWithTime).where(eq(tables.approvalRequests.id, id)).returning();
    if (!row) return undefined;
    return this.mapApprovalRow(row);
  }

  async deleteApprovalRequest(id: string): Promise<boolean> {
    await db.delete(tables.approvalRequests).where(eq(tables.approvalRequests.id, id));
    return true;
  }

  async addApprovalComment(data: InsertApprovalComment): Promise<ApprovalComment> {
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
      if (data.decision === "approved") newStatus = "approved";
      else if (data.decision === "needs-revision") newStatus = "needs-revision";
      else if (data.decision === "rejected") newStatus = "rejected";
      else if (data.decision === "vetting") newStatus = "vetting";
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

  async addApprovalInitial(id: string, initial: ApprovalInitial): Promise<ApprovalRequest | undefined> {
    const request = await this.getApprovalRequest(id);
    if (!request) return undefined;
    const updatedInitials = [...request.initials, initial];
    return this.updateApprovalRequest(id, { initials: updatedInitials } as any);
  }
}
