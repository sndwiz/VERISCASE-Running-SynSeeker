import { eq, and } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type {
  FileItem,
  InsertFileItem,
  DocProfile,
  InsertDocProfile,
  FilingTag,
  InsertFilingTag,
  FileItemWithProfile,
} from "@shared/schema";
import { randomUUID } from "crypto";

export class FilesStorage {

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

  async getFileItemsWithProfiles(matterId: string): Promise<FileItemWithProfile[]> {
    const rows = await db.select().from(tables.fileItems).where(eq(tables.fileItems.matterId, matterId));
    const fileItems = rows.map(r => this.rowToFileItem(r));
    const result: FileItemWithProfile[] = [];
    for (const file of fileItems) {
      const profile = await this.getDocProfile(file.id);
      const tags = await this.getFileItemTags(file.id);
      result.push({ ...file, profile, tags });
    }
    return result;
  }

  async getFileItemWithProfile(id: string): Promise<FileItemWithProfile | undefined> {
    const [row] = await db.select().from(tables.fileItems).where(eq(tables.fileItems.id, id));
    if (!row) return undefined;
    const file = this.rowToFileItem(row);
    const profile = await this.getDocProfile(file.id);
    const tags = await this.getFileItemTags(file.id);
    return { ...file, profile, tags };
  }

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
}
