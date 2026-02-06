import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload, FileText, Image, Music, Video, File, AlertTriangle, CheckCircle,
  Clock, Loader2, BarChart3, Calendar, Users, Zap, Target, Shield,
  BookOpen, ListTodo, Sparkles, ChevronRight, Trash2, RefreshCw,
} from "lucide-react";

interface MatterAsset {
  id: string;
  matterId: string;
  originalFilename: string;
  storageUrl: string;
  fileType: string;
  sizeBytes: number;
  hashSha256: string | null;
  status: string;
  errorMessage: string | null;
  pageCount: number | null;
  docType: string | null;
  custodian: string | null;
  confidentiality: string | null;
  createdAt: string;
}

interface ScanSummary {
  totalFiles: number;
  totalPages: number;
  totalDurationMs: number;
  dateRange: { oldest: string | null; newest: string | null };
  fileTypes: Record<string, number>;
  confidenceDistribution: { high: number; medium: number; low: number; unknown: number };
  problemFiles: Array<{ assetId: string; filename: string; reason: string; confidence?: number }>;
  statusCounts: Record<string, number>;
}

interface InsightRun {
  id: string;
  matterId: string;
  intentType: string;
  status: string;
  outputFormat: string | null;
  createdAt: string;
  errorMessage: string | null;
}

interface Citation {
  assetId?: string;
  filename?: string;
  snippet?: string;
  pageNumber?: number;
}

const FILE_TYPE_ICONS: Record<string, any> = {
  pdf: FileText,
  image: Image,
  audio: Music,
  video: Video,
  doc: FileText,
  text: FileText,
  email: FileText,
  other: File,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    queued: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
    processing: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    ready: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
    failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
    running: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
    complete: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[status] || variants.queued}`} data-testid={`badge-status-${status}`}>
      {status === "processing" || status === "running" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
      {status}
    </span>
  );
}

function CitationList({ citations }: { citations: Citation[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {citations.map((c, i) => (
        <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 pl-2 border-l-2 border-muted">
          <BookOpen className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            <span className="font-medium">{c.filename || "Unknown"}</span>
            {c.pageNumber ? ` (p.${c.pageNumber})` : ""}
            {c.snippet ? `: "${c.snippet.slice(0, 120)}${c.snippet.length > 120 ? "..." : ""}"` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MatterInsights({ matterId }: { matterId: string }) {
  const { toast } = useToast();
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedIntents, setSelectedIntents] = useState<string[]>(["themes", "timeline", "action_items"]);
  const [outputFormat, setOutputFormat] = useState("executive_brief");
  const [activeResultTab, setActiveResultTab] = useState("themes");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { data: assets = [], isLoading: assetsLoading } = useQuery<MatterAsset[]>({
    queryKey: ["/api/matters", matterId, "assets"],
  });

  const { data: scanSummary, isLoading: summaryLoading } = useQuery<ScanSummary>({
    queryKey: ["/api/matters", matterId, "scan-summary"],
    refetchInterval: assets.some(a => a.status === "queued" || a.status === "processing") ? 3000 : false,
  });

  const { data: insightRuns = [] } = useQuery<InsightRun[]>({
    queryKey: ["/api/matters", matterId, "insights", "runs"],
    refetchInterval: 5000,
  });

  const { data: insightResult } = useQuery<{ run: InsightRun; sections: Record<string, any> }>({
    queryKey: ["/api/insights", selectedRunId],
    enabled: !!selectedRunId,
    refetchInterval: selectedRunId && insightRuns.find(r => r.id === selectedRunId)?.status !== "complete" ? 3000 : false,
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append("files", f));
      const res = await fetch(`/api/matters/${matterId}/assets`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "scan-summary"] });
      toast({ title: "Files uploaded", description: "Processing has started." });
    },
    onError: (err: any) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      await apiRequest("DELETE", `/api/matters/${matterId}/assets/${assetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "scan-summary"] });
    },
  });

  const startAnalysisMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/matters/${matterId}/insights/run`, {
        intentType: selectedIntents.join(","),
        outputFormat,
        scope: (scanSummary?.totalFiles || 0) > 20 ? "10_most_recent" : "all",
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setSelectedRunId(data.id);
      setShowIntentDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "insights", "runs"] });
      toast({ title: "Analysis started", description: "Results will appear shortly." });
    },
    onError: (err: any) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const createTasksMutation = useMutation({
    mutationFn: async (runId: string) => {
      const res = await apiRequest("POST", `/api/insights/${runId}/create-tasks`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Tasks created", description: `${data.created} tasks added to board.` });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      uploadMutation.mutate(e.dataTransfer.files);
    }
  }, [uploadMutation]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadMutation.mutate(e.target.files);
    }
  }, [uploadMutation]);

  const readyCount = assets.filter(a => a.status === "ready").length;
  const processingCount = assets.filter(a => a.status === "processing" || a.status === "queued").length;

  const latestCompleteRun = insightRuns.find(r => r.status === "complete");
  const runningRun = insightRuns.find(r => r.status === "running" || r.status === "queued");

  if (!selectedRunId && latestCompleteRun) {
    setTimeout(() => setSelectedRunId(latestCompleteRun.id), 0);
  }

  return (
    <div className="p-6 space-y-6">
      <div
        className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        data-testid="upload-dropzone"
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="font-medium mb-1">Drop files here or click to upload</p>
        <p className="text-sm text-muted-foreground mb-4">PDF, images, Word docs, text files, audio</p>
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => document.getElementById("file-input")?.click()}
            disabled={uploadMutation.isPending}
            data-testid="button-upload-files"
          >
            {uploadMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Select Files
          </Button>
        </div>
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.webp,.doc,.docx,.txt,.rtf,.csv,.mp3,.wav,.ogg,.m4a,.eml"
          data-testid="input-file-upload"
        />
      </div>

      {assets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Uploaded Files ({assets.length})
              {processingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {processingCount} processing
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {assets.map(asset => {
                const Icon = FILE_TYPE_ICONS[asset.fileType] || File;
                return (
                  <div key={asset.id} className="flex items-center gap-3 py-1.5" data-testid={`asset-row-${asset.id}`}>
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">{asset.originalFilename}</span>
                    <span className="text-xs text-muted-foreground">{formatBytes(asset.sizeBytes)}</span>
                    <StatusBadge status={asset.status} />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteAssetMutation.mutate(asset.id)}
                      data-testid={`button-delete-asset-${asset.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {scanSummary && scanSummary.totalFiles > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Scan Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Files</p>
                <p className="text-lg font-semibold" data-testid="text-total-files">{scanSummary.totalFiles}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Pages</p>
                <p className="text-lg font-semibold" data-testid="text-total-pages">{scanSummary.totalPages}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date Range</p>
                <p className="text-sm" data-testid="text-date-range">
                  {scanSummary.dateRange.oldest ? new Date(scanSummary.dateRange.oldest).toLocaleDateString() : "N/A"}
                  {" - "}
                  {scanSummary.dateRange.newest ? new Date(scanSummary.dateRange.newest).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ready</p>
                <p className="text-lg font-semibold" data-testid="text-ready-count">{readyCount} / {assets.length}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">File Types</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(scanSummary.fileTypes).map(([type, count]) => (
                    <Badge key={type} variant="secondary" data-testid={`badge-filetype-${type}`}>
                      {type}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">OCR Confidence</p>
                <div className="flex flex-wrap gap-1.5">
                  {scanSummary.confidenceDistribution.high > 0 && (
                    <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      High: {scanSummary.confidenceDistribution.high}
                    </Badge>
                  )}
                  {scanSummary.confidenceDistribution.medium > 0 && (
                    <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                      Medium: {scanSummary.confidenceDistribution.medium}
                    </Badge>
                  )}
                  {scanSummary.confidenceDistribution.low > 0 && (
                    <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                      Low: {scanSummary.confidenceDistribution.low}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {scanSummary.problemFiles.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Problem Files ({scanSummary.problemFiles.length})
                </p>
                <div className="space-y-1">
                  {scanSummary.problemFiles.map((p, i) => (
                    <div key={i} className="text-xs flex items-center gap-2 text-destructive" data-testid={`problem-file-${i}`}>
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span className="truncate">{p.filename}</span>
                      <span className="text-muted-foreground">- {p.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {readyCount > 0 && (
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowIntentDialog(true)}
            disabled={!!runningRun}
            data-testid="button-start-analysis"
          >
            {runningRun ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analysis Running...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Documents
              </>
            )}
          </Button>
          {scanSummary && scanSummary.totalFiles > 20 && (
            <span className="text-xs text-muted-foreground">
              Will analyze 10 most recent documents first (progressive analysis)
            </span>
          )}
        </div>
      )}

      <Dialog open={showIntentDialog} onOpenChange={setShowIntentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>What do you want to discover?</DialogTitle>
            <DialogDescription>
              Select the types of insights you want from your {readyCount} processed documents.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Analysis Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "themes", label: "Themes", icon: BookOpen },
                  { id: "timeline", label: "Timeline", icon: Calendar },
                  { id: "entities", label: "Entities", icon: Users },
                  { id: "contradictions", label: "Contradictions", icon: Zap },
                  { id: "action_items", label: "Action Items", icon: ListTodo },
                  { id: "risks", label: "Risks / Red Flags", icon: Shield },
                ].map(({ id, label, icon: Icon }) => (
                  <label
                    key={id}
                    className={`flex items-center gap-2 p-2.5 rounded-md cursor-pointer border transition-colors ${
                      selectedIntents.includes(id) ? "border-primary bg-primary/5" : "border-muted"
                    }`}
                    data-testid={`checkbox-intent-${id}`}
                  >
                    <Checkbox
                      checked={selectedIntents.includes(id)}
                      onCheckedChange={(checked) => {
                        setSelectedIntents(prev =>
                          checked ? [...prev, id] : prev.filter(i => i !== id)
                        );
                      }}
                    />
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Output Format</Label>
              <Select value={outputFormat} onValueChange={setOutputFormat}>
                <SelectTrigger data-testid="select-output-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="executive_brief">Executive Brief</SelectItem>
                  <SelectItem value="timeline_table">Timeline Table</SelectItem>
                  <SelectItem value="issue_map">Issue Map</SelectItem>
                  <SelectItem value="task_list">Task List</SelectItem>
                  <SelectItem value="board_update">Board-Ready Update</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIntentDialog(false)}>Cancel</Button>
            <Button
              onClick={() => startAnalysisMutation.mutate()}
              disabled={selectedIntents.length === 0 || startAnalysisMutation.isPending}
              data-testid="button-run-analysis"
            >
              {startAnalysisMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Run Analysis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {insightRuns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Analysis Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insightRuns.slice(0, 5).map(run => (
                <div
                  key={run.id}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover-elevate ${
                    selectedRunId === run.id ? "bg-primary/10 border border-primary/20" : ""
                  }`}
                  onClick={() => setSelectedRunId(run.id)}
                  data-testid={`insight-run-${run.id}`}
                >
                  <StatusBadge status={run.status} />
                  <span className="text-sm flex-1">
                    {run.intentType.split(",").join(", ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {insightResult && insightResult.run.status === "complete" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeResultTab} onValueChange={setActiveResultTab}>
              <TabsList className="mb-4">
                {insightResult.sections.themes && <TabsTrigger value="themes" data-testid="tab-themes">Themes</TabsTrigger>}
                {insightResult.sections.timeline && <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>}
                {insightResult.sections.entities && <TabsTrigger value="entities" data-testid="tab-entities">Entities</TabsTrigger>}
                {insightResult.sections.contradictions && <TabsTrigger value="contradictions" data-testid="tab-contradictions">Contradictions</TabsTrigger>}
                {insightResult.sections.action_items && <TabsTrigger value="action_items" data-testid="tab-action-items">Action Items</TabsTrigger>}
                {insightResult.sections.risks && <TabsTrigger value="risks" data-testid="tab-risks">Risks</TabsTrigger>}
              </TabsList>

              {insightResult.sections.themes && (
                <TabsContent value="themes">
                  <div className="space-y-4">
                    {(insightResult.sections.themes as any[]).map((theme, i) => (
                      <div key={i} className="space-y-1" data-testid={`theme-${i}`}>
                        <h4 className="font-medium text-sm">{theme.title}</h4>
                        <p className="text-sm text-muted-foreground">{theme.explanation}</p>
                        <CitationList citations={theme.citations || []} />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {insightResult.sections.timeline && (
                <TabsContent value="timeline">
                  <div className="space-y-3">
                    {(insightResult.sections.timeline as any[]).map((entry, i) => (
                      <div key={i} className="flex gap-3" data-testid={`timeline-${i}`}>
                        <div className="w-24 shrink-0">
                          <p className="text-xs font-medium">{entry.eventDate || "Unknown"}</p>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">{entry.description}</p>
                          {entry.involvedParties?.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Parties: {entry.involvedParties.join(", ")}
                            </p>
                          )}
                          <CitationList citations={entry.citations || []} />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {insightResult.sections.entities && (
                <TabsContent value="entities">
                  <div className="space-y-3">
                    {(insightResult.sections.entities as any[]).map((entity, i) => (
                      <div key={i} className="flex items-start gap-3" data-testid={`entity-${i}`}>
                        <Badge variant="secondary">{entity.type}</Badge>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {entity.name}
                            {entity.isInferred && <span className="text-xs text-muted-foreground ml-2">(inferred)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{entity.role}</p>
                          <CitationList citations={entity.citations || []} />
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {insightResult.sections.contradictions && (
                <TabsContent value="contradictions">
                  <div className="space-y-4">
                    {(insightResult.sections.contradictions as any[]).map((c, i) => (
                      <div key={i} className="space-y-2 p-3 border rounded-md" data-testid={`contradiction-${i}`}>
                        <div className="space-y-1">
                          <p className="text-sm"><span className="font-medium">Statement A:</span> {c.statementA}</p>
                          <p className="text-sm"><span className="font-medium">Statement B:</span> {c.statementB}</p>
                        </div>
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {c.conflict}
                        </p>
                        <CitationList citations={c.citations || []} />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}

              {insightResult.sections.action_items && (
                <TabsContent value="action_items">
                  <div className="space-y-3">
                    {(insightResult.sections.action_items as any[]).map((item, i) => (
                      <div key={i} className="flex items-start gap-3" data-testid={`action-item-${i}`}>
                        <ListTodo className="h-4 w-4 mt-0.5 shrink-0" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.suggestedOwner && (
                            <p className="text-xs text-muted-foreground">Owner: {item.suggestedOwner}</p>
                          )}
                          {item.suggestedDueDate && (
                            <p className="text-xs text-muted-foreground">Due: {item.suggestedDueDate}</p>
                          )}
                          <CitationList citations={item.citations || []} />
                        </div>
                        <Badge variant={item.confidence >= 0.8 ? "default" : "secondary"}>
                          {Math.round((item.confidence || 0) * 100)}%
                        </Badge>
                      </div>
                    ))}
                    <Separator />
                    <Button
                      onClick={() => selectedRunId && createTasksMutation.mutate(selectedRunId)}
                      disabled={createTasksMutation.isPending}
                      data-testid="button-create-tasks"
                    >
                      {createTasksMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListTodo className="h-4 w-4 mr-2" />}
                      Create Tasks in Board
                    </Button>
                  </div>
                </TabsContent>
              )}

              {insightResult.sections.risks && (
                <TabsContent value="risks">
                  <div className="space-y-3">
                    {(insightResult.sections.risks as any[]).map((risk, i) => (
                      <div key={i} className="flex items-start gap-3" data-testid={`risk-${i}`}>
                        <Shield className={`h-4 w-4 mt-0.5 shrink-0 ${
                          risk.severity === "high" ? "text-red-500" :
                          risk.severity === "medium" ? "text-yellow-500" : "text-green-500"
                        }`} />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">{risk.title}</p>
                          <p className="text-sm text-muted-foreground">{risk.description}</p>
                          <CitationList citations={risk.citations || []} />
                        </div>
                        <Badge variant={risk.severity === "high" ? "destructive" : "secondary"}>
                          {risk.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {insightResult && insightResult.run.status === "running" && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
            <p className="font-medium">Analyzing documents...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a minute depending on the number of files.</p>
          </CardContent>
        </Card>
      )}

      {insightResult && insightResult.run.status === "failed" && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-destructive" />
            <p className="font-medium">Analysis Failed</p>
            <p className="text-sm text-muted-foreground mt-1">{insightResult.run.errorMessage || "An unexpected error occurred."}</p>
          </CardContent>
        </Card>
      )}

      {assets.length === 0 && !assetsLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium mb-1">No files uploaded yet</p>
          <p className="text-sm">Upload documents to start analyzing your case materials.</p>
        </div>
      )}
    </div>
  );
}
