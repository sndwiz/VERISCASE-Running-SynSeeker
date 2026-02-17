import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload, FileText, Image, Music, Video, File, AlertTriangle,
  Loader2, BarChart3, Calendar, Users, Zap, Target, Shield,
  BookOpen, ListTodo, Sparkles, ChevronRight, Trash2,
} from "lucide-react";
import type {
  InsightCitation, ThemeResult, TimelineEntry, EntityResult,
  ContradictionResult, ActionItemResult, RiskResult, InsightAnalysisResult,
  ToneAnalysisResult, ConsistencyCheckResult,
} from "@shared/insights-types";

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

interface InsightRunInfo {
  id: string;
  matterId: string;
  intentType: string;
  status: string;
  outputFormat: string | null;
  createdAt: string;
  errorMessage: string | null;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
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
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[status] || variants.queued}`}
      data-testid={`badge-status-${status}`}
    >
      {(status === "processing" || status === "running") && (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      )}
      {status}
    </span>
  );
}

function CitationList({ citations }: { citations: InsightCitation[] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="mt-2 space-y-1" role="list" aria-label="Source citations">
      {citations.map((c, i) => (
        <div key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 pl-2 border-l-2 border-muted" role="listitem">
          <BookOpen className="h-3 w-3 mt-0.5 shrink-0" aria-hidden="true" />
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

function UploadDropzone({
  onFilesSelected,
  isPending,
}: {
  onFilesSelected: (files: FileList) => void;
  isPending: boolean;
}) {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  }, [onFilesSelected]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

  return (
    <div
      className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
        dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label="File upload area. Drop files here or press Enter to select files."
      data-testid="upload-dropzone"
    >
      <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium mb-1">Drop files here or click to upload</p>
      <p className="text-sm text-muted-foreground mb-4">PDF, images, Word docs, text files, audio</p>
      <div className="flex items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          data-testid="button-upload-files"
        >
          {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Select Files
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
            e.target.value = "";
          }
        }}
        accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif,.webp,.doc,.docx,.txt,.rtf,.csv,.mp3,.wav,.ogg,.m4a,.eml"
        aria-hidden="true"
        tabIndex={-1}
        data-testid="input-file-upload"
      />
    </div>
  );
}

function AssetList({
  assets,
  processingCount,
  onDelete,
}: {
  assets: MatterAsset[];
  processingCount: number;
  onDelete: (assetId: string) => void;
}) {
  if (assets.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" aria-hidden="true" />
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
        <div className="space-y-2 max-h-60 overflow-y-auto" role="list" aria-label="Uploaded files">
          {assets.map(asset => {
            const Icon = FILE_TYPE_ICONS[asset.fileType] || File;
            return (
              <div key={asset.id} className="flex items-center gap-3 py-1.5" role="listitem" data-testid={`asset-row-${asset.id}`}>
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm truncate flex-1">{asset.originalFilename}</span>
                <span className="text-xs text-muted-foreground">{formatBytes(asset.sizeBytes)}</span>
                <StatusBadge status={asset.status} />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDelete(asset.id)}
                  aria-label={`Delete ${asset.originalFilename}`}
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
  );
}

function ScanSummaryCard({
  summary,
  readyCount,
  totalCount,
}: {
  summary: ScanSummary;
  readyCount: number;
  totalCount: number;
}) {
  if (summary.totalFiles === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          Scan Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Files</p>
            <p className="text-lg font-semibold" data-testid="text-total-files">{summary.totalFiles}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Pages</p>
            <p className="text-lg font-semibold" data-testid="text-total-pages">{summary.totalPages}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Date Range</p>
            <p className="text-sm" data-testid="text-date-range">
              {summary.dateRange.oldest ? new Date(summary.dateRange.oldest).toLocaleDateString() : "N/A"}
              {" - "}
              {summary.dateRange.newest ? new Date(summary.dateRange.newest).toLocaleDateString() : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ready</p>
            <p className="text-lg font-semibold" data-testid="text-ready-count">{readyCount} / {totalCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground mb-2">File Types</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(summary.fileTypes).map(([type, count]) => (
                <Badge key={type} variant="secondary" data-testid={`badge-filetype-${type}`}>
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">OCR Confidence</p>
            <div className="flex flex-wrap gap-1.5">
              {summary.confidenceDistribution.high > 0 && (
                <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 no-default-hover-elevate no-default-active-elevate">
                  High: {summary.confidenceDistribution.high}
                </Badge>
              )}
              {summary.confidenceDistribution.medium > 0 && (
                <Badge variant="secondary" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 no-default-hover-elevate no-default-active-elevate">
                  Medium: {summary.confidenceDistribution.medium}
                </Badge>
              )}
              {summary.confidenceDistribution.low > 0 && (
                <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 no-default-hover-elevate no-default-active-elevate">
                  Low: {summary.confidenceDistribution.low}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {summary.problemFiles.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              Problem Files ({summary.problemFiles.length})
            </p>
            <div className="space-y-1" role="list" aria-label="Files with issues">
              {summary.problemFiles.map((p, i) => (
                <div key={i} className="text-xs flex items-center gap-2 text-destructive" role="listitem" data-testid={`problem-file-${i}`}>
                  <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">{p.filename}</span>
                  <span className="text-muted-foreground">- {p.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IntentDialog({
  open,
  onOpenChange,
  readyCount,
  selectedIntents,
  setSelectedIntents,
  outputFormat,
  setOutputFormat,
  onRun,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readyCount: number;
  selectedIntents: string[];
  setSelectedIntents: (fn: (prev: string[]) => string[]) => void;
  outputFormat: string;
  setOutputFormat: (v: string) => void;
  onRun: () => void;
  isPending: boolean;
}) {
  const intentOptions = [
    { id: "themes", label: "Themes", icon: BookOpen },
    { id: "timeline", label: "Timeline", icon: Calendar },
    { id: "entities", label: "Entities", icon: Users },
    { id: "contradictions", label: "Contradictions", icon: Zap },
    { id: "action_items", label: "Action Items", icon: ListTodo },
    { id: "risks", label: "Risks / Red Flags", icon: Shield },
    { id: "tone_analysis", label: "Tone Analysis", icon: BarChart3 },
    { id: "consistency_check", label: "Consistency (H0/H1)", icon: Target },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {intentOptions.map(({ id, label, icon: Icon }) => (
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
                  <Icon className="h-4 w-4" aria-hidden="true" />
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onRun}
            disabled={selectedIntents.length === 0 || isPending}
            data-testid="button-run-analysis"
          >
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Run Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultsViewer({
  sections,
  activeTab,
  onTabChange,
  onCreateTasks,
  isCreatingTasks,
}: {
  sections: Partial<InsightAnalysisResult>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onCreateTasks: () => void;
  isCreatingTasks: boolean;
}) {
  const availableTabs = [
    { key: "themes", label: "Themes", hasData: !!sections.themes },
    { key: "timeline", label: "Timeline", hasData: !!sections.timeline },
    { key: "entities", label: "Entities", hasData: !!sections.entities },
    { key: "contradictions", label: "Contradictions", hasData: !!sections.contradictions },
    { key: "action_items", label: "Action Items", hasData: !!sections.action_items },
    { key: "risks", label: "Risks", hasData: !!sections.risks },
    { key: "tone_analysis", label: "Tone Analysis", hasData: !!sections.tone_analysis },
    { key: "consistency_check", label: "Consistency", hasData: !!sections.consistency_check },
  ].filter(t => t.hasData);

  if (availableTabs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" aria-hidden="true" />
          Analysis Results
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="mb-4 flex-wrap h-auto">
            {availableTabs.map(t => (
              <TabsTrigger key={t.key} value={t.key} data-testid={`tab-${t.key}`}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.themes && (
            <TabsContent value="themes">
              <div className="space-y-4" role="list" aria-label="Identified themes">
                {(sections.themes as ThemeResult[]).map((theme, i) => (
                  <div key={i} className="space-y-1" role="listitem" data-testid={`theme-${i}`}>
                    <h4 className="font-medium text-sm">{theme.title}</h4>
                    <p className="text-sm text-muted-foreground">{theme.explanation}</p>
                    <CitationList citations={theme.citations || []} />
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {sections.timeline && (
            <TabsContent value="timeline">
              <div className="space-y-3" role="list" aria-label="Event timeline">
                {(sections.timeline as TimelineEntry[]).map((entry, i) => (
                  <div key={i} className="flex gap-3" role="listitem" data-testid={`timeline-${i}`}>
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

          {sections.entities && (
            <TabsContent value="entities">
              <div className="space-y-3" role="list" aria-label="Identified entities">
                {(sections.entities as EntityResult[]).map((entity, i) => (
                  <div key={i} className="flex items-start gap-3" role="listitem" data-testid={`entity-${i}`}>
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

          {sections.contradictions && (
            <TabsContent value="contradictions">
              <div className="space-y-4" role="list" aria-label="Found contradictions">
                {(sections.contradictions as ContradictionResult[]).map((c, i) => (
                  <div key={i} className="space-y-2 p-3 border rounded-md" role="listitem" data-testid={`contradiction-${i}`}>
                    <div className="space-y-1">
                      <p className="text-sm"><span className="font-medium">Statement A:</span> {c.statementA}</p>
                      <p className="text-sm"><span className="font-medium">Statement B:</span> {c.statementB}</p>
                    </div>
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <Zap className="h-3 w-3" aria-hidden="true" />
                      {c.conflict}
                    </p>
                    <CitationList citations={c.citations || []} />
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {sections.action_items && (
            <TabsContent value="action_items">
              <div className="space-y-3">
                <div role="list" aria-label="Suggested action items" className="space-y-3">
                  {(sections.action_items as ActionItemResult[]).map((item, i) => (
                    <div key={i} className="flex items-start gap-3" role="listitem" data-testid={`action-item-${i}`}>
                      <ListTodo className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
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
                </div>
                <Separator />
                <Button
                  onClick={onCreateTasks}
                  disabled={isCreatingTasks}
                  data-testid="button-create-tasks"
                >
                  {isCreatingTasks ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListTodo className="h-4 w-4 mr-2" />}
                  Create Tasks in Board
                </Button>
              </div>
            </TabsContent>
          )}

          {sections.risks && (
            <TabsContent value="risks">
              <div className="space-y-3" role="list" aria-label="Identified risks">
                {(sections.risks as RiskResult[]).map((risk, i) => (
                  <div key={i} className="flex items-start gap-3" role="listitem" data-testid={`risk-${i}`}>
                    <Shield className={`h-4 w-4 mt-0.5 shrink-0 ${
                      risk.severity === "high" ? "text-red-500" :
                      risk.severity === "medium" ? "text-yellow-500" : "text-green-500"
                    }`} aria-hidden="true" />
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

          {sections.tone_analysis && (
            <TabsContent value="tone_analysis">
              <div className="space-y-6" role="list" aria-label="Tone analysis results">
                {(sections.tone_analysis as ToneAnalysisResult[]).map((tone, i) => (
                  <div key={i} className="space-y-3 p-4 border rounded-md" role="listitem" data-testid={`tone-${i}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h4 className="font-medium text-sm">{tone.document}</h4>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{tone.formalityLevel?.replace("_", " ")}</Badge>
                        <Badge>{tone.overallTone}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Emotional Register</p>
                        <p className="text-sm">{tone.emotionalRegister}</p>
                      </div>
                      {tone.persuasionTactics?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Persuasion Tactics</p>
                          <div className="flex flex-wrap gap-1">
                            {tone.persuasionTactics.map((t, j) => (
                              <Badge key={j} variant="secondary">{t}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {tone.linguisticMarkers?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Linguistic Markers</p>
                        <div className="flex flex-wrap gap-1">
                          {tone.linguisticMarkers.map((m, j) => (
                            <Badge key={j} variant="secondary">{m}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {tone.credibilityIndicators && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Credibility Indicators</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {tone.credibilityIndicators.hedgingLanguage?.length > 0 && (
                            <div className="space-y-0.5">
                              <p className="font-medium">Hedging Language</p>
                              {tone.credibilityIndicators.hedgingLanguage.map((h, j) => (
                                <p key={j} className="text-muted-foreground">"{h}"</p>
                              ))}
                            </div>
                          )}
                          {tone.credibilityIndicators.absoluteStatements?.length > 0 && (
                            <div className="space-y-0.5">
                              <p className="font-medium">Absolute Statements</p>
                              {tone.credibilityIndicators.absoluteStatements.map((a, j) => (
                                <p key={j} className="text-muted-foreground">"{a}"</p>
                              ))}
                            </div>
                          )}
                          {tone.credibilityIndicators.evasivePatterns?.length > 0 && (
                            <div className="space-y-0.5">
                              <p className="font-medium text-destructive">Evasive Patterns</p>
                              {tone.credibilityIndicators.evasivePatterns.map((e, j) => (
                                <p key={j} className="text-muted-foreground">"{e}"</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {tone.toneShifts?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Tone Shifts</p>
                        {tone.toneShifts.map((s, j) => (
                          <div key={j} className="text-xs flex items-center gap-1">
                            <span>{s.fromTone}</span>
                            <ChevronRight className="h-3 w-3" aria-hidden="true" />
                            <span>{s.toTone}</span>
                            <span className="text-muted-foreground ml-1">({s.significance})</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground border-t pt-2">{tone.summary}</p>
                    <CitationList citations={tone.citations || []} />
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {sections.consistency_check && (
            <TabsContent value="consistency_check">
              <div className="space-y-6" role="list" aria-label="Consistency check results">
                {(sections.consistency_check as ConsistencyCheckResult[]).map((check, i) => (
                  <div key={i} className="space-y-4 p-4 border rounded-md" role="listitem" data-testid={`consistency-${i}`}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-0.5">
                        <h4 className="font-medium text-sm">{check.documentA} vs {check.documentB}</h4>
                      </div>
                      <Badge variant={
                        check.verdict === "inconsistent" ? "destructive" :
                        check.verdict === "consistent" ? "default" : "secondary"
                      }>
                        {check.verdict.toUpperCase()} ({Math.round((check.confidenceScore || 0) * 100)}%)
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1 p-2 rounded-md bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground">H0 (Null Hypothesis)</p>
                        <p>{check.nullHypothesis}</p>
                      </div>
                      <div className="space-y-1 p-2 rounded-md bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground">H1 (Alternative Hypothesis)</p>
                        <p>{check.alternativeHypothesis}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Statistical Reasoning</p>
                      <p className="text-sm">{check.statisticalReasoning}</p>
                    </div>

                    {check.factualDiscrepancies?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Factual Discrepancies ({check.factualDiscrepancies.length})
                        </p>
                        {check.factualDiscrepancies.map((d, j) => (
                          <div key={j} className="text-sm space-y-1 p-2 border rounded-md">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={
                                d.significance === "critical" ? "destructive" :
                                d.significance === "major" ? "default" : "secondary"
                              }>
                                {d.significance}
                              </Badge>
                              <span className="font-medium">{d.claim}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                              <p><span className="font-medium">Doc A:</span> {d.versionA}</p>
                              <p><span className="font-medium">Doc B:</span> {d.versionB}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {check.evidenceForNull?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-green-600 dark:text-green-400">
                            Evidence for Consistency ({check.evidenceForNull.length})
                          </p>
                          {check.evidenceForNull.slice(0, 4).map((e, j) => (
                            <p key={j} className="text-xs text-muted-foreground">{e.statement}</p>
                          ))}
                        </div>
                      )}
                      {check.evidenceForAlternative?.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-red-600 dark:text-red-400">
                            Evidence for Inconsistency ({check.evidenceForAlternative.length})
                          </p>
                          {check.evidenceForAlternative.slice(0, 4).map((e, j) => (
                            <p key={j} className="text-xs text-muted-foreground">{e.statement}</p>
                          ))}
                        </div>
                      )}
                    </div>

                    {check.toneAlignment && (
                      <div className="flex items-center gap-2 text-sm">
                        <Badge variant={check.toneAlignment.aligned ? "default" : "destructive"}>
                          Tone {check.toneAlignment.aligned ? "Aligned" : "Misaligned"}
                        </Badge>
                        <span className="text-muted-foreground text-xs">{check.toneAlignment.explanation}</span>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground border-t pt-2">{check.overallAssessment}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function MatterInsights({ matterId }: { matterId: string }) {
  const { toast } = useToast();
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  const [selectedIntents, setSelectedIntents] = useState<string[]>(["themes", "timeline", "action_items"]);
  const [outputFormat, setOutputFormat] = useState("executive_brief");
  const [activeResultTab, setActiveResultTab] = useState("themes");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const { data: assetsResponse, isLoading: assetsLoading } = useQuery<PaginatedResponse<MatterAsset>>({
    queryKey: ["/api/matters", matterId, "assets"],
  });
  const assets = assetsResponse?.data ?? [];

  const isProcessing = assets.some(a => a.status === "queued" || a.status === "processing");

  const { data: scanSummary } = useQuery<ScanSummary>({
    queryKey: ["/api/matters", matterId, "scan-summary"],
    refetchInterval: isProcessing ? 3000 : false,
  });

  const { data: runsResponse } = useQuery<PaginatedResponse<InsightRunInfo>>({
    queryKey: ["/api/matters", matterId, "insights", "runs"],
    refetchInterval: isProcessing ? 5000 : 30000,
  });
  const insightRuns = runsResponse?.data ?? [];

  const { data: insightResult } = useQuery<{ run: InsightRunInfo; sections: Partial<InsightAnalysisResult> }>({
    queryKey: ["/api/insights", selectedRunId],
    enabled: !!selectedRunId,
    refetchInterval: selectedRunId && insightRuns.find(r => r.id === selectedRunId)?.status !== "complete" ? 3000 : false,
  });

  useEffect(() => {
    if (!selectedRunId && insightRuns.length > 0) {
      const latest = insightRuns.find(r => r.status === "complete");
      if (latest) setSelectedRunId(latest.id);
    }
  }, [selectedRunId, insightRuns]);

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append("files", f));
      const res = await fetch(`/api/matters/${matterId}/assets`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "scan-summary"] });
      toast({ title: "Files uploaded", description: "Processing has started." });
    },
    onError: (err: Error) => {
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
    onSuccess: (data: { id: string }) => {
      setSelectedRunId(data.id);
      setShowIntentDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "insights", "runs"] });
      toast({ title: "Analysis started", description: "Results will appear shortly." });
    },
    onError: (err: Error) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const createTasksMutation = useMutation({
    mutationFn: async (runId: string) => {
      const res = await apiRequest("POST", `/api/insights/${runId}/create-tasks`);
      return res.json();
    },
    onSuccess: (data: { created: number }) => {
      toast({ title: "Tasks created", description: `${data.created} tasks added to board.` });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const readyCount = assets.filter(a => a.status === "ready").length;
  const processingCount = assets.filter(a => a.status === "processing" || a.status === "queued").length;
  const runningRun = insightRuns.find(r => r.status === "running" || r.status === "queued");

  return (
    <div className="p-6 space-y-6">
      <UploadDropzone
        onFilesSelected={(files) => uploadMutation.mutate(files)}
        isPending={uploadMutation.isPending}
      />

      <AssetList
        assets={assets}
        processingCount={processingCount}
        onDelete={(id) => deleteAssetMutation.mutate(id)}
      />

      {scanSummary && (
        <ScanSummaryCard
          summary={scanSummary}
          readyCount={readyCount}
          totalCount={assets.length}
        />
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

      <IntentDialog
        open={showIntentDialog}
        onOpenChange={setShowIntentDialog}
        readyCount={readyCount}
        selectedIntents={selectedIntents}
        setSelectedIntents={setSelectedIntents}
        outputFormat={outputFormat}
        setOutputFormat={setOutputFormat}
        onRun={() => startAnalysisMutation.mutate()}
        isPending={startAnalysisMutation.isPending}
      />

      {insightRuns.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Analysis Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" role="list" aria-label="Analysis run history">
              {insightRuns.slice(0, 5).map(run => (
                <div
                  key={run.id}
                  className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover-elevate ${
                    selectedRunId === run.id ? "bg-primary/10 border border-primary/20" : ""
                  }`}
                  onClick={() => setSelectedRunId(run.id)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedRunId(run.id); } }}
                  role="button"
                  tabIndex={0}
                  aria-label={`View analysis run from ${new Date(run.createdAt).toLocaleString()}`}
                  data-testid={`insight-run-${run.id}`}
                >
                  <StatusBadge status={run.status} />
                  <span className="text-sm flex-1">
                    {run.intentType.split(",").join(", ")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {insightResult && insightResult.run.status === "complete" && (
        <ResultsViewer
          sections={insightResult.sections}
          activeTab={activeResultTab}
          onTabChange={setActiveResultTab}
          onCreateTasks={() => selectedRunId && createTasksMutation.mutate(selectedRunId)}
          isCreatingTasks={createTasksMutation.isPending}
        />
      )}

      {insightResult && insightResult.run.status === "running" && (
        <Card>
          <CardContent className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Analyzing documents...</p>
            <p className="text-sm text-muted-foreground mt-1">This may take a minute depending on the number of files.</p>
          </CardContent>
        </Card>
      )}

      {insightResult && insightResult.run.status === "failed" && (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-destructive" aria-hidden="true" />
            <p className="font-medium">Analysis Failed</p>
            <p className="text-sm text-muted-foreground mt-1">{insightResult.run.errorMessage || "An unexpected error occurred."}</p>
          </CardContent>
        </Card>
      )}

      {assets.length === 0 && !assetsLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" aria-hidden="true" />
          <p className="font-medium mb-1">No files uploaded yet</p>
          <p className="text-sm">Upload documents to start analyzing your case materials.</p>
        </div>
      )}
    </div>
  );
}
