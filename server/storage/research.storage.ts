import { eq } from "drizzle-orm";
import { db, toISOString } from "./base";
import * as tables from "@shared/models/tables";
import type { ResearchResult, InsertResearchResult } from "@shared/schema";
import { randomUUID } from "crypto";

export class ResearchStorage {

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
}
