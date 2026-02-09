import type { TimeEntry, Flag, QualityIssue, SplitSuggestion, VerifierSettings, DailySummary } from "./billing-types";

export const UTBMS_CODES: Record<string, { phase: string; description: string }> = {
  "L100": { phase: "Case Assessment", description: "Case Assessment, Development, and Administration" },
  "L110": { phase: "Case Assessment", description: "Fact Investigation/Development" },
  "L120": { phase: "Case Assessment", description: "Analysis/Strategy" },
  "L130": { phase: "Case Assessment", description: "Experts/Consultants" },
  "L140": { phase: "Case Assessment", description: "Document/File Management" },
  "L150": { phase: "Case Assessment", description: "Budgeting" },
  "L160": { phase: "Case Assessment", description: "Settlement/Non-Binding ADR" },
  "L200": { phase: "Pre-Trial", description: "Pre-Trial Pleadings and Motions" },
  "L210": { phase: "Pre-Trial", description: "Pleadings" },
  "L220": { phase: "Pre-Trial", description: "Preliminary Injunctions/Provisional Remedies" },
  "L230": { phase: "Pre-Trial", description: "Court Mandated Conferences" },
  "L240": { phase: "Pre-Trial", description: "Dispositive Motions" },
  "L250": { phase: "Pre-Trial", description: "Other Motions" },
  "L300": { phase: "Discovery", description: "Discovery" },
  "L310": { phase: "Discovery", description: "Written Discovery" },
  "L320": { phase: "Discovery", description: "Document Production" },
  "L330": { phase: "Discovery", description: "Depositions" },
  "L340": { phase: "Discovery", description: "Expert Discovery" },
  "L400": { phase: "Trial", description: "Trial Preparation and Trial" },
  "L500": { phase: "Appeal", description: "Appeal" },
  "A101": { phase: "Activity", description: "Plan and Prepare For" },
  "A102": { phase: "Activity", description: "Research" },
  "A103": { phase: "Activity", description: "Draft/Revise" },
  "A104": { phase: "Activity", description: "Review/Analyze" },
  "A105": { phase: "Activity", description: "Communicate (In Firm)" },
  "A106": { phase: "Activity", description: "Communicate (With Client)" },
  "A107": { phase: "Activity", description: "Communicate (Other Outside Counsel)" },
  "A108": { phase: "Activity", description: "Communicate (Other External)" },
  "A109": { phase: "Activity", description: "Appear For/Attend" },
  "A110": { phase: "Activity", description: "Manage Data/Files" },
  "A111": { phase: "Activity", description: "Other" },
};

export const QUALITY_PATTERNS = {
  vague: [
    /^(review|reviewed|work on|worked on|attention to|various|misc|miscellaneous|general|multiple|several|various items)\b/i,
    /^(email|emails|correspondence|call|calls|telephone|phone|conference)\b$/i,
    /^(research|analysis|draft|review)\b$/i,
  ],
  abbreviation: [
    /\b(re:|re\b|attn|w\/|b\/c|b4|tel|conf|corresp|prep|mtg|def|plt|opp|disc)\b/i,
  ],
  clientNameLeak: (name: string, aliases: string[]) => {
    const all = [name, ...aliases].filter(Boolean);
    return all.map(n => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"));
  },
  privileged: [
    /\b(attorney[- ]client|privileged|work[- ]product|confidential communication)\b/i,
  ],
};

export const DEFAULT_SETTINGS: VerifierSettings = {
  hourlyRate: 350,
  longThreshold: 6,
  dayThreshold: 10,
  roundingIncrement: 0.1,
  roundingDirection: "up",
  minimumEntry: 0,
  travelTimeRate: 1,
  clientName: "",
  aliases: [],
  phones: [],
  keyParties: [],
  detectUtbms: true,
  checkQuality: true,
  suggestSplits: true,
  checkBlockBilling: true,
  checkDuplicates: true,
  checkWeekendHoliday: true,
  firmName: "Synergy Law PLLC",
  attorneyName: "",
  firmAddress: "",
  paymentTerms: "receipt",
  retainerBalance: 0,
  startDate: "",
  endDate: "",
};

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = "";
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(current.trim());
        if (row.some(c => c !== "")) rows.push(row);
        row = [];
        current = "";
      } else {
        current += ch;
      }
    }
  }
  row.push(current.trim());
  if (row.some(c => c !== "")) rows.push(row);
  return rows;
}

export function detectColumns(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const patterns: Record<string, RegExp[]> = {
    date: [/^date$/, /^entrydate$/, /^servicedate$/, /^workdate$/],
    attorney: [/^attorney$/, /^timekeeper$/, /^lawyer$/, /^billedby$/, /^name$/],
    description: [/^description$/, /^narrative$/, /^activity$/, /^details$/, /^memo$/],
    hours: [/^hours$/, /^quantity$/, /^time$/, /^duration$/, /^units$/],
    rate: [/^rate$/, /^hourlyrate$/, /^billingrate$/],
    amount: [/^amount$/, /^total$/, /^fee$/, /^billedamount$/],
    code: [/^code$/, /^utbms$/, /^taskcode$/, /^activitycode$/],
  };
  for (const [field, regexes] of Object.entries(patterns)) {
    for (const rx of regexes) {
      const idx = lowerHeaders.findIndex(h => rx.test(h));
      if (idx !== -1) { map[field] = idx; break; }
    }
  }
  return map;
}

export function roundHours(hours: number, increment: number, direction: string): number {
  if (increment <= 0) return hours;
  switch (direction) {
    case "up": return Math.ceil(hours / increment) * increment;
    case "down": return Math.floor(hours / increment) * increment;
    case "nearest": return Math.round(hours / increment) * increment;
    default: return hours;
  }
}

export function detectUTBMS(description: string): { code: string; phase: string; task: string } | null {
  const lower = description.toLowerCase();
  const patterns: [RegExp, string][] = [
    [/\bdeposition|deposed|depo\b/, "L330"],
    [/\bwritten discovery|interrogator|request for (production|admission)\b/, "L310"],
    [/\bdocument (review|production|collect)\b/, "L320"],
    [/\bmotion to dismiss|summary judgment|dispositive\b/, "L240"],
    [/\bpleading|complaint|answer|counterclaim\b/, "L210"],
    [/\binjunction|provisional|TRO|restraining\b/, "L220"],
    [/\bconference|hearing|status|scheduling\b/, "L230"],
    [/\bother motion|motion (for|to)\b/, "L250"],
    [/\btrial prep|trial|exhibit|jury|witness\b/, "L400"],
    [/\bappeal|appellate|brief\b/, "L500"],
    [/\bresearch|legal research|case law|statute\b/, "L120"],
    [/\bexpert|consultant\b/, "L130"],
    [/\bdocument management|file|organize|index\b/, "L140"],
    [/\bbudget|estimate|forecast\b/, "L150"],
    [/\bsettlement|mediat|negotiat|ADR\b/, "L160"],
    [/\binvestigat|fact|interview|witness\b/, "L110"],
    [/\bassess|evaluat|strateg|analys|review\b/, "L100"],
    [/\bcall|phone|conference|meet.*client|email.*client\b/, "A106"],
    [/\binternal|staff|team\b/, "A105"],
    [/\bfile|document|organize\b/, "A110"],
    [/\bdraft|revise|prepare|write\b/, "A103"],
    [/\breview|analyze|analysis\b/, "A104"],
    [/\bresearch|legal research|case law\b/, "A102"],
  ];
  for (const [rx, code] of patterns) {
    if (rx.test(lower) && UTBMS_CODES[code]) {
      if (code.startsWith("A")) {
        return { code, phase: UTBMS_CODES[code].phase, task: UTBMS_CODES[code].description };
      }
      return { code, phase: UTBMS_CODES[code].phase, task: UTBMS_CODES[code].description };
    }
  }
  return null;
}

export function craftClioNarrative(description: string, evidence: string, settings: VerifierSettings): string {
  const text = `${description} ${evidence}`.toLowerCase();
  const docMap: [RegExp, string][] = [
    [/injunction|civil stalking/, "Draft/revise civil stalking injunction"],
    [/notice of appearance/, "Prepare/file Notice of Appearance"],
    [/return of service|proof of service|service assistance/, "Coordinate service / prepare proof of service"],
    [/acceptance of service/, "Prepare/file Acceptance of Service"],
    [/attorney fees/, "Draft/revise motion re attorney fees"],
    [/extension of time/, "Draft/revise motion re extension of time"],
    [/meet\s*&\s*confer|meet and confer/, "Meet & confer re case issues"],
    [/research/, "Legal research"],
    [/review|analy/, "Review/analyze materials"],
    [/draft|revise|edit/, "Draft/revise documents"],
    [/email/, "Email correspondence"],
    [/call|phone|voicemail|telephone/, "Telephone conference / call"],
    [/deposition|depo/, "Deposition preparation/attendance"],
    [/hearing|court|appear/, "Court appearance/hearing"],
    [/motion/, "Prepare/file motion"],
    [/discovery|interrogat/, "Discovery work"],
  ];

  let task = "Case work (client matter)";
  for (const [pat, label] of docMap) {
    if (pat.test(text)) { task = label; break; }
  }

  let narrative = `${task}; ${settings.clientName || "Client"}`;
  if (evidence && evidence !== "nan" && evidence.trim()) {
    const truncated = evidence.replace(/\s+/g, " ").trim().substring(0, 80);
    narrative += ` (${truncated}${evidence.length > 80 ? "..." : ""})`;
  }
  return narrative;
}

export function computeDailySummary(entries: TimeEntry[], settings: VerifierSettings): DailySummary[] {
  const byDate: Record<string, DailySummary> = {};
  for (const e of entries) {
    if (!byDate[e.date]) {
      byDate[e.date] = { date: e.date, entries: 0, hours: 0, amount: 0, flagCount: 0, overThreshold: false };
    }
    byDate[e.date].entries++;
    byDate[e.date].hours += e.adjustedHours || e.hours;
    byDate[e.date].amount += e.adjustedAmount || e.amount;
    byDate[e.date].flagCount += e.flags.length;
  }
  return Object.values(byDate)
    .map(d => ({ ...d, overThreshold: d.hours > settings.dayThreshold }))
    .sort((a, b) => b.hours - a.hours);
}

export function checkQuality(description: string, settings: VerifierSettings): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const rx of QUALITY_PATTERNS.vague) {
    if (rx.test(description) && description.split(/\s+/).length < 5) {
      issues.push({ type: "missing_detail", message: "Description may be too vague", suggestion: "Add specific details about what was reviewed, drafted, or discussed" });
      break;
    }
  }
  for (const rx of QUALITY_PATTERNS.abbreviation) {
    if (rx.test(description)) {
      issues.push({ type: "abbreviation", message: "Contains common abbreviations", suggestion: "Spell out abbreviations for clarity" });
      break;
    }
  }
  if (settings.clientName) {
    const nameRxs = QUALITY_PATTERNS.clientNameLeak(settings.clientName, settings.aliases);
    for (const rx of nameRxs) {
      if (rx.test(description)) {
        issues.push({ type: "client_name", message: "Description may contain client name", suggestion: "Replace client name with 'client' or a generic reference" });
        break;
      }
    }
  }
  for (const rx of QUALITY_PATTERNS.privileged) {
    if (rx.test(description)) {
      issues.push({ type: "privileged_info", message: "May reveal privileged communications", suggestion: "Remove or rephrase references to attorney-client privilege" });
      break;
    }
  }
  if (/^[a-z]/.test(description)) {
    issues.push({ type: "capitalization", message: "Description starts with lowercase letter" });
  }
  return issues;
}

export function suggestSplit(entry: TimeEntry): SplitSuggestion | null {
  const desc = entry.description;
  const connectors = /\b(and|also|additionally|then|followed by|as well as|;)\b/gi;
  const parts = desc.split(connectors).filter(p => p.trim().length > 10 && !connectors.test(p));
  if (parts.length >= 2 && entry.hours >= 1.0) {
    const perPart = +(entry.hours / parts.length).toFixed(1);
    return {
      entries: parts.map(p => ({ description: p.trim(), hours: perPart })),
      reason: "Entry contains multiple distinct tasks that may be better tracked separately",
    };
  }
  return null;
}

export function filterByDateRange(entries: TimeEntry[], settings: VerifierSettings): TimeEntry[] {
  if (!settings.startDate && !settings.endDate) return entries;
  return entries.filter(e => {
    if (!e.date) return true;
    const entryDate = e.date.substring(0, 10);
    if (settings.startDate && entryDate < settings.startDate) return false;
    if (settings.endDate && entryDate > settings.endDate) return false;
    return true;
  });
}

export function runPipeline(rawEntries: TimeEntry[], settings: VerifierSettings): TimeEntry[] {
  const dayTotals: Record<string, number> = {};
  const descHashes: Map<string, string[]> = new Map();
  const filtered = filterByDateRange(rawEntries, settings);

  return filtered.map(entry => {
    const flags: Flag[] = [];
    const qualityIssues: QualityIssue[] = [];
    let utbmsCode: string | undefined;
    let utbmsPhase: string | undefined;
    let utbmsTask: string | undefined;
    let utbmsActivity: string | undefined;
    let splitSuggestion: SplitSuggestion | undefined;

    if (entry.hours > settings.longThreshold) {
      flags.push({ type: "long_entry", severity: "warning", message: `Entry exceeds ${settings.longThreshold}h threshold` });
    }

    const dayKey = `${entry.date}-${entry.attorney}`;
    dayTotals[dayKey] = (dayTotals[dayKey] || 0) + entry.hours;
    if (dayTotals[dayKey] > settings.dayThreshold) {
      flags.push({ type: "day_total", severity: "warning", message: `Day total (${dayTotals[dayKey].toFixed(1)}h) exceeds ${settings.dayThreshold}h` });
    }

    if (settings.minimumEntry > 0 && entry.hours < settings.minimumEntry) {
      flags.push({ type: "minimum_entry", severity: "info", message: `Below minimum entry threshold of ${settings.minimumEntry}h` });
    }

    const roundedHours = roundHours(entry.hours, settings.roundingIncrement, settings.roundingDirection);
    if (Math.abs(roundedHours - entry.hours) > 0.15) {
      flags.push({ type: "excessive_rounding", severity: "warning", message: `Rounding changes hours by ${Math.abs(roundedHours - entry.hours).toFixed(2)}h` });
    }

    if (settings.checkBlockBilling) {
      const words = entry.description.split(/\s+/);
      if (words.length < 4 && entry.hours >= 2) {
        flags.push({ type: "block_billing", severity: "warning", message: "Short description for substantial time - possible block billing" });
      }
    }

    if (settings.checkDuplicates) {
      const hash = `${entry.date}|${entry.attorney.toLowerCase()}|${entry.description.toLowerCase().substring(0, 50)}`;
      const existing = descHashes.get(hash);
      if (existing) {
        flags.push({ type: "duplicate", severity: "error", message: `Possible duplicate entry detected (matches ${existing[0]})` });
      } else {
        descHashes.set(hash, [entry.id]);
      }
    }

    if (settings.checkWeekendHoliday && entry.date) {
      try {
        const d = new Date(entry.date);
        if (d.getDay() === 0 || d.getDay() === 6) {
          flags.push({ type: "weekend", severity: "info", message: `Entry on ${d.getDay() === 0 ? "Sunday" : "Saturday"}` });
        }
      } catch {}
    }

    const vague = QUALITY_PATTERNS.vague.some(rx => rx.test(entry.description) && entry.description.split(/\s+/).length < 5);
    if (vague) {
      flags.push({ type: "vague", severity: "warning", message: "Description may be too vague for billing review" });
    }

    if (settings.checkQuality) {
      qualityIssues.push(...checkQuality(entry.description, settings));
    }

    if (settings.detectUtbms) {
      const detected = detectUTBMS(entry.description);
      if (detected) {
        utbmsCode = detected.code;
        utbmsPhase = detected.phase;
        if (detected.code.startsWith("A")) {
          utbmsActivity = detected.task;
        } else {
          utbmsTask = detected.task;
        }
      }
    }

    if (settings.suggestSplits) {
      const split = suggestSplit(entry);
      if (split) splitSuggestion = split;
    }

    let confidence: "high" | "medium" | "low" = "high";
    const errorCount = flags.filter(f => f.severity === "error").length;
    const warningCount = flags.filter(f => f.severity === "warning").length;
    if (errorCount > 0 || warningCount >= 3) confidence = "low";
    else if (warningCount > 0 || qualityIssues.length >= 2) confidence = "medium";

    const clioNarrative = craftClioNarrative(entry.description, "", settings);

    return {
      ...entry,
      flags,
      qualityIssues,
      confidence,
      utbmsCode,
      utbmsPhase,
      utbmsTask,
      utbmsActivity,
      roundedHours,
      splitSuggestion,
      adjustedHours: roundedHours,
      adjustedAmount: roundedHours * (entry.rate || settings.hourlyRate),
      clioNarrative,
      reviewStatus: "pending" as const,
      writeOff: false,
    };
  });
}
