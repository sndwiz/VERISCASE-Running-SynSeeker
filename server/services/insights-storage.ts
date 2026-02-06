import { db } from "../db";
import { eq, desc, asc, and, sql, lte, gte, inArray } from "drizzle-orm";
import * as tables from "@shared/models/tables";

export type MatterAsset = tables.MatterAssetRecord;
export type AssetText = tables.AssetTextRecord;
export type TextAnchor = tables.TextAnchorRecord;
export type TextChunk = tables.TextChunkRecord;
export type InsightRun = tables.InsightRunRecord;
export type InsightOutput = tables.InsightOutputRecord;

export interface ScanSummary {
  totalFiles: number;
  totalPages: number;
  totalDurationMs: number;
  dateRange: { oldest: string | null; newest: string | null };
  fileTypes: Record<string, number>;
  confidenceDistribution: { high: number; medium: number; low: number; unknown: number };
  problemFiles: Array<{
    assetId: string;
    filename: string;
    reason: string;
    confidence?: number;
  }>;
  statusCounts: Record<string, number>;
}

class InsightsStorage {
  async getMatterAssets(matterId: string): Promise<MatterAsset[]> {
    return db.select().from(tables.matterAssets)
      .where(eq(tables.matterAssets.matterId, matterId))
      .orderBy(desc(tables.matterAssets.createdAt));
  }

  async getMatterAsset(id: string): Promise<MatterAsset | undefined> {
    const [row] = await db.select().from(tables.matterAssets)
      .where(eq(tables.matterAssets.id, id));
    return row;
  }

  async createMatterAsset(data: tables.InsertMatterAssetRecord): Promise<MatterAsset> {
    const [row] = await db.insert(tables.matterAssets).values(data).returning();
    return row;
  }

  async updateMatterAsset(id: string, data: Partial<MatterAsset>): Promise<MatterAsset | undefined> {
    const [row] = await db.update(tables.matterAssets)
      .set(data)
      .where(eq(tables.matterAssets.id, id))
      .returning();
    return row;
  }

  async deleteMatterAsset(id: string): Promise<void> {
    await db.delete(tables.matterAssets).where(eq(tables.matterAssets.id, id));
  }

  async getAssetTextByAsset(assetId: string): Promise<AssetText | undefined> {
    const [row] = await db.select().from(tables.assetText)
      .where(eq(tables.assetText.assetId, assetId));
    return row;
  }

  async createAssetText(data: tables.InsertAssetTextRecord): Promise<AssetText> {
    const [row] = await db.insert(tables.assetText).values(data).returning();
    return row;
  }

  async getTextAnchors(assetTextId: string): Promise<TextAnchor[]> {
    return db.select().from(tables.textAnchors)
      .where(eq(tables.textAnchors.assetTextId, assetTextId));
  }

  async createTextAnchor(data: tables.InsertTextAnchorRecord): Promise<TextAnchor> {
    const [row] = await db.insert(tables.textAnchors).values(data).returning();
    return row;
  }

  async createTextAnchors(data: tables.InsertTextAnchorRecord[]): Promise<TextAnchor[]> {
    if (data.length === 0) return [];
    return db.insert(tables.textAnchors).values(data).returning();
  }

  async getTextChunks(matterId: string): Promise<TextChunk[]> {
    return db.select().from(tables.textChunks)
      .where(eq(tables.textChunks.matterId, matterId))
      .orderBy(asc(tables.textChunks.chunkIndex));
  }

  async getTextChunksByAsset(assetId: string): Promise<TextChunk[]> {
    return db.select().from(tables.textChunks)
      .where(eq(tables.textChunks.assetId, assetId))
      .orderBy(asc(tables.textChunks.chunkIndex));
  }

  async createTextChunks(data: tables.InsertTextChunkRecord[]): Promise<TextChunk[]> {
    if (data.length === 0) return [];
    return db.insert(tables.textChunks).values(data).returning();
  }

  async getInsightRuns(matterId: string): Promise<InsightRun[]> {
    return db.select().from(tables.insightRuns)
      .where(eq(tables.insightRuns.matterId, matterId))
      .orderBy(desc(tables.insightRuns.createdAt));
  }

  async getInsightRun(id: string): Promise<InsightRun | undefined> {
    const [row] = await db.select().from(tables.insightRuns)
      .where(eq(tables.insightRuns.id, id));
    return row;
  }

  async createInsightRun(data: tables.InsertInsightRunRecord): Promise<InsightRun> {
    const [row] = await db.insert(tables.insightRuns).values(data).returning();
    return row;
  }

  async updateInsightRun(id: string, data: Partial<InsightRun>): Promise<InsightRun | undefined> {
    const [row] = await db.update(tables.insightRuns)
      .set(data)
      .where(eq(tables.insightRuns.id, id))
      .returning();
    return row;
  }

  async getInsightOutputs(insightRunId: string): Promise<InsightOutput[]> {
    return db.select().from(tables.insightOutputs)
      .where(eq(tables.insightOutputs.insightRunId, insightRunId));
  }

  async createInsightOutput(data: tables.InsertInsightOutputRecord): Promise<InsightOutput> {
    const [row] = await db.insert(tables.insightOutputs).values(data).returning();
    return row;
  }

  async createInsightOutputs(data: tables.InsertInsightOutputRecord[]): Promise<InsightOutput[]> {
    if (data.length === 0) return [];
    return db.insert(tables.insightOutputs).values(data).returning();
  }

  async getScanSummary(matterId: string): Promise<ScanSummary> {
    const assets = await this.getMatterAssets(matterId);

    let totalPages = 0;
    let totalDurationMs = 0;
    const fileTypes: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    let oldest: Date | null = null;
    let newest: Date | null = null;
    const confidence = { high: 0, medium: 0, low: 0, unknown: 0 };
    const problemFiles: ScanSummary["problemFiles"] = [];

    for (const asset of assets) {
      totalPages += asset.pageCount || 0;
      totalDurationMs += asset.durationMs || 0;
      fileTypes[asset.fileType] = (fileTypes[asset.fileType] || 0) + 1;
      statusCounts[asset.status] = (statusCounts[asset.status] || 0) + 1;

      const d = asset.sourceDate || asset.createdAt;
      if (d) {
        if (!oldest || d < oldest) oldest = d;
        if (!newest || d > newest) newest = d;
      }
    }

    const readyAssetIds = assets.filter(a => a.status === "ready").map(a => a.id);
    if (readyAssetIds.length > 0) {
      const textRecords = await db.select().from(tables.assetText)
        .where(inArray(tables.assetText.assetId, readyAssetIds));

      for (const t of textRecords) {
        if (t.confidenceOverall == null) {
          confidence.unknown++;
        } else if (t.confidenceOverall >= 0.8) {
          confidence.high++;
        } else if (t.confidenceOverall >= 0.6) {
          confidence.medium++;
        } else {
          confidence.low++;
        }
      }

      for (const t of textRecords) {
        if (t.confidenceOverall != null && t.confidenceOverall < 0.6) {
          const asset = assets.find(a => a.id === t.assetId);
          if (asset) {
            problemFiles.push({
              assetId: asset.id,
              filename: asset.originalFilename,
              reason: "Low OCR confidence",
              confidence: t.confidenceOverall,
            });
          }
        }
        if (!t.fullText || t.fullText.trim().length < 10) {
          const asset = assets.find(a => a.id === t.assetId);
          if (asset && !problemFiles.some(p => p.assetId === asset.id)) {
            problemFiles.push({
              assetId: asset.id,
              filename: asset.originalFilename,
              reason: "Near-empty text extraction",
            });
          }
        }
      }
    }

    for (const asset of assets) {
      if (asset.status === "failed") {
        if (!problemFiles.some(p => p.assetId === asset.id)) {
          problemFiles.push({
            assetId: asset.id,
            filename: asset.originalFilename,
            reason: asset.errorMessage || "Processing failed",
          });
        }
      }
    }

    return {
      totalFiles: assets.length,
      totalPages,
      totalDurationMs,
      dateRange: {
        oldest: oldest?.toISOString() || null,
        newest: newest?.toISOString() || null,
      },
      fileTypes,
      confidenceDistribution: confidence,
      problemFiles,
      statusCounts,
    };
  }

  async getAssetTextsForMatter(matterId: string): Promise<Array<AssetText & { asset: MatterAsset }>> {
    const assets = await this.getMatterAssets(matterId);
    const readyAssets = assets.filter(a => a.status === "ready");
    if (readyAssets.length === 0) return [];

    const ids = readyAssets.map(a => a.id);
    const texts = await db.select().from(tables.assetText)
      .where(inArray(tables.assetText.assetId, ids));

    return texts.map(t => ({
      ...t,
      asset: readyAssets.find(a => a.id === t.assetId)!,
    }));
  }
}

export const insightsStorage = new InsightsStorage();
