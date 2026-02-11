import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, FileSearch, Shield, AlertTriangle, XCircle,
  CheckCircle2, Info, FileText, Hash, Eye, Layers,
  ChevronDown, ChevronRight, Lock
} from "lucide-react";

interface Finding {
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  detail: string;
  evidence: string[];
}

interface ForensicReport {
  id: string;
  filename: string;
  fileSize: number;
  md5: string;
  sha256: string;
  analyzedAt: string;
  pageCount: number;
  findings: Finding[];
  metadata: Record<string, string>;
  severityCounts: Record<string, number>;
  revisionCount: number;
  pageAnalysis: { totalPages: number; inconsistentPages: string[] };
}

const SEVERITY_CONFIG: Record<string, { color: string; bgClass: string; borderClass: string; icon: typeof AlertTriangle }> = {
  critical: { color: "text-red-500", bgClass: "bg-red-500/10", borderClass: "border-l-red-500", icon: XCircle },
  high: { color: "text-orange-500", bgClass: "bg-orange-500/10", borderClass: "border-l-orange-500", icon: AlertTriangle },
  medium: { color: "text-yellow-500", bgClass: "bg-yellow-500/10", borderClass: "border-l-yellow-500", icon: AlertTriangle },
  low: { color: "text-blue-500", bgClass: "bg-blue-500/10", borderClass: "border-l-blue-500", icon: Info },
  info: { color: "text-muted-foreground", bgClass: "bg-muted/30", borderClass: "border-l-muted-foreground", icon: Info },
};

const DEVIL_ADVOCATE = [
  { title: "Layer Stacking & Hidden Content", attack: "Add content on invisible layers (OCGs set to OFF). Stack documents from unrelated cases behind visible content. Lock layers to prevent toggling.", detection: "This tool enumerates all OCGs, checks default visibility states, identifies locked layers, and extracts content from hidden layers." },
  { title: "Flattening to Destroy Evidence", attack: "After adding/hiding content via layers, flatten the PDF to merge everything into a single layer. This destroys the ability to toggle visibility and hides the manipulation.", detection: "Scans for orphaned OCG references, BDC/EMC markers in content streams that indicate layers once existed, and multiple font/style inconsistencies." },
  { title: "Metadata Timestamp Manipulation", attack: "Backdate modification timestamps to make alterations appear original. Strip metadata entirely. Mismatch XMP and DocInfo dates.", detection: "Compares creation vs modification dates, cross-references XMP with DocInfo metadata, flags stripped metadata, identifies known manipulation tools." },
  { title: "Incremental Save Exploitation", attack: "Modify court-approved documents via incremental saves that append changes without altering originals. Or re-save flat to destroy revision history entirely.", detection: "Counts %%EOF markers to find all revisions, extracts and compares each revision's metadata/page count, detects linearization used to erase history." },
  { title: "White Text / Invisible Text Injection", attack: "Add text in white color on white background, position text outside page boundaries, or use microscopic font sizes to hide content that's technically present but humanly invisible.", detection: "Scans every text span for color values near white (RGB > 240), checks bounding boxes against page dimensions, flags text below 1pt size." },
  { title: "Fake Redactions", attack: "Place black rectangles over sensitive text without actually removing the underlying content. Appears redacted visually but text is fully extractable.", detection: "Identifies dark-filled rectangles, extracts text from underneath each one, reports the hidden content verbatim." },
  { title: "Page Insertion from Foreign Documents", attack: "Insert pages from different documents into target files. Match formatting to make it look natural.", detection: "Compares page dimensions across the entire document, flags pages with different sizes, analyzes font census for inconsistencies." },
  { title: "Post-Signature Modification", attack: "Digitally sign a document, then modify it via incremental saves. Some viewers won't flag this if done carefully.", detection: "Cross-references signature presence with revision count. If revisions exist after signatures, flags as critical tampering." },
  { title: "Embedded File Smuggling", attack: "Embed files within the PDF (original unaltered docs, communications, scripts) that aren't visible in normal viewing but exist in the file structure.", detection: "Enumerates /EmbeddedFiles, /JavaScript, and action dictionaries. Reports all hidden payloads." },
  { title: "Trailing Data / Steganography", attack: "Append data after the final %%EOF marker. PDF viewers ignore this but it can contain hidden messages, original document fragments, or encoded data.", detection: "Reads raw bytes past final %%EOF, reports size and preview of any trailing data." },
];

export default function PdfForensicsPage() {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ForensicReport | null>(null);
  const [matterId, setMatterId] = useState<string>("");
  const [expandedFindings, setExpandedFindings] = useState<Set<number>>(new Set());

  const { data: matters = [] } = useQuery<any[]>({
    queryKey: ["/api/matters"],
  });

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Invalid file", description: "Please upload a PDF file", variant: "destructive" });
      return;
    }

    setIsAnalyzing(true);
    setProgress(20);
    setReport(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (matterId && matterId !== "__none__") formData.append("matterId", matterId);

      setProgress(50);

      const res = await fetch("/api/pdf-forensics/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error || "Analysis failed");
      }

      setProgress(90);
      const data = await res.json();
      setReport(data);
      setProgress(100);

      const critCount = data.severityCounts?.critical || 0;
      const highCount = data.severityCounts?.high || 0;
      toast({
        title: "Analysis complete",
        description: `${data.findings.length} findings (${critCount} critical, ${highCount} high)`,
        variant: critCount > 0 ? "destructive" : "default",
      });
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
      e.target.value = "";
    }
  }, [matterId, toast]);

  const toggleFinding = (idx: number) => {
    setExpandedFindings(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const getSeverityBadge = (severity: string) => {
    const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;
    return (
      <Badge variant="secondary" className={`${config.bgClass} ${config.color} uppercase text-xs`} data-testid={`badge-severity-${severity}`}>
        {severity}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-auto" data-testid="pdf-forensics-page">
      <div className="flex items-center justify-between gap-4 flex-wrap p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">PDF Forensic Analysis</h1>
          <p className="text-sm text-muted-foreground">Upload a PDF to analyze for manipulation, hidden content, and structural anomalies</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4 md:space-y-6">
        {!report && (
          <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileSearch className="h-5 w-5" /> Upload PDF for Analysis</CardTitle>
                <CardDescription>Select a PDF file to run forensic analysis. Optionally link to a matter for case integration.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {matters.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Link to Matter (optional)</label>
                    <Select value={matterId} onValueChange={setMatterId}>
                      <SelectTrigger data-testid="select-matter">
                        <SelectValue placeholder="Select a matter..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">No matter</SelectItem>
                        {matters.map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>{m.title || m.name || m.id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="border-2 border-dashed rounded-md p-8 text-center hover-elevate">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={isAnalyzing}
                    className="hidden"
                    id="forensic-upload"
                    data-testid="input-file-upload"
                  />
                  <label htmlFor="forensic-upload" className="cursor-pointer flex flex-col items-center gap-3">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {isAnalyzing ? "Analyzing..." : "Click to upload a PDF file for forensic analysis"}
                    </span>
                  </label>
                </div>

                {isAnalyzing && <Progress value={progress} className="w-full" />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> What This Tool Detects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {[
                    "Hidden text (white/microscopic)",
                    "Fake redactions (overlaid rectangles)",
                    "Manipulation tool signatures",
                    "Metadata anomalies",
                    "Structural tampering",
                    "Data after %%EOF",
                    "Page size inconsistencies",
                    "Digital signature status",
                    "Embedded files & JavaScript",
                    "Incremental save history",
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {report && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileSearch className="h-5 w-5" /> Forensic Report
              </h2>
              <Button variant="outline" onClick={() => setReport(null)} data-testid="button-new-analysis">
                New Analysis
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Filename</p>
                    <p className="font-medium truncate">{report.filename}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">File Size</p>
                    <p className="font-medium">{report.fileSize.toLocaleString()} bytes</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">MD5</p>
                    <p className="font-mono text-xs break-all text-yellow-500">{report.md5}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">SHA-256</p>
                    <p className="font-mono text-xs break-all text-yellow-500">{report.sha256}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(["critical", "high", "medium", "low", "info"] as const).map(sev => {
                const config = SEVERITY_CONFIG[sev];
                const count = report.severityCounts[sev] || 0;
                return (
                  <Card key={sev} className={config.bgClass}>
                    <CardContent className="p-4 text-center">
                      <p className={`text-3xl font-bold ${config.color}`} data-testid={`text-count-${sev}`}>{count}</p>
                      <p className="text-xs text-muted-foreground uppercase">{sev}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Findings ({report.findings.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.findings.map((f, i) => {
                  const config = SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.info;
                  const isExpanded = expandedFindings.has(i);
                  return (
                    <div
                      key={i}
                      className={`rounded-md p-4 ${config.bgClass} cursor-pointer`}
                      onClick={() => toggleFinding(i)}
                      data-testid={`finding-${i}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getSeverityBadge(f.severity)}
                        <Badge variant="outline" className="text-xs">{f.category}</Badge>
                        <span className="font-medium text-sm">{f.title}</span>
                        {isExpanded ? <ChevronDown className="h-4 w-4 ml-auto shrink-0" /> : <ChevronRight className="h-4 w-4 ml-auto shrink-0" />}
                      </div>
                      <p className="text-sm text-muted-foreground">{f.detail}</p>
                      {isExpanded && f.evidence.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {f.evidence.map((ev, j) => (
                            <div key={j} className="text-xs font-mono p-2 bg-background/50 rounded break-all">
                              {ev}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {Object.keys(report.metadata).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Hash className="h-5 w-5" /> Metadata Details</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="p-3 text-left text-xs text-muted-foreground uppercase">Field</th>
                          <th className="p-3 text-left text-xs text-muted-foreground uppercase">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(report.metadata).map(([key, value]) => (
                          <tr key={key} className="border-b">
                            <td className="p-3 font-mono text-xs text-blue-400">{key}</td>
                            <td className="p-3 text-xs break-all">{String(value).substring(0, 500)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" /> Revision History</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Total revisions detected: <span className="font-bold">{report.revisionCount}</span></p>
                  {report.revisionCount <= 1 && (
                    <p className="text-xs text-muted-foreground mt-1">Single revision or no incremental saves detected.</p>
                  )}
                  {report.revisionCount > 1 && (
                    <p className="text-xs text-yellow-500 mt-1">Multiple save sessions detected. Document was modified after initial creation.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Page Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">Total pages: <span className="font-bold">{report.pageAnalysis.totalPages}</span></p>
                  {report.pageAnalysis.inconsistentPages.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {report.pageAnalysis.inconsistentPages.map((p, i) => (
                        <p key={i} className="text-xs text-yellow-500">{p}</p>
                      ))}
                    </div>
                  )}
                  {report.pageAnalysis.inconsistentPages.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">All pages have consistent dimensions.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Abuse Vectors & Countermeasures</CardTitle>
                <CardDescription>Every technique detected maps to a known abuse vector. Here is how someone could manipulate legal PDFs and how this tool catches each one.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {DEVIL_ADVOCATE.map((item, i) => (
                  <div key={i} className="rounded-md p-4 bg-red-500/5">
                    <p className="font-medium text-sm mb-1">{i + 1}. {item.title}</p>
                    <p className="text-xs text-muted-foreground mb-1"><strong>Attack:</strong> {item.attack}</p>
                    <p className="text-xs text-green-500"><strong>Detection:</strong> {item.detection}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="text-center text-xs text-muted-foreground pb-4">
              <p>This report is generated by automated forensic analysis and should be reviewed by a qualified forensic examiner.</p>
              <p>File hashes above can be used to verify document integrity in legal proceedings.</p>
              <p className="mt-1">PDF Forensic Analyzer v1.0 | Analyzed: {new Date(report.analyzedAt).toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
