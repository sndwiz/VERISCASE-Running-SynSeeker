import { generateCompletion } from "../ai/providers";
import { db } from "../db";
import { washJobs, washEntities, washMappings } from "@shared/models/tables";
import { eq, and } from "drizzle-orm";
import type { WashPolicy, WashEntityType, WashPiiReport } from "@shared/schema";

interface DetectedEntity {
  type: WashEntityType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  detectedBy: "regex" | "ai" | "hybrid";
}

const POLICY_FILTERS: Record<WashPolicy, Set<WashEntityType>> = {
  strict: new Set<WashEntityType>([
    "person", "email", "phone", "address", "ssn", "date",
    "case_number", "financial", "organization", "government_id", "medical", "other",
  ]),
  medium: new Set<WashEntityType>([
    "person", "email", "phone", "address", "ssn",
    "case_number", "government_id", "medical",
  ]),
  minimal: new Set<WashEntityType>([
    "person", "ssn", "government_id", "medical",
  ]),
};

const SURROGATE_NAMES = [
  "Michael Carter", "Sarah Mitchell", "James Anderson", "Maria Lopez",
  "David Chen", "Emily Parker", "Robert Kim", "Jennifer Wilson",
  "Thomas Brown", "Amanda Garcia", "Daniel Lee", "Lisa Robinson",
  "Christopher Hall", "Nicole Davis", "Andrew Martinez", "Rachel Taylor",
];

const SURROGATE_ORGS = [
  "Apex Industries LLC", "Summit Consulting Group", "Meridian Holdings",
  "Atlas Professional Services", "Pinnacle Development Corp", "Beacon Partners",
  "Catalyst Legal Group", "Horizon Management Inc", "Sterling Associates",
];

const SURROGATE_ADDRESSES = [
  "1200 Oak Street, Suite 300, Springfield, UT 84601",
  "456 Maple Avenue, Riverdale, UT 84604",
  "789 Pine Road, Lakewood, UT 84003",
  "2400 Cedar Boulevard, Hillcrest, UT 84606",
  "100 Elm Drive, Brookfield, UT 84057",
];

function detectRegexEntities(text: string): DetectedEntity[] {
  const entities: DetectedEntity[] = [];

  const patterns: Array<{ type: WashEntityType; regex: RegExp; confidence: number }> = [
    { type: "ssn", regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, confidence: 0.95 },
    { type: "email", regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b/g, confidence: 0.98 },
    { type: "phone", regex: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, confidence: 0.9 },
    { type: "case_number", regex: /\b(?:\d{4}[-\s]?(?:CR|CV|CIV|CRIM|FA|JV|PR|SC|INV)[-\s]?\d{3,7}|[A-Z]{2,5}[-\s]?\d{4}[-\s]?[A-Z]{2,4}[-\s]?\d{3,7})\b/gi, confidence: 0.85 },
    { type: "financial", regex: /\$[\d,]+(?:\.\d{2})?(?:\s*(?:million|billion|M|B|K))?\b/g, confidence: 0.85 },
    { type: "government_id", regex: /\b(?:DL|License|Passport|Badge)\s*#?\s*\d{4,12}\b/gi, confidence: 0.8 },
  ];

  for (const { type, regex, confidence } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      entities.push({
        type,
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence,
        detectedBy: "regex",
      });
    }
  }

  return entities;
}

async function detectAIEntities(text: string, policy: WashPolicy): Promise<DetectedEntity[]> {
  const truncatedText = text.length > 30000 ? text.slice(0, 30000) + "\n...[truncated]" : text;

  const prompt = `You are a PII (Personally Identifiable Information) detector for legal documents. Analyze the following text and identify ALL personally identifiable information.

For each entity found, return a JSON array of objects with these fields:
- "type": one of "person", "email", "phone", "address", "ssn", "date", "case_number", "financial", "organization", "government_id", "medical", "other"
- "value": the exact text as it appears in the document
- "confidence": a number between 0 and 1 indicating how confident you are this is PII

Policy level: ${policy}
${policy === "strict" ? "Detect ALL possible PII including names, organizations, dates, locations, and any identifying information." : ""}
${policy === "medium" ? "Focus on direct identifiers: names, contact info, IDs, case numbers. Skip generic dates and common organization names." : ""}
${policy === "minimal" ? "Only detect the most sensitive PII: full names, SSNs, government IDs, and medical information." : ""}

Important rules:
- Include ALL variations of a name (full name, last name only, possessives like "Smith's", initials like "J.S.")
- Include titles with names (Mr. Smith, Dr. Johnson, Judge Davis)
- For addresses, include the full address as one entity
- Be thorough - missing PII in a legal document is a serious compliance risk
- Only return the JSON array, no other text

Text to analyze:
${truncatedText}`;

  try {
    const content = await generateCompletion(
      [{ role: "user", content: prompt }],
      { model: "claude-sonnet-4-20250514", maxTokens: 4096, caller: "document_wash_pii" }
    );

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      type: WashEntityType;
      value: string;
      confidence: number;
    }>;

    const entities: DetectedEntity[] = [];
    for (const item of parsed) {
      const idx = text.indexOf(item.value);
      if (idx === -1) continue;

      let searchStart = 0;
      let foundIdx = text.indexOf(item.value, searchStart);
      while (foundIdx !== -1) {
        entities.push({
          type: item.type,
          value: item.value,
          startIndex: foundIdx,
          endIndex: foundIdx + item.value.length,
          confidence: item.confidence,
          detectedBy: "ai",
        });
        searchStart = foundIdx + 1;
        foundIdx = text.indexOf(item.value, searchStart);
      }
    }

    return entities;
  } catch (error) {
    console.error("AI entity detection failed:", error);
    return [];
  }
}

function mergeEntities(regexEntities: DetectedEntity[], aiEntities: DetectedEntity[]): DetectedEntity[] {
  const all = [...regexEntities, ...aiEntities];
  all.sort((a, b) => a.startIndex - b.startIndex || b.endIndex - a.endIndex);

  const merged: DetectedEntity[] = [];
  for (const entity of all) {
    const overlap = merged.find(
      (m) => entity.startIndex < m.endIndex && entity.endIndex > m.startIndex
    );

    if (overlap) {
      if (entity.confidence > overlap.confidence || entity.endIndex - entity.startIndex > overlap.endIndex - overlap.startIndex) {
        const idx = merged.indexOf(overlap);
        merged[idx] = { ...entity, detectedBy: "hybrid" };
      }
    } else {
      merged.push(entity);
    }
  }

  return merged.sort((a, b) => a.startIndex - b.startIndex);
}

async function getOrCreateMapping(
  matterId: string,
  entityType: WashEntityType,
  originalValue: string,
): Promise<string> {
  const existing = await db
    .select()
    .from(washMappings)
    .where(
      and(
        eq(washMappings.matterId, matterId),
        eq(washMappings.originalValue, originalValue),
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return existing[0].replacement;
  }

  const countResult = await db
    .select()
    .from(washMappings)
    .where(
      and(
        eq(washMappings.matterId, matterId),
        eq(washMappings.entityType, entityType),
      )
    );
  const count = countResult.length;

  const replacement = generateSurrogate(entityType, count);

  await db.insert(washMappings).values({
    matterId,
    entityType,
    originalValue,
    replacement,
  });

  return replacement;
}

function generateSurrogate(entityType: WashEntityType, index: number): string {
  switch (entityType) {
    case "person": return SURROGATE_NAMES[index % SURROGATE_NAMES.length];
    case "organization": return SURROGATE_ORGS[index % SURROGATE_ORGS.length];
    case "email": return `person${index + 1}@example.com`;
    case "phone": return `(801) 555-${String(1000 + index).slice(-4)}`;
    case "address": return SURROGATE_ADDRESSES[index % SURROGATE_ADDRESSES.length];
    case "ssn": return `XXX-XX-${String(1000 + index).slice(-4)}`;
    case "case_number": return `2026-XX-${String(10000 + index).slice(-5)}`;
    case "financial": return `$[AMOUNT_${index + 1}]`;
    case "government_id": return `[ID-${String(10000 + index).slice(-5)}]`;
    case "date": return `[DATE_${index + 1}]`;
    case "medical": return `[MEDICAL_INFO_${index + 1}]`;
    default: return `[REDACTED_${index + 1}]`;
  }
}

export async function runDocumentWash(jobId: string): Promise<void> {
  const [job] = await db.select().from(washJobs).where(eq(washJobs.id, jobId)).limit(1);
  if (!job) throw new Error("Wash job not found");

  await db.update(washJobs).set({ status: "processing", updatedAt: new Date() }).where(eq(washJobs.id, jobId));

  try {
    const regexEntities = detectRegexEntities(job.originalText);
    const aiEntities = await detectAIEntities(job.originalText, job.policy as WashPolicy);
    let entities = mergeEntities(regexEntities, aiEntities);

    const allowedTypes = POLICY_FILTERS[job.policy as WashPolicy];
    entities = entities.filter((e) => allowedTypes.has(e.type));

    const replacementMap = new Map<string, string>();
    const typeCounters = new Map<WashEntityType, number>();

    for (const entity of entities) {
      if (replacementMap.has(entity.value)) continue;

      if (job.matterId) {
        const replacement = await getOrCreateMapping(job.matterId, entity.type, entity.value);
        replacementMap.set(entity.value, replacement);
      } else {
        const count = typeCounters.get(entity.type) || 0;
        const replacement = generateSurrogate(entity.type, count);
        replacementMap.set(entity.value, replacement);
        typeCounters.set(entity.type, count + 1);
      }
    }

    let washedText = job.originalText;
    const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);
    for (const entity of sortedEntities) {
      const replacement = replacementMap.get(entity.value) || entity.value;
      washedText =
        washedText.slice(0, entity.startIndex) +
        replacement +
        washedText.slice(entity.endIndex);
    }

    const entitiesWithReplacements = entities.map((e) => ({
      ...e,
      replacement: replacementMap.get(e.value) || e.value,
    }));

    for (const entity of entitiesWithReplacements) {
      await db.insert(washEntities).values({
        jobId,
        entityType: entity.type,
        originalValue: entity.value,
        replacement: entity.replacement,
        startIndex: entity.startIndex,
        endIndex: entity.endIndex,
        confidence: entity.confidence,
        detectedBy: entity.detectedBy,
      });
    }

    const byType: Record<string, number> = {};
    const byDetector: Record<string, number> = {};
    let highRiskCount = 0;

    for (const e of entitiesWithReplacements) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      byDetector[e.detectedBy] = (byDetector[e.detectedBy] || 0) + 1;
      if (["ssn", "government_id", "medical", "financial"].includes(e.type)) {
        highRiskCount++;
      }
    }

    const piiReport: WashPiiReport = {
      totalEntities: entitiesWithReplacements.length,
      byType,
      byDetector,
      highRiskCount,
      entities: entitiesWithReplacements.map((e) => ({
        type: e.type,
        original: job.reversible ? e.value : "[irreversible]",
        replacement: e.replacement,
        confidence: e.confidence,
        detector: e.detectedBy,
      })),
    };

    await db
      .update(washJobs)
      .set({
        washedText,
        status: "completed",
        entityCount: entitiesWithReplacements.length,
        piiReport,
        updatedAt: new Date(),
      })
      .where(eq(washJobs.id, jobId));
  } catch (error) {
    console.error("Document wash failed:", error);
    await db
      .update(washJobs)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(washJobs.id, jobId));
    throw error;
  }
}
