import { eq } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type {
  EvidenceVaultFile,
  InsertEvidenceVaultFile,
  OCRJob,
  InsertOCRJob,
} from "@shared/schema";
import { randomUUID } from "crypto";

export class EvidenceStorage {

  private rowToEvidenceFile(r: any): EvidenceVaultFile {
    return {
      id: r.id,
      matterId: r.matterId,
      originalName: r.originalName,
      originalUrl: r.originalUrl || "",
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
      storageKey: r.storageKey || undefined,
      isArchived: r.isArchived || false,
      archivedAt: r.archivedAt ? (toISOString(r.archivedAt) ?? undefined) : undefined,
      archivedBy: r.archivedBy || undefined,
      ocrJobId: r.ocrJobId || undefined,
      extractedText: r.extractedText || undefined,
      aiAnalysis: r.aiAnalysis as any || undefined,
      metadata: (r.metadata as Record<string, any>) || {},
    };
  }

  async getEvidenceVaultFiles(matterId: string): Promise<EvidenceVaultFile[]> {
    const rows = await db.select().from(tables.evidenceVaultFiles).where(eq(tables.evidenceVaultFiles.matterId, matterId));
    return rows.map(r => this.rowToEvidenceFile(r));
  }

  async getEvidenceVaultFile(id: string): Promise<EvidenceVaultFile | undefined> {
    const [row] = await db.select().from(tables.evidenceVaultFiles).where(eq(tables.evidenceVaultFiles.id, id));
    if (!row) return undefined;
    return this.rowToEvidenceFile(row);
  }

  async createEvidenceVaultFile(data: InsertEvidenceVaultFile): Promise<EvidenceVaultFile> {
    const id = randomUUID();
    const now = new Date();
    const [row] = await db.insert(tables.evidenceVaultFiles).values({
      id,
      matterId: data.matterId,
      originalName: data.originalName,
      originalUrl: data.originalUrl || "",
      originalHash: data.originalHash,
      originalSize: data.originalSize,
      originalMimeType: data.originalMimeType,
      storageKey: data.storageKey || null,
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
    if (data.isArchived !== undefined) safeUpdate.isArchived = data.isArchived;
    if (data.archivedAt !== undefined) safeUpdate.archivedAt = new Date(data.archivedAt);
    if (data.archivedBy !== undefined) safeUpdate.archivedBy = data.archivedBy;
    
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
      completedAt: r.completedAt ? (toISOString(r.completedAt) ?? undefined) : undefined,
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
      completedAt: row.completedAt ? (toISOString(row.completedAt) ?? undefined) : undefined,
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
}
