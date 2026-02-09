import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Settings, BarChart3, Download, CheckCircle2,
  AlertTriangle, XCircle, Clock, Scale, Eye,
  ArrowUpDown, Save
} from "lucide-react";
import jsPDF from "jspdf";

import type { TimeEntry, TabKey, DailySummary } from "./billing-verifier/billing-types";
import { DEFAULT_SETTINGS, parseCSV, detectColumns, runPipeline, computeDailySummary } from "./billing-verifier/billing-utils";
import {
  UploadTab, SettingsTab, ResultsTab, ReviewTab,
  ExportTab, DailySummaryTab, AdjustmentsTab
} from "./billing-verifier/billing-tabs";

export default function BillingVerifierPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("upload");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [rawEntries, setRawEntries] = useState<TimeEntry[]>([]);
  const [processedEntries, setProcessedEntries] = useState<TimeEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterConfidence, setFilterConfidence] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<TimeEntry | null>(null);
  const [sortField, setSortField] = useState("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [aliasInput, setAliasInput] = useState("");
  const [partyInput, setPartyInput] = useState("");
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitEntry, setSplitEntry] = useState<TimeEntry | null>(null);

  const { data: profiles = [] } = useQuery({
    queryKey: ["/api/billing-profiles"],
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/billing-profiles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing-profiles"] });
      toast({ title: "Profile saved" });
    },
  });

  const saveResultsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/billing-results", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Results saved" });
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

      if (file.name.endsWith(".json")) {
        const json = JSON.parse(text);
        const items = Array.isArray(json) ? json : json.entries || json.data || json.timeEntries || [];
        entries = items.map((item: any, i: number) => ({
          id: `entry-${i}`,
          date: item.date || item.Date || item.entry_date || "",
          attorney: item.attorney || item.Attorney || item.timekeeper || item.Timekeeper || "",
          description: item.description || item.Description || item.narrative || item.Narrative || item.activity || "",
          hours: parseFloat(item.hours || item.Hours || item.quantity || item.Quantity || "0") || 0,
          rate: parseFloat(item.rate || item.Rate || String(settings.hourlyRate)) || settings.hourlyRate,
          amount: parseFloat(item.amount || item.Amount || item.total || "0") || 0,
          confidence: "high" as const,
          flags: [],
          qualityIssues: [],
          reviewStatus: "pending" as const,
          writeOff: false,
        }));
      } else if (file.name.endsWith(".csv") || file.name.endsWith(".tsv")) {
        const rows = parseCSV(text);
        if (rows.length < 2) throw new Error("CSV file appears empty");
        const colMap = detectColumns(rows[0]);
        entries = rows.slice(1).map((row, i) => ({
          id: `entry-${i}`,
          date: row[colMap.date ?? 0]?.trim() || "",
          attorney: row[colMap.attorney ?? 1]?.trim() || "",
          description: row[colMap.description ?? 2]?.trim() || "",
          hours: parseFloat(row[colMap.hours ?? 3]?.trim() || "0") || 0,
          rate: parseFloat(row[colMap.rate ?? -1]?.trim() || String(settings.hourlyRate)) || settings.hourlyRate,
          amount: parseFloat(row[colMap.amount ?? -1]?.trim() || "0") || 0,
          confidence: "high" as const,
          flags: [],
          qualityIssues: [],
          reviewStatus: "pending" as const,
          writeOff: false,
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
            reviewStatus: "pending" as const,
            writeOff: false,
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
      setDailySummary(computeDailySummary(processed, settings));
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
      reviewStatus: "pending" as const,
      writeOff: false,
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
      setDailySummary(computeDailySummary(processed, settings));
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

  const exportData = useCallback((format: "csv" | "json" | "pdf" | "review-log") => {
    const entries = processedEntries;
    const dateSuffix = new Date().toISOString().slice(0, 10);

    if (format === "review-log") {
      const log = {
        exportedAt: new Date().toISOString(),
        settings,
        reviewLog: entries.map(e => ({
          id: e.id, date: e.date, hours: e.hours,
          reviewStatus: e.reviewStatus || "pending",
          approved: e.approved || false,
          writeOff: e.writeOff || false,
          notes: e.notes || "",
          clioNarrative: e.clioNarrative || "",
        })),
        summary: {
          total: entries.length,
          confirmed: entries.filter(e => e.reviewStatus === "confirmed").length,
          writtenOff: entries.filter(e => e.writeOff).length,
          approved: entries.filter(e => e.approved).length,
        }
      };
      const blob = new Blob([JSON.stringify(log, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `billing-review-log-${dateSuffix}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exported review log" });
      return;
    }

    if (format === "pdf") {
      const doc = new jsPDF();
      let y = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(settings.firmName || "Law Firm", 14, y);
      y += 7;

      if (settings.attorneyName) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(settings.attorneyName, 14, y);
        y += 6;
      }

      if (settings.firmAddress) {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const addrLines = settings.firmAddress.split("\n");
        for (const line of addrLines) {
          doc.text(line, 14, y);
          y += 4;
        }
      }

      y += 2;
      doc.setDrawColor(0, 0, 0);
      doc.line(14, y, 196, y);
      y += 8;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("BILLING STATEMENT", 105, y, { align: "center" });
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 105, y, { align: "center" });
      y += 10;

      doc.setFontSize(10);
      if (settings.clientName) {
        doc.text(`Client: ${settings.clientName}`, 14, y);
        y += 6;
      }
      if (settings.startDate || settings.endDate) {
        doc.text(`Period: ${settings.startDate || "N/A"} to ${settings.endDate || "N/A"}`, 14, y);
        y += 6;
      }
      const termsMap: Record<string, string> = { receipt: "Due Upon Receipt", net15: "Net 15 Days", net30: "Net 30 Days", net60: "Net 60 Days" };
      doc.text(`Payment Terms: ${termsMap[settings.paymentTerms] || "Due Upon Receipt"}`, 14, y);
      y += 8;

      doc.setFontSize(9);
      doc.text(`Dear ${settings.clientName || "Client"},`, 14, y);
      y += 5;
      doc.text("Please find below a summary of legal services rendered during the billing period.", 14, y);
      y += 10;

      doc.setFillColor(240, 240, 240);
      doc.rect(14, y, 182, 24, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`Total Entries: ${summary?.total || 0}`, 20, y + 7);
      doc.text(`Total Hours: ${summary?.totalHours?.toFixed(1) || "0"}`, 75, y + 7);
      doc.text(`Hourly Rate: $${settings.hourlyRate.toFixed(2)}`, 130, y + 7);
      doc.text(`Total Due: $${summary?.totalAmount?.toFixed(2) || "0.00"}`, 20, y + 17);
      doc.text(`Flagged: ${summary?.flagged || 0}`, 75, y + 17);
      doc.text(`Approved: ${summary?.approved || 0}`, 130, y + 17);
      y += 32;

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
        if (y > 265) { doc.addPage(); y = 20; }
        doc.text(e.date.substring(0, 10), 14, y);
        doc.text(e.attorney.substring(0, 15), 40, y);
        doc.text((e.clioNarrative || e.description).substring(0, 45), 75, y);
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

      y += 10;
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.text("Respectfully submitted,", 14, y);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text(settings.attorneyName || settings.firmName || "", 14, y);

      doc.save(`billing-statement-${dateSuffix}.pdf`);
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
            <TabsTrigger value="daily" data-testid="tab-daily"><Clock className="h-4 w-4 mr-1" /> Daily</TabsTrigger>
            <TabsTrigger value="adjustments" data-testid="tab-adjustments"><Scale className="h-4 w-4 mr-1" /> Adjustments</TabsTrigger>
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
              processedEntries={processedEntries}
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

          <TabsContent value="daily" className="mt-0">
            <DailySummaryTab dailySummary={dailySummary} settings={settings} />
          </TabsContent>

          <TabsContent value="adjustments" className="mt-0">
            <AdjustmentsTab
              processedEntries={processedEntries}
              setProcessedEntries={setProcessedEntries}
              settings={settings}
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
