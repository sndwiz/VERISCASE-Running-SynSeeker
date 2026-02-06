import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileText, Settings, BarChart3, Download, CheckCircle2,
  AlertTriangle, XCircle, Clock, DollarSign, Scale, Shield,
  FileSpreadsheet, Loader2, ChevronDown, ChevronRight, Eye,
  SplitSquareHorizontal, Tag, Hash, ArrowUpDown, Search,
  Filter, Trash2, Save, Plus, Users, Building, Phone, FileDown
} from "lucide-react";
import jsPDF from "jspdf";

interface TimeEntry {
  id: string;
  date: string;
  attorney: string;
  description: string;
  hours: number;
  rate: number;
  amount: number;
  utbmsCode?: string;
  utbmsPhase?: string;
  utbmsTask?: string;
  utbmsActivity?: string;
  confidence: "high" | "medium" | "low";
  flags: Flag[];
  qualityIssues: QualityIssue[];
  roundedHours?: number;
  splitSuggestion?: SplitSuggestion;
  approved?: boolean;
  adjustedHours?: number;
  adjustedAmount?: number;
}

interface Flag {
  type: "long_entry" | "day_total" | "block_billing" | "vague" | "duplicate" | "excessive_rounding" | "weekend" | "holiday" | "minimum_entry";
  severity: "error" | "warning" | "info";
  message: string;
}

interface QualityIssue {
  type: "abbreviation" | "capitalization" | "passive_voice" | "missing_detail" | "client_name" | "privileged_info";
  message: string;
  suggestion?: string;
}

interface SplitSuggestion {
  entries: { description: string; hours: number }[];
  reason: string;
}

interface VerifierSettings {
  hourlyRate: number;
  longThreshold: number;
  dayThreshold: number;
  roundingIncrement: number;
  roundingDirection: "up" | "down" | "nearest";
  minimumEntry: number;
  travelTimeRate: number;
  clientName: string;
  aliases: string[];
  phones: string[];
  keyParties: string[];
  detectUtbms: boolean;
  checkQuality: boolean;
  suggestSplits: boolean;
  checkBlockBilling: boolean;
  checkDuplicates: boolean;
  checkWeekendHoliday: boolean;
}

const UTBMS_CODES: Record<string, { phase: string; description: string }> = {
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
};

const QUALITY_PATTERNS = {
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

const DEFAULT_SETTINGS: VerifierSettings = {
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
};

function parseCSV(text: string): string[][] {
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

function detectColumns(headers: string[]): Record<string, number> {
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

function roundHours(hours: number, increment: number, direction: string): number {
  if (increment <= 0) return hours;
  switch (direction) {
    case "up": return Math.ceil(hours / increment) * increment;
    case "down": return Math.floor(hours / increment) * increment;
    case "nearest": return Math.round(hours / increment) * increment;
    default: return hours;
  }
}

function detectUTBMS(description: string): { code: string; phase: string; task: string } | null {
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
  ];
  for (const [rx, code] of patterns) {
    if (rx.test(lower) && UTBMS_CODES[code]) {
      return { code, phase: UTBMS_CODES[code].phase, task: UTBMS_CODES[code].description };
    }
  }
  return null;
}

function checkQuality(description: string, settings: VerifierSettings): QualityIssue[] {
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

function suggestSplit(entry: TimeEntry): SplitSuggestion | null {
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

function runPipeline(rawEntries: TimeEntry[], settings: VerifierSettings): TimeEntry[] {
  const dayTotals: Record<string, number> = {};
  const descHashes: Map<string, string[]> = new Map();

  return rawEntries.map(entry => {
    const flags: Flag[] = [];
    const qualityIssues: QualityIssue[] = [];
    let utbmsCode: string | undefined;
    let utbmsPhase: string | undefined;
    let utbmsTask: string | undefined;
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
        utbmsTask = detected.task;
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

    return {
      ...entry,
      flags,
      qualityIssues,
      confidence,
      utbmsCode,
      utbmsPhase,
      utbmsTask,
      roundedHours,
      splitSuggestion,
      adjustedHours: roundedHours,
      adjustedAmount: roundedHours * (entry.rate || settings.hourlyRate),
    };
  });
}

type TabKey = "upload" | "settings" | "results" | "review" | "export";

export default function BillingVerifierPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("upload");
  const [settings, setSettings] = useState<VerifierSettings>({ ...DEFAULT_SETTINGS });
  const [rawEntries, setRawEntries] = useState<TimeEntry[]>([]);
  const [processedEntries, setProcessedEntries] = useState<TimeEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterConfidence, setFilterConfidence] = useState<string>("all");
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitEntry, setSplitEntry] = useState<TimeEntry | null>(null);
  const [aliasInput, setAliasInput] = useState("");
  const [partyInput, setPartyInput] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const { data: profiles = [] } = useQuery<any[]>({ queryKey: ["/api/billing-verifier/profiles"] });

  const saveResultsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/billing-verifier/results", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/billing-verifier/results"] }); },
  });

  const saveProfileMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/billing-verifier/profiles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-verifier/profiles"] });
      toast({ title: "Profile saved" });
    },
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);

    try {
      const text = await file.text();
      setProgress(30);
      let entries: TimeEntry[] = [];

      if (file.name.endsWith(".csv") || file.name.endsWith(".tsv")) {
        const rows = parseCSV(text);
        if (rows.length < 2) throw new Error("File must have at least a header row and one data row");
        const colMap = detectColumns(rows[0]);
        setProgress(50);

        entries = rows.slice(1).map((row, i) => ({
          id: `entry-${i}`,
          date: row[colMap.date ?? 0] || "",
          attorney: row[colMap.attorney ?? 1] || "",
          description: row[colMap.description ?? 2] || "",
          hours: parseFloat(row[colMap.hours ?? 3]) || 0,
          rate: parseFloat(row[colMap.rate ?? 4]) || settings.hourlyRate,
          amount: parseFloat(row[colMap.amount ?? 5]) || 0,
          utbmsCode: row[colMap.code ?? -1] || undefined,
          confidence: "high" as const,
          flags: [],
          qualityIssues: [],
        }));
      } else if (file.name.endsWith(".json")) {
        const json = JSON.parse(text);
        const arr = Array.isArray(json) ? json : json.entries || json.data || json.timeEntries || [];
        entries = arr.map((item: any, i: number) => ({
          id: `entry-${i}`,
          date: item.date || item.entryDate || item.serviceDate || "",
          attorney: item.attorney || item.timekeeper || item.billedBy || "",
          description: item.description || item.narrative || item.activity || "",
          hours: parseFloat(item.hours || item.quantity || item.time) || 0,
          rate: parseFloat(item.rate || item.hourlyRate) || settings.hourlyRate,
          amount: parseFloat(item.amount || item.total) || 0,
          utbmsCode: item.code || item.utbmsCode || item.taskCode || undefined,
          confidence: "high" as const,
          flags: [],
          qualityIssues: [],
        }));
      } else {
        const lines = text.split("\n").filter(l => l.trim());
        entries = lines.map((line, i) => {
          const parts = line.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
          return {
            id: `entry-${i}`,
            date: parts[0]?.trim() || "",
            attorney: parts[1]?.trim() || "",
            description: parts[2]?.trim() || line.trim(),
            hours: parseFloat(parts[3]?.trim() || "0") || 0,
            rate: parseFloat(parts[4]?.trim() || String(settings.hourlyRate)) || settings.hourlyRate,
            amount: parseFloat(parts[5]?.trim() || "0") || 0,
            confidence: "high" as const,
            flags: [],
            qualityIssues: [],
          };
        });
      }

      entries = entries.filter(e => e.description && e.hours > 0);
      if (entries.length === 0) throw new Error("No valid time entries found in file");

      entries.forEach(e => {
        if (!e.amount) e.amount = e.hours * (e.rate || settings.hourlyRate);
      });

      setRawEntries(entries);
      setProgress(70);

      const processed = runPipeline(entries, settings);
      setProcessedEntries(processed);
      setProgress(100);
      setActiveTab("results");
      toast({ title: "File processed", description: `${processed.length} entries analyzed` });
    } catch (err: any) {
      toast({ title: "Error processing file", description: err.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  }, [settings, toast]);

  const handleManualEntry = useCallback(() => {
    const entry: TimeEntry = {
      id: `entry-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      attorney: settings.clientName ? "" : "",
      description: "",
      hours: 0,
      rate: settings.hourlyRate,
      amount: 0,
      confidence: "high",
      flags: [],
      qualityIssues: [],
    };
    setRawEntries(prev => [...prev, entry]);
    setSelectedEntry(entry);
  }, [settings]);

  const reRunPipeline = useCallback(() => {
    if (rawEntries.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setTimeout(() => {
      setProgress(50);
      const processed = runPipeline(rawEntries, settings);
      setProcessedEntries(processed);
      setProgress(100);
      setIsProcessing(false);
      toast({ title: "Pipeline re-run complete" });
    }, 300);
  }, [rawEntries, settings, toast]);

  const summary = useMemo(() => {
    if (!processedEntries.length) return null;
    const totalHours = processedEntries.reduce((s, e) => s + e.hours, 0);
    const totalAmount = processedEntries.reduce((s, e) => s + (e.adjustedAmount || e.amount), 0);
    const adjustedHours = processedEntries.reduce((s, e) => s + (e.adjustedHours || e.hours), 0);
    const flagged = processedEntries.filter(e => e.flags.length > 0).length;
    const qualityIssues = processedEntries.filter(e => e.qualityIssues.length > 0).length;
    const highConf = processedEntries.filter(e => e.confidence === "high").length;
    const medConf = processedEntries.filter(e => e.confidence === "medium").length;
    const lowConf = processedEntries.filter(e => e.confidence === "low").length;
    const approved = processedEntries.filter(e => e.approved).length;
    const utbmsCoverage = processedEntries.filter(e => e.utbmsCode).length;
    return {
      total: processedEntries.length, totalHours, totalAmount, adjustedHours,
      flagged, qualityIssues, highConf, medConf, lowConf, approved, utbmsCoverage,
      roundingDelta: Math.abs(adjustedHours - totalHours),
    };
  }, [processedEntries]);

  const filteredEntries = useMemo(() => {
    let result = [...processedEntries];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(e =>
        e.description.toLowerCase().includes(lower) ||
        e.attorney.toLowerCase().includes(lower) ||
        e.date.includes(lower)
      );
    }
    if (filterConfidence !== "all") {
      result = result.filter(e => e.confidence === filterConfidence);
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "date": cmp = a.date.localeCompare(b.date); break;
        case "hours": cmp = a.hours - b.hours; break;
        case "amount": cmp = (a.adjustedAmount || a.amount) - (b.adjustedAmount || b.amount); break;
        case "confidence": {
          const order = { high: 0, medium: 1, low: 2 };
          cmp = order[a.confidence] - order[b.confidence];
          break;
        }
        default: cmp = 0;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return result;
  }, [processedEntries, searchTerm, filterConfidence, sortField, sortDirection]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleApproval = (id: string) => {
    setProcessedEntries(prev =>
      prev.map(e => e.id === id ? { ...e, approved: !e.approved } : e)
    );
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const exportData = useCallback((format: "csv" | "json" | "pdf") => {
    const entries = processedEntries;
    const dateSuffix = new Date().toISOString().slice(0, 10);

    if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Billing Verification Report", 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
      doc.text(`Total Entries: ${summary?.total || 0}  |  Total Hours: ${summary?.totalHours?.toFixed(1) || "0"}  |  Total Amount: $${summary?.totalAmount?.toFixed(2) || "0"}`, 14, 35);
      doc.text(`Flagged: ${summary?.flagged || 0}  |  Approved: ${summary?.approved || 0}`, 14, 42);

      let y = 55;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Date", 14, y);
      doc.text("Attorney", 40, y);
      doc.text("Description", 75, y);
      doc.text("Hours", 150, y);
      doc.text("Amount", 168, y);
      doc.text("Conf.", 190, y);
      y += 5;
      doc.setFont("helvetica", "normal");

      entries.forEach(e => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(e.date.substring(0, 10), 14, y);
        doc.text(e.attorney.substring(0, 15), 40, y);
        doc.text(e.description.substring(0, 45), 75, y);
        doc.text((e.adjustedHours || e.hours).toFixed(1), 150, y);
        doc.text(`$${(e.adjustedAmount || e.amount).toFixed(2)}`, 168, y);
        doc.text(e.confidence, 190, y);
        y += 5;
        if (e.flags.length > 0) {
          doc.setTextColor(200, 100, 0);
          doc.text(`  Flags: ${e.flags.map(f => f.message).join("; ").substring(0, 80)}`, 14, y);
          doc.setTextColor(0, 0, 0);
          y += 4;
        }
      });

      doc.save(`billing-review-${dateSuffix}.pdf`);
      toast({ title: "Exported as PDF" });
      return;
    }

    let content: string;
    let mime: string;
    let ext: string;

    if (format === "csv") {
      const headers = ["Date", "Attorney", "Description", "Hours", "Rounded Hours", "Rate", "Amount", "Adjusted Amount", "UTBMS Code", "Phase", "Confidence", "Flags", "Quality Issues", "Approved"];
      const rows = entries.map(e => [
        e.date, e.attorney, `"${e.description.replace(/"/g, '""')}"`,
        e.hours, e.roundedHours || e.hours, e.rate, e.amount,
        e.adjustedAmount || e.amount, e.utbmsCode || "", e.utbmsPhase || "",
        e.confidence, e.flags.map(f => f.message).join("; "),
        e.qualityIssues.map(q => q.message).join("; "), e.approved ? "Yes" : "No",
      ]);
      content = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      mime = "text/csv";
      ext = "csv";
    } else {
      content = JSON.stringify({ entries, summary, settings, exportedAt: new Date().toISOString() }, null, 2);
      mime = "application/json";
      ext = "json";
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-review-${dateSuffix}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported as ${ext.toUpperCase()}` });
  }, [processedEntries, summary, settings, toast]);

  const handleSaveResults = useCallback(() => {
    if (!processedEntries.length) return;
    saveResultsMutation.mutate({
      totalEntries: processedEntries.length,
      totalHours: summary?.totalHours || 0,
      totalAmount: summary?.totalAmount || 0,
      flaggedCount: summary?.flagged || 0,
      qualityIssueCount: summary?.qualityIssues || 0,
      entriesData: processedEntries,
      settings,
    });
    toast({ title: "Results saved to server" });
  }, [processedEntries, summary, settings, saveResultsMutation, toast]);

  const confidenceIcon = (c: string) => {
    switch (c) {
      case "high": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "medium": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "low": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-auto" data-testid="billing-verifier-page">
      <div className="flex items-center justify-between gap-4 flex-wrap p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Billing Verifier</h1>
          <p className="text-sm text-muted-foreground">Time entry verification, UTBMS coding, quality checks, and export</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {processedEntries.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={reRunPipeline} data-testid="button-rerun-pipeline">
                <ArrowUpDown className="h-4 w-4 mr-1" /> Re-run
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveResults} data-testid="button-save-results">
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabKey)} className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="bg-transparent" data-testid="tabs-list">
            <TabsTrigger value="upload" data-testid="tab-upload"><Upload className="h-4 w-4 mr-1" /> Upload</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings"><Settings className="h-4 w-4 mr-1" /> Settings</TabsTrigger>
            <TabsTrigger value="results" data-testid="tab-results"><BarChart3 className="h-4 w-4 mr-1" /> Results</TabsTrigger>
            <TabsTrigger value="review" data-testid="tab-review"><Eye className="h-4 w-4 mr-1" /> Review</TabsTrigger>
            <TabsTrigger value="export" data-testid="tab-export"><Download className="h-4 w-4 mr-1" /> Export</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <TabsContent value="upload" className="mt-0">
            <UploadTab
              isProcessing={isProcessing}
              progress={progress}
              rawEntries={rawEntries}
              handleFileUpload={handleFileUpload}
              handleManualEntry={handleManualEntry}
            />
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            <SettingsTab
              settings={settings}
              setSettings={setSettings}
              aliasInput={aliasInput}
              setAliasInput={setAliasInput}
              partyInput={partyInput}
              setPartyInput={setPartyInput}
              profiles={profiles}
              saveProfileMutation={saveProfileMutation}
            />
          </TabsContent>

          <TabsContent value="results" className="mt-0">
            <ResultsTab
              summary={summary}
              filteredEntries={filteredEntries}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterConfidence={filterConfidence}
              setFilterConfidence={setFilterConfidence}
              expandedRows={expandedRows}
              toggleRow={toggleRow}
              toggleApproval={toggleApproval}
              handleSort={handleSort}
              sortField={sortField}
              sortDirection={sortDirection}
              confidenceIcon={confidenceIcon}
              setSplitEntry={setSplitEntry}
              setShowSplitDialog={setShowSplitDialog}
            />
          </TabsContent>

          <TabsContent value="review" className="mt-0">
            <ReviewTab
              processedEntries={processedEntries}
              summary={summary}
              settings={settings}
            />
          </TabsContent>

          <TabsContent value="export" className="mt-0">
            <ExportTab
              processedEntries={processedEntries}
              summary={summary}
              exportData={exportData}
            />
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
        <DialogContent data-testid="dialog-split">
          <DialogHeader>
            <DialogTitle>Split Suggestion</DialogTitle>
            <DialogDescription>This entry may contain multiple tasks that could be billed separately.</DialogDescription>
          </DialogHeader>
          {splitEntry?.splitSuggestion && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{splitEntry.splitSuggestion.reason}</p>
              <Separator />
              {splitEntry.splitSuggestion.entries.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/50">
                  <span className="text-sm flex-1">{s.description}</span>
                  <Badge variant="secondary">{s.hours}h</Badge>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSplitDialog(false)} data-testid="button-close-split">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UploadTab({ isProcessing, progress, rawEntries, handleFileUpload, handleManualEntry }: {
  isProcessing: boolean; progress: number; rawEntries: TimeEntry[];
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleManualEntry: () => void;
}) {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload Time Entries</CardTitle>
          <CardDescription>Upload CSV, JSON, or text files with time entry data for verification</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-md p-8 text-center hover-elevate transition-colors">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground mb-4">Drag and drop your billing file, or click to browse</p>
            <Input
              type="file"
              accept=".csv,.tsv,.json,.txt"
              onChange={handleFileUpload}
              className="max-w-xs mx-auto"
              disabled={isProcessing}
              data-testid="input-file-upload"
            />
            <p className="text-xs text-muted-foreground mt-2">Supports CSV, TSV, JSON, and plain text formats</p>
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Processing entries...</span>
              </div>
              <Progress value={progress} data-testid="progress-processing" />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm text-muted-foreground">
              {rawEntries.length > 0 ? `${rawEntries.length} entries loaded` : "No entries loaded yet"}
            </div>
            <Button variant="outline" size="sm" onClick={handleManualEntry} data-testid="button-manual-entry">
              <Plus className="h-4 w-4 mr-1" /> Manual Entry
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expected File Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>CSV files should have columns for:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {["Date", "Attorney/Timekeeper", "Description/Narrative", "Hours/Quantity", "Rate (optional)", "Amount (optional)"].map(col => (
                <Badge key={col} variant="outline">{col}</Badge>
              ))}
            </div>
            <p className="mt-2">Column headers are auto-detected. Standard LEDES, Clio, and generic CSV formats are supported.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab({ settings, setSettings, aliasInput, setAliasInput, partyInput, setPartyInput, profiles, saveProfileMutation }: {
  settings: VerifierSettings; setSettings: (s: VerifierSettings) => void;
  aliasInput: string; setAliasInput: (v: string) => void;
  partyInput: string; setPartyInput: (v: string) => void;
  profiles: any[]; saveProfileMutation: any;
}) {
  const addAlias = () => {
    if (aliasInput.trim()) {
      setSettings({ ...settings, aliases: [...settings.aliases, aliasInput.trim()] });
      setAliasInput("");
    }
  };
  const addParty = () => {
    if (partyInput.trim()) {
      setSettings({ ...settings, keyParties: [...settings.keyParties, partyInput.trim()] });
      setPartyInput("");
    }
  };
  const handleSaveProfile = () => {
    saveProfileMutation.mutate({
      clientName: settings.clientName || "Default Profile",
      hourlyRate: settings.hourlyRate,
      longThreshold: settings.longThreshold,
      dayThreshold: settings.dayThreshold,
      roundingIncrement: settings.roundingIncrement,
      roundingDirection: settings.roundingDirection,
      minimumEntry: settings.minimumEntry,
      travelTimeRate: settings.travelTimeRate,
      aliases: settings.aliases,
      keyParties: settings.keyParties,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input id="clientName" value={settings.clientName} onChange={e => setSettings({ ...settings, clientName: e.target.value })} placeholder="e.g., Acme Corp" data-testid="input-client-name" />
            </div>
            <div className="space-y-2">
              <Label>Client Aliases (for name detection)</Label>
              <div className="flex gap-2">
                <Input value={aliasInput} onChange={e => setAliasInput(e.target.value)} placeholder="Add alias" onKeyDown={e => e.key === "Enter" && addAlias()} data-testid="input-alias" />
                <Button variant="outline" size="sm" onClick={addAlias} data-testid="button-add-alias"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {settings.aliases.map((a, i) => (
                  <Badge key={i} variant="secondary">
                    {a}
                    <button className="ml-1 text-xs" onClick={() => setSettings({ ...settings, aliases: settings.aliases.filter((_, j) => j !== i) })}>&times;</button>
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Key Parties</Label>
              <div className="flex gap-2">
                <Input value={partyInput} onChange={e => setPartyInput(e.target.value)} placeholder="Add party" onKeyDown={e => e.key === "Enter" && addParty()} data-testid="input-party" />
                <Button variant="outline" size="sm" onClick={addParty} data-testid="button-add-party"><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {settings.keyParties.map((p, i) => (
                  <Badge key={i} variant="secondary">
                    {p}
                    <button className="ml-1 text-xs" onClick={() => setSettings({ ...settings, keyParties: settings.keyParties.filter((_, j) => j !== i) })}>&times;</button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Rate and Thresholds</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input id="hourlyRate" type="number" value={settings.hourlyRate} onChange={e => setSettings({ ...settings, hourlyRate: +e.target.value })} data-testid="input-hourly-rate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minimumEntry">Minimum Entry (h)</Label>
                <Input id="minimumEntry" type="number" step="0.1" value={settings.minimumEntry} onChange={e => setSettings({ ...settings, minimumEntry: +e.target.value })} data-testid="input-minimum-entry" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longThreshold">Long Entry Threshold (h)</Label>
                <Input id="longThreshold" type="number" step="0.5" value={settings.longThreshold} onChange={e => setSettings({ ...settings, longThreshold: +e.target.value })} data-testid="input-long-threshold" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dayThreshold">Day Total Threshold (h)</Label>
                <Input id="dayThreshold" type="number" step="0.5" value={settings.dayThreshold} onChange={e => setSettings({ ...settings, dayThreshold: +e.target.value })} data-testid="input-day-threshold" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Rounding Rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="roundingIncrement">Increment (h)</Label>
                <Input id="roundingIncrement" type="number" step="0.01" value={settings.roundingIncrement} onChange={e => setSettings({ ...settings, roundingIncrement: +e.target.value })} data-testid="input-rounding-increment" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roundingDirection">Direction</Label>
                <Select value={settings.roundingDirection} onValueChange={v => setSettings({ ...settings, roundingDirection: v as "up" | "down" | "nearest" })}>
                  <SelectTrigger data-testid="select-rounding-direction"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="up">Round Up</SelectItem>
                    <SelectItem value="down">Round Down</SelectItem>
                    <SelectItem value="nearest">Nearest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="travelRate">Travel Time Rate (multiplier)</Label>
              <Input id="travelRate" type="number" step="0.1" min="0" max="1" value={settings.travelTimeRate} onChange={e => setSettings({ ...settings, travelTimeRate: +e.target.value })} data-testid="input-travel-rate" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Verification Checks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "detectUtbms" as const, label: "UTBMS Code Detection", desc: "Auto-detect UTBMS task codes from descriptions" },
              { key: "checkQuality" as const, label: "Quality Checks", desc: "Check for vague descriptions, abbreviations, etc." },
              { key: "suggestSplits" as const, label: "Split Suggestions", desc: "Suggest splitting multi-task entries" },
              { key: "checkBlockBilling" as const, label: "Block Billing Detection", desc: "Flag entries with short descriptions and high hours" },
              { key: "checkDuplicates" as const, label: "Duplicate Detection", desc: "Identify potential duplicate entries" },
              { key: "checkWeekendHoliday" as const, label: "Weekend/Holiday Flags", desc: "Flag entries on weekends or holidays" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch checked={settings[key]} onCheckedChange={v => setSettings({ ...settings, [key]: v })} data-testid={`switch-${key}`} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        {profiles.length > 0 && (
          <Select onValueChange={id => {
            const p = profiles.find((pr: any) => pr.id === id);
            if (p) {
              setSettings({
                ...settings,
                clientName: p.clientName || "",
                hourlyRate: p.hourlyRate || 350,
                longThreshold: p.longThreshold || 6,
                dayThreshold: p.dayThreshold || 10,
                roundingIncrement: p.roundingIncrement || 0.1,
                roundingDirection: p.roundingDirection || "up",
                minimumEntry: p.minimumEntry || 0,
                travelTimeRate: p.travelTimeRate || 1,
                aliases: p.aliases || [],
                keyParties: p.keyParties || [],
              });
            }
          }}>
            <SelectTrigger className="w-60" data-testid="select-load-profile"><SelectValue placeholder="Load saved profile..." /></SelectTrigger>
            <SelectContent>
              {profiles.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.clientName || "Unnamed"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button onClick={handleSaveProfile} data-testid="button-save-profile">
          <Save className="h-4 w-4 mr-1" /> Save as Profile
        </Button>
      </div>
    </div>
  );
}

function ResultsTab({ summary, filteredEntries, searchTerm, setSearchTerm, filterConfidence, setFilterConfidence, expandedRows, toggleRow, toggleApproval, handleSort, sortField, sortDirection, confidenceIcon, setSplitEntry, setShowSplitDialog }: any) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <BarChart3 className="h-12 w-12 mb-4" />
        <p>No results yet. Upload a file to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-total-entries">{summary.total}</p>
            <p className="text-xs text-muted-foreground">Total Entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-total-hours">{summary.totalHours.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Total Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-total-amount">${summary.totalAmount.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Total Amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-500" data-testid="text-flagged">{summary.flagged}</p>
            <p className="text-xs text-muted-foreground">Flagged</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold" data-testid="text-utbms">{summary.utbmsCoverage}</p>
            <p className="text-xs text-muted-foreground">UTBMS Coded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500" data-testid="text-approved">{summary.approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search entries..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-entries"
          />
        </div>
        <Select value={filterConfidence} onValueChange={setFilterConfidence}>
          <SelectTrigger className="w-40" data-testid="select-filter-confidence">
            <Filter className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Confidence</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-3 w-8"></th>
                  <th className="p-3 text-left cursor-pointer" onClick={() => handleSort("date")} data-testid="header-date">
                    <span className="flex items-center gap-1">Date <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="p-3 text-left">Attorney</th>
                  <th className="p-3 text-left">Description</th>
                  <th className="p-3 text-right cursor-pointer" onClick={() => handleSort("hours")} data-testid="header-hours">
                    <span className="flex items-center justify-end gap-1">Hours <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="p-3 text-right cursor-pointer" onClick={() => handleSort("amount")} data-testid="header-amount">
                    <span className="flex items-center justify-end gap-1">Amount <ArrowUpDown className="h-3 w-3" /></span>
                  </th>
                  <th className="p-3 text-center">UTBMS</th>
                  <th className="p-3 text-center cursor-pointer" onClick={() => handleSort("confidence")} data-testid="header-confidence">Conf.</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry: TimeEntry) => {
                  const isExpanded = expandedRows.has(entry.id);
                  return (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      isExpanded={isExpanded}
                      toggleRow={toggleRow}
                      toggleApproval={toggleApproval}
                      confidenceIcon={confidenceIcon}
                      setSplitEntry={setSplitEntry}
                      setShowSplitDialog={setShowSplitDialog}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredEntries.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">No entries match your filters</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EntryRow({ entry, isExpanded, toggleRow, toggleApproval, confidenceIcon, setSplitEntry, setShowSplitDialog }: any) {
  return (
    <>
      <tr className={`border-b hover-elevate ${entry.approved ? "bg-green-500/5" : ""}`} data-testid={`row-entry-${entry.id}`}>
        <td className="p-3">
          <button onClick={() => toggleRow(entry.id)} data-testid={`button-expand-${entry.id}`}>
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </td>
        <td className="p-3 whitespace-nowrap">{entry.date}</td>
        <td className="p-3 whitespace-nowrap">{entry.attorney}</td>
        <td className="p-3 max-w-xs truncate">{entry.description}</td>
        <td className="p-3 text-right whitespace-nowrap">
          {entry.roundedHours !== entry.hours ? (
            <span>
              <span className="line-through text-muted-foreground mr-1">{entry.hours}</span>
              {entry.roundedHours?.toFixed(1)}
            </span>
          ) : (
            entry.hours.toFixed(1)
          )}
        </td>
        <td className="p-3 text-right whitespace-nowrap">${(entry.adjustedAmount || entry.amount).toFixed(2)}</td>
        <td className="p-3 text-center">
          {entry.utbmsCode ? <Badge variant="outline" className="text-xs">{entry.utbmsCode}</Badge> : <span className="text-muted-foreground">-</span>}
        </td>
        <td className="p-3 text-center">{confidenceIcon(entry.confidence)}</td>
        <td className="p-3 text-center">
          <Button
            variant={entry.approved ? "default" : "outline"}
            size="sm"
            onClick={() => toggleApproval(entry.id)}
            data-testid={`button-approve-${entry.id}`}
          >
            {entry.approved ? <CheckCircle2 className="h-4 w-4" /> : "Approve"}
          </Button>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/20">
          <td colSpan={9} className="p-4">
            <div className="space-y-3">
              <p className="text-sm"><strong>Full Description:</strong> {entry.description}</p>
              {entry.flags.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Flags:</p>
                  <div className="flex flex-wrap gap-2">
                    {entry.flags.map((f: Flag, i: number) => (
                      <Badge key={i} variant={f.severity === "error" ? "destructive" : f.severity === "warning" ? "outline" : "secondary"}>
                        {f.severity === "error" ? <XCircle className="h-3 w-3 mr-1" /> : f.severity === "warning" ? <AlertTriangle className="h-3 w-3 mr-1" /> : null}
                        {f.message}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {entry.qualityIssues.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Quality Issues:</p>
                  <div className="space-y-1">
                    {entry.qualityIssues.map((q: QualityIssue, i: number) => (
                      <div key={i} className="text-sm">
                        <span className="text-muted-foreground">{q.message}</span>
                        {q.suggestion && <span className="text-xs ml-2 text-blue-500">{q.suggestion}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {entry.utbmsCode && (
                <div className="text-sm">
                  <strong>UTBMS:</strong> {entry.utbmsCode} - {entry.utbmsPhase} / {entry.utbmsTask}
                </div>
              )}
              {entry.splitSuggestion && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSplitEntry(entry); setShowSplitDialog(true); }}
                  data-testid={`button-split-${entry.id}`}
                >
                  <SplitSquareHorizontal className="h-4 w-4 mr-1" /> View Split Suggestion
                </Button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ReviewTab({ processedEntries, summary, settings }: { processedEntries: TimeEntry[]; summary: any; settings: VerifierSettings }) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Eye className="h-12 w-12 mb-4" />
        <p>Process entries first to see the review summary.</p>
      </div>
    );
  }

  const flagBreakdown = processedEntries.reduce((acc, e) => {
    e.flags.forEach(f => { acc[f.type] = (acc[f.type] || 0) + 1; });
    return acc;
  }, {} as Record<string, number>);

  const phaseBreakdown = processedEntries.reduce((acc, e) => {
    const phase = e.utbmsPhase || "Uncategorized";
    acc[phase] = (acc[phase] || 0) + e.hours;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Confidence Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-28">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">High</span>
              </div>
              <div className="flex-1">
                <Progress value={summary.total ? (summary.highConf / summary.total) * 100 : 0} className="h-3" />
              </div>
              <span className="text-sm w-16 text-right">{summary.highConf} ({summary.total ? Math.round((summary.highConf / summary.total) * 100) : 0}%)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-28">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Medium</span>
              </div>
              <div className="flex-1">
                <Progress value={summary.total ? (summary.medConf / summary.total) * 100 : 0} className="h-3" />
              </div>
              <span className="text-sm w-16 text-right">{summary.medConf} ({summary.total ? Math.round((summary.medConf / summary.total) * 100) : 0}%)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-28">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Low</span>
              </div>
              <div className="flex-1">
                <Progress value={summary.total ? (summary.lowConf / summary.total) * 100 : 0} className="h-3" />
              </div>
              <span className="text-sm w-16 text-right">{summary.lowConf} ({summary.total ? Math.round((summary.lowConf / summary.total) * 100) : 0}%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flag Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(flagBreakdown).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(flagBreakdown).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between gap-4">
                    <span className="text-sm capitalize">{type.replace(/_/g, " ")}</span>
                    <Badge variant="outline">{count as number}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No flags detected</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">UTBMS Phase Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(phaseBreakdown).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([phase, hours]) => (
                <div key={phase} className="flex items-center justify-between gap-4">
                  <span className="text-sm">{phase}</span>
                  <Badge variant="outline">{(hours as number).toFixed(1)}h</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rounding Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{summary.totalHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Original Hours</p>
            </div>
            <div>
              <p className="text-lg font-bold">{summary.adjustedHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Adjusted Hours</p>
            </div>
            <div>
              <p className="text-lg font-bold">{summary.roundingDelta.toFixed(2)}h</p>
              <p className="text-xs text-muted-foreground">Rounding Delta</p>
            </div>
            <div>
              <p className="text-lg font-bold">${(summary.roundingDelta * settings.hourlyRate).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Dollar Impact</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportTab({ processedEntries, summary, exportData }: { processedEntries: TimeEntry[]; summary: any; exportData: (format: "csv" | "json" | "pdf") => void }) {
  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Download className="h-12 w-12 mb-4" />
        <p>Process entries first to enable export options.</p>
      </div>
    );
  }

  const approvedEntries = processedEntries.filter(e => e.approved);
  const flaggedEntries = processedEntries.filter(e => e.flags.length > 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
          <CardDescription>Download your verified billing data in various formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">CSV Export</p>
                    <p className="text-xs text-muted-foreground">Spreadsheet-compatible format</p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => exportData("csv")} data-testid="button-export-csv">
                  <Download className="h-4 w-4 mr-1" /> Download CSV
                </Button>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileDown className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="font-medium">PDF Export</p>
                    <p className="text-xs text-muted-foreground">Printable report format</p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => exportData("pdf")} data-testid="button-export-pdf">
                  <Download className="h-4 w-4 mr-1" /> Download PDF
                </Button>
              </CardContent>
            </Card>
            <Card className="hover-elevate">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">JSON Export</p>
                    <p className="text-xs text-muted-foreground">Full data with metadata</p>
                  </div>
                </div>
                <Button className="w-full" onClick={() => exportData("json")} data-testid="button-export-json">
                  <Download className="h-4 w-4 mr-1" /> Download JSON
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Entries</p>
              <p className="font-medium">{summary.total}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Approved</p>
              <p className="font-medium text-green-500">{approvedEntries.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Flagged</p>
              <p className="font-medium text-yellow-500">{flaggedEntries.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Amount</p>
              <p className="font-medium">${summary.totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
