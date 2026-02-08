export interface ExtractedDate {
  value: string;
  type: "filed" | "served" | "hearing";
  confidence: number;
  source: "regex" | "ai" | "fallback";
  rawMatch: string;
}

export interface DateExtractionResult {
  filedDate: ExtractedDate | null;
  servedDate: ExtractedDate | null;
  hearingDate: ExtractedDate | null;
}

const MONTHS: Record<string, string> = {
  january: "01", jan: "01",
  february: "02", feb: "02",
  march: "03", mar: "03",
  april: "04", apr: "04",
  may: "05",
  june: "06", jun: "06",
  july: "07", jul: "07",
  august: "08", aug: "08",
  september: "09", sep: "09", sept: "09",
  october: "10", oct: "10",
  november: "11", nov: "11",
  december: "12", dec: "12",
};

function parseDate(raw: string): string | null {
  const cleaned = raw.trim().replace(/,/g, "");

  const isoMatch = cleaned.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  const usMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (usMatch) {
    let year = usMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${usMatch[1].padStart(2, "0")}-${usMatch[2].padStart(2, "0")}`;
  }

  const namedMatch = cleaned.match(/(\w+)\s+(\d{1,2})\s*,?\s*(\d{4})/i);
  if (namedMatch) {
    const monthNum = MONTHS[namedMatch[1].toLowerCase()];
    if (monthNum) {
      return `${namedMatch[3]}-${monthNum}-${namedMatch[2].padStart(2, "0")}`;
    }
  }

  const namedAlt = cleaned.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (namedAlt) {
    const monthNum = MONTHS[namedAlt[2].toLowerCase()];
    if (monthNum) {
      return `${namedAlt[3]}-${monthNum}-${namedAlt[1].padStart(2, "0")}`;
    }
  }

  return null;
}

const FILED_PATTERNS = [
  /(?:filed|filing\s+date|date\s+filed|stamped|entered)[:\s]+([^\n;]{6,30})/gi,
  /(?:dated|date)[:\s]+([^\n;]{6,30})/gi,
  /(?:file\s+stamp|court\s+stamp)[:\s]*([^\n;]{6,30})/gi,
];

const SERVED_PATTERNS = [
  /(?:served\s+on|date\s+of\s+service|service\s+date|served)[:\s]+([^\n;]{6,30})/gi,
  /(?:certificate\s+of\s+service)[\s\S]{0,100}?(?:on|dated?)[:\s]+([^\n;]{6,30})/gi,
  /(?:mailed|emailed|e-served|served\s+via)[:\s\w]*(?:on)[:\s]+([^\n;]{6,30})/gi,
];

const HEARING_PATTERNS = [
  /(?:hearing\s+(?:set\s+for|date|on|is\s+scheduled))[:\s]+([^\n;]{6,30})/gi,
  /(?:will\s+be\s+heard\s+on)[:\s]+([^\n;]{6,30})/gi,
  /(?:oral\s+argument|hearing|trial)[:\s]+(?:on\s+)?([^\n;]{6,30})/gi,
  /(?:scheduled\s+for)[:\s]+([^\n;]{6,30})/gi,
];

function extractFromPatterns(
  text: string,
  patterns: RegExp[],
  type: "filed" | "served" | "hearing"
): ExtractedDate | null {
  for (let i = 0; i < patterns.length; i++) {
    const pattern = new RegExp(patterns[i].source, patterns[i].flags);
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const rawDateStr = match[1];
      const parsed = parseDate(rawDateStr);
      if (parsed) {
        const year = parseInt(parsed.split("-")[0]);
        if (year >= 2000 && year <= 2035) {
          return {
            value: parsed,
            type,
            confidence: i === 0 ? 0.9 : 0.7,
            source: "regex",
            rawMatch: match[0].trim().substring(0, 80),
          };
        }
      }
    }
  }
  return null;
}

export function extractDatesFromText(text: string): DateExtractionResult {
  if (!text || text.length < 10) {
    return { filedDate: null, servedDate: null, hearingDate: null };
  }

  const filedDate = extractFromPatterns(text, FILED_PATTERNS, "filed");
  const servedDate = extractFromPatterns(text, SERVED_PATTERNS, "served");
  const hearingDate = extractFromPatterns(text, HEARING_PATTERNS, "hearing");

  return { filedDate, servedDate, hearingDate };
}

export function createFallbackDate(uploadDate?: Date): ExtractedDate {
  const d = uploadDate || new Date();
  return {
    value: d.toISOString().split("T")[0],
    type: "filed",
    confidence: 0.2,
    source: "fallback",
    rawMatch: "Upload date used as fallback",
  };
}
