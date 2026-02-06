import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderOpen,
  ScanSearch,
  Upload,
  FileText,
  Image,
  Sheet,
  Film,
  Music,
  File,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Undo2,
  Loader2,
  Trash2,
  FolderInput,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  History,
  Sparkles,
} from "lucide-react";
import type {
  ScanSummary,
  OrganizePlanGroup,
  OrganizeAction,
  ConfidenceLevel,
} from "@shared/schema";

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  sheet: Sheet,
  image: Image,
  video: Film,
  audio: Music,
  other: File,
};

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const ACTION_LABELS: Record<string, string> = {
  rename_move: "Rename & Move",
  keep: "Keep in Place",
  trash_candidate: "Move to Trash",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

type Step = "scan" | "plan" | "approve" | "execute" | "history";

export default function UploadOrganizerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("scan");
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editOverrides, setEditOverrides] = useState<Record<string, { filename?: string; folder?: string; action?: OrganizeAction }>>({});
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const { data: scanSummary, isLoading: scanLoading, refetch: refetchScan } = useQuery<ScanSummary>({
    queryKey: ["/api/organizer/scan-summary"],
    enabled: step === "scan",
  });

  const { data: incomingFiles = [] } = useQuery<any[]>({
    queryKey: ["/api/organizer/files", "new"],
    queryFn: () => fetch("/api/organizer/files?status=new", { credentials: "include" }).then(r => r.json()),
    enabled: step === "scan",
  });

  const { data: planData, isLoading: planLoading, refetch: refetchPlan } = useQuery<{
    run: any;
    planGroups: OrganizePlanGroup[];
  }>({
    queryKey: ["/api/organizer/runs", currentRunId, "plan"],
    queryFn: () => fetch(`/api/organizer/runs/${currentRunId}/plan`, { credentials: "include" }).then(r => r.json()),
    enabled: !!currentRunId && (step === "plan" || step === "approve"),
  });

  const { data: changeLog = [] } = useQuery<any[]>({
    queryKey: ["/api/organizer/change-log"],
    queryFn: () => fetch("/api/organizer/change-log", { credentials: "include" }).then(r => r.json()),
    enabled: step === "history",
  });

  const { data: pastRuns = [] } = useQuery<any[]>({
    queryKey: ["/api/organizer/runs"],
    enabled: step === "history",
  });

  const createRunMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/organizer/runs", { scope: "incoming", daysFilter: 14 }),
    onSuccess: async (res) => {
      const data = await res.json();
      setCurrentRunId(data.runId);
      if (data.planGroups && data.planGroups.length > 0) {
        const allItemIds = new Set<string>();
        data.planGroups.forEach((g: OrganizePlanGroup) =>
          g.items.forEach(item => allItemIds.add(item.id))
        );
        setSelectedItems(allItemIds);
        setStep("plan");
      } else {
        toast({ title: "No files to organize", description: "No new incoming files found in the last 14 days." });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/scan-summary"] });
    },
    onError: () => {
      toast({ title: "Failed to generate plan", variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const approvals = Array.from(selectedItems).map(itemId => {
        const override = editOverrides[itemId];
        const planItem = findPlanItem(itemId);
        return {
          planItemId: itemId,
          action: override?.action || planItem?.suggestedAction || "rename_move",
          filename: override?.filename || planItem?.suggestedFilename,
          folder: override?.folder || planItem?.suggestedFolder,
        };
      });
      return apiRequest("POST", `/api/organizer/runs/${currentRunId}/approve`, { approvals });
    },
    onSuccess: () => {
      toast({ title: "Plan approved", description: "Ready to execute preview batch." });
      setStep("execute");
      refetchPlan();
    },
    onError: () => {
      toast({ title: "Failed to approve plan", variant: "destructive" });
    },
  });

  const executeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/organizer/runs/${currentRunId}/execute-preview`),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({
        title: `Executed ${data.executed} files`,
        description: data.remaining > 0
          ? `${data.remaining} files remaining. Click Continue to process more.`
          : "All files processed successfully.",
      });
      refetchPlan();
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/scan-summary"] });
    },
    onError: () => {
      toast({ title: "Execution failed", variant: "destructive" });
    },
  });

  const continueMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/organizer/runs/${currentRunId}/continue`),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({
        title: `Processed ${data.executed} more files`,
        description: data.remaining > 0
          ? `${data.remaining} files remaining.`
          : "All files processed.",
      });
      refetchPlan();
    },
  });

  const undoMutation = useMutation({
    mutationFn: (changeLogId: string) => apiRequest("POST", `/api/organizer/undo/${changeLogId}`),
    onSuccess: () => {
      toast({ title: "Change undone successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/change-log"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/scan-summary"] });
    },
    onError: () => {
      toast({ title: "Failed to undo", variant: "destructive" });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (fileData: { originalFilename: string; currentPath: string; fileType: string; sizeBytes: number; ocrText?: string }) =>
      apiRequest("POST", "/api/organizer/upload-metadata", fileData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/scan-summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/organizer/files"] });
      toast({ title: "File added to incoming" });
    },
  });

  function findPlanItem(itemId: string) {
    if (!planData?.planGroups) return null;
    for (const group of planData.planGroups) {
      const item = group.items.find(i => i.id === itemId);
      if (item) return item;
    }
    return null;
  }

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const toggleItem = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!planData?.planGroups) return;
    const all = new Set<string>();
    planData.planGroups.forEach(g => g.items.forEach(i => all.add(i.id)));
    setSelectedItems(all);
  }, [planData]);

  const deselectAll = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const handleFileUploadSimulated = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        let fileType = "other";
        if (["pdf"].includes(ext)) fileType = "pdf";
        else if (["doc", "docx", "txt"].includes(ext)) fileType = "doc";
        else if (["xls", "xlsx", "csv"].includes(ext)) fileType = "sheet";
        else if (["png", "jpg", "jpeg", "heic", "webp"].includes(ext)) fileType = "image";
        uploadMutation.mutate({
          originalFilename: file.name,
          currentPath: "/Incoming",
          fileType,
          sizeBytes: file.size,
        });
      }
    };
    input.click();
  }, [uploadMutation]);

  const runStatus = planData?.run?.status;
  const isExecuting = executeMutation.isPending || continueMutation.isPending;
  const isPaused = runStatus === "paused";
  const isComplete = runStatus === "complete";

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-organizer-title">Upload Organizer</h1>
            <p className="text-sm text-muted-foreground">AI-powered file triage, rename, and routing for your incoming files</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={step === "scan" ? "default" : "outline"}
              size="sm"
              onClick={() => setStep("scan")}
              data-testid="button-step-scan"
            >
              <ScanSearch className="h-4 w-4 mr-1" />
              Scan
            </Button>
            {currentRunId && (
              <Button
                variant={step === "plan" || step === "approve" ? "default" : "outline"}
                size="sm"
                onClick={() => setStep("plan")}
                data-testid="button-step-plan"
              >
                <FolderInput className="h-4 w-4 mr-1" />
                Plan
              </Button>
            )}
            <Button
              variant={step === "history" ? "default" : "outline"}
              size="sm"
              onClick={() => setStep("history")}
              data-testid="button-step-history"
            >
              <History className="h-4 w-4 mr-1" />
              History
            </Button>
          </div>
        </div>

        {step === "scan" && (
          <ScanView
            summary={scanSummary}
            isLoading={scanLoading}
            incomingFiles={incomingFiles}
            onScan={() => refetchScan()}
            onGeneratePlan={() => createRunMutation.mutate()}
            onUpload={handleFileUploadSimulated}
            isGenerating={createRunMutation.isPending}
          />
        )}

        {(step === "plan" || step === "approve") && planData?.planGroups && (
          <PlanView
            planGroups={planData.planGroups}
            run={planData.run}
            selectedItems={selectedItems}
            editOverrides={editOverrides}
            collapsedGroups={collapsedGroups}
            onToggleGroup={toggleGroup}
            onToggleItem={toggleItem}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onEditOverride={(itemId, override) =>
              setEditOverrides(prev => ({ ...prev, [itemId]: { ...prev[itemId], ...override } }))
            }
            onApprove={() => approveMutation.mutate()}
            isApproving={approveMutation.isPending}
            onCancel={() => { setStep("scan"); setCurrentRunId(null); }}
          />
        )}

        {step === "execute" && planData && (
          <ExecuteView
            run={planData.run}
            planGroups={planData.planGroups}
            isExecuting={isExecuting}
            isPaused={isPaused}
            isComplete={isComplete}
            onExecute={() => executeMutation.mutate()}
            onContinue={() => continueMutation.mutate()}
            onDone={() => { setStep("scan"); setCurrentRunId(null); }}
          />
        )}

        {step === "history" && (
          <HistoryView
            changeLog={changeLog}
            runs={pastRuns}
            onUndo={(id) => undoMutation.mutate(id)}
            isUndoing={undoMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

function ScanView({
  summary,
  isLoading,
  incomingFiles,
  onScan,
  onGeneratePlan,
  onUpload,
  isGenerating,
}: {
  summary?: ScanSummary;
  isLoading: boolean;
  incomingFiles: any[];
  onScan: () => void;
  onGeneratePlan: () => void;
  onUpload: () => void;
  isGenerating: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={onUpload} variant="outline" data-testid="button-upload-files">
          <Upload className="h-4 w-4 mr-1" />
          Add Files
        </Button>
        <Button onClick={onScan} variant="outline" data-testid="button-refresh-scan">
          <ScanSearch className="h-4 w-4 mr-1" />
          Refresh Scan
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Scanning incoming files...</span>
          </CardContent>
        </Card>
      ) : summary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold" data-testid="text-total-count">{summary.totalCount}</div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold" data-testid="text-14day-count">{summary.last14DaysCount}</div>
                <div className="text-sm text-muted-foreground">Last 14 Days</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold" data-testid="text-ocr-count">{summary.derivedTextCount}</div>
                <div className="text-sm text-muted-foreground">With OCR Text</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Date Range</div>
                <div className="text-xs mt-1">
                  {summary.dateRangeOldest
                    ? `${new Date(summary.dateRangeOldest).toLocaleDateString()} - ${new Date(summary.dateRangeNewest!).toLocaleDateString()}`
                    : "No files"}
                </div>
              </CardContent>
            </Card>
          </div>

          {Object.keys(summary.countsByType).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Files by Type</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(summary.countsByType).map(([type, count]) => {
                  const Icon = FILE_TYPE_ICONS[type] || File;
                  return (
                    <Badge key={type} variant="secondary" className="gap-1" data-testid={`badge-type-${type}`}>
                      <Icon className="h-3 w-3" />
                      {type}: {count}
                    </Badge>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {Object.keys(summary.countsBySubtype).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Detection</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {Object.entries(summary.countsBySubtype).map(([sub, count]) => (
                  <Badge key={sub} variant="outline" data-testid={`badge-subtype-${sub}`}>
                    {sub}: {count}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {summary.last14DaysCount > 0 && (
            <Card className="border-primary/30">
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Ready to Organize</div>
                    <div className="text-sm text-muted-foreground">
                      {summary.last14DaysCount} files from the last 14 days are ready for AI-powered triage
                    </div>
                  </div>
                </div>
                <Button
                  onClick={onGeneratePlan}
                  disabled={isGenerating}
                  data-testid="button-generate-plan"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Analyzing Files...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1" />
                      Generate Organization Plan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {incomingFiles.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Incoming Files ({incomingFiles.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {incomingFiles.map((file: any) => {
                    const Icon = FILE_TYPE_ICONS[file.fileType] || File;
                    return (
                      <div
                        key={file.id}
                        className="flex items-center gap-2 py-1.5 px-2 rounded text-sm"
                        data-testid={`file-row-${file.id}`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate flex-1">{file.originalFilename}</span>
                        <span className="text-xs text-muted-foreground shrink-0">{formatBytes(file.sizeBytes || 0)}</span>
                        <Badge variant="outline" className="text-xs shrink-0">{file.fileType}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {summary.totalCount === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <div className="font-medium">No incoming files</div>
                <div className="text-sm text-muted-foreground mt-1">Upload files to get started with organization</div>
                <Button onClick={onUpload} className="mt-4" variant="outline" data-testid="button-upload-empty">
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Files
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}

function PlanView({
  planGroups,
  run,
  selectedItems,
  editOverrides,
  collapsedGroups,
  onToggleGroup,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
  onEditOverride,
  onApprove,
  isApproving,
  onCancel,
}: {
  planGroups: OrganizePlanGroup[];
  run: any;
  selectedItems: Set<string>;
  editOverrides: Record<string, { filename?: string; folder?: string; action?: OrganizeAction }>;
  collapsedGroups: Set<string>;
  onToggleGroup: (label: string) => void;
  onToggleItem: (itemId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onEditOverride: (itemId: string, override: { filename?: string; folder?: string; action?: OrganizeAction }) => void;
  onApprove: () => void;
  isApproving: boolean;
  onCancel: () => void;
}) {
  const totalItems = planGroups.reduce((sum, g) => sum + g.items.length, 0);
  const moveCount = planGroups.reduce((sum, g) => sum + g.items.filter(i => (editOverrides[i.id]?.action || i.suggestedAction) === "rename_move").length, 0);
  const keepCount = planGroups.reduce((sum, g) => sum + g.items.filter(i => (editOverrides[i.id]?.action || i.suggestedAction) === "keep").length, 0);
  const trashCount = planGroups.reduce((sum, g) => sum + g.items.filter(i => (editOverrides[i.id]?.action || i.suggestedAction) === "trash_candidate").length, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Badge data-testid="badge-plan-total">{totalItems} files</Badge>
              <div className="flex items-center gap-2 text-sm">
                <span className="flex items-center gap-1">
                  <FolderInput className="h-3.5 w-3.5 text-primary" />
                  {moveCount} move
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  {keepCount} keep
                </span>
                <span className="flex items-center gap-1">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  {trashCount} trash
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onSelectAll} data-testid="button-select-all">
                Select All
              </Button>
              <Button size="sm" variant="outline" onClick={onDeselectAll} data-testid="button-deselect-all">
                Deselect All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {planGroups.map((group) => (
        <Card key={group.label}>
          <CardHeader
            className="cursor-pointer py-3 px-4"
            onClick={() => onToggleGroup(group.label)}
          >
            <div className="flex items-center gap-2">
              {collapsedGroups.has(group.label) ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              <CardTitle className="text-sm font-medium" data-testid={`text-group-${group.label}`}>
                {group.label}
              </CardTitle>
              <Badge variant="secondary">{group.items.length}</Badge>
            </div>
          </CardHeader>
          {!collapsedGroups.has(group.label) && (
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              {group.items.map((item) => {
                const override = editOverrides[item.id] || {};
                const Icon = FILE_TYPE_ICONS[item.fileType] || File;
                const action = override.action || item.suggestedAction;
                const filename = override.filename || item.suggestedFilename;
                const folder = override.folder || item.suggestedFolder;

                return (
                  <div
                    key={item.id}
                    className={`rounded-md border p-3 space-y-2 ${selectedItems.has(item.id) ? "border-primary/40" : "border-border"}`}
                    data-testid={`plan-item-${item.id}`}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => onToggleItem(item.id)}
                        className="mt-1"
                        data-testid={`checkbox-item-${item.id}`}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm font-medium truncate">{item.originalFilename}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{formatBytes(item.sizeBytes)}</span>
                          <Badge variant="outline" className={`text-xs shrink-0 ${CONFIDENCE_COLORS[item.confidence]}`}>
                            {item.confidence}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.detectedSummary}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-mono">{folder}/{filename}</span>
                        </div>
                        <div className="text-xs text-muted-foreground italic">{item.rationale}</div>
                      </div>
                    </div>

                    {selectedItems.has(item.id) && (
                      <div className="flex flex-wrap items-center gap-2 pl-6">
                        <Select
                          value={action}
                          onValueChange={(val) => onEditOverride(item.id, { action: val as OrganizeAction })}
                        >
                          <SelectTrigger className="w-40" data-testid={`select-action-${item.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rename_move">Rename & Move</SelectItem>
                            <SelectItem value="keep">Keep in Place</SelectItem>
                            <SelectItem value="trash_candidate">Trash</SelectItem>
                          </SelectContent>
                        </Select>
                        {action === "rename_move" && (
                          <>
                            <Input
                              value={filename}
                              onChange={(e) => onEditOverride(item.id, { filename: e.target.value })}
                              className="flex-1 min-w-[200px] text-xs font-mono"
                              data-testid={`input-filename-${item.id}`}
                            />
                            <Input
                              value={folder}
                              onChange={(e) => onEditOverride(item.id, { folder: e.target.value })}
                              className="w-48 text-xs font-mono"
                              data-testid={`input-folder-${item.id}`}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      ))}

      <div className="flex items-center justify-end gap-2 sticky bottom-0 bg-background py-3 border-t">
        <Button variant="outline" onClick={onCancel} data-testid="button-cancel-plan">
          Cancel
        </Button>
        <Button
          onClick={onApprove}
          disabled={selectedItems.size === 0 || isApproving}
          data-testid="button-approve-plan"
        >
          {isApproving ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Approve Plan ({selectedItems.size} items)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ExecuteView({
  run,
  planGroups,
  isExecuting,
  isPaused,
  isComplete,
  onExecute,
  onContinue,
  onDone,
}: {
  run: any;
  planGroups: OrganizePlanGroup[];
  isExecuting: boolean;
  isPaused: boolean;
  isComplete: boolean;
  onExecute: () => void;
  onContinue: () => void;
  onDone: () => void;
}) {
  const executedCount = planGroups.reduce((sum, g) =>
    sum + g.items.filter(i => i.executionStatus === "executed").length, 0);
  const approvedCount = planGroups.reduce((sum, g) =>
    sum + g.items.filter(i => i.executionStatus === "approved").length, 0);
  const failedCount = planGroups.reduce((sum, g) =>
    sum + g.items.filter(i => i.executionStatus === "failed").length, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-medium">Execution Status</h3>
              <p className="text-sm text-muted-foreground">
                {isComplete
                  ? "All approved files have been processed."
                  : isPaused
                  ? "Preview batch complete. Review results before continuing."
                  : "Ready to execute approved changes in batches of 10."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isComplete && !isPaused && (
                <Button
                  onClick={onExecute}
                  disabled={isExecuting || approvedCount === 0}
                  data-testid="button-execute-preview"
                >
                  {isExecuting ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Executing...</>
                  ) : (
                    <>Execute Preview (10 files)</>
                  )}
                </Button>
              )}
              {isPaused && (
                <Button
                  onClick={onContinue}
                  disabled={isExecuting}
                  data-testid="button-continue-batch"
                >
                  {isExecuting ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processing...</>
                  ) : (
                    <>Continue ({approvedCount} remaining)</>
                  )}
                </Button>
              )}
              {isComplete && (
                <Button onClick={onDone} data-testid="button-done">
                  Done
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {executedCount} executed
            </span>
            <span className="flex items-center gap-1">
              <FolderInput className="h-4 w-4 text-primary" />
              {approvedCount} pending
            </span>
            {failedCount > 0 && (
              <span className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-destructive" />
                {failedCount} failed
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {planGroups.map((group) => (
        <Card key={group.label}>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-1">
            {group.items.map((item) => {
              const Icon = FILE_TYPE_ICONS[item.fileType] || File;
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded text-sm"
                  data-testid={`exec-item-${item.id}`}
                >
                  {item.executionStatus === "executed" && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                  {item.executionStatus === "approved" && <FolderInput className="h-4 w-4 text-muted-foreground shrink-0" />}
                  {item.executionStatus === "failed" && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                  {item.executionStatus === "rejected" && <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
                  {item.executionStatus === "pending" && <File className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{item.originalFilename}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
                    {item.approvedFolder || item.suggestedFolder}/{item.approvedFilename || item.suggestedFilename}
                  </span>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {item.executionStatus}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HistoryView({
  changeLog,
  runs,
  onUndo,
  isUndoing,
}: {
  changeLog: any[];
  runs: any[];
  onUndo: (id: string) => void;
  isUndoing: boolean;
}) {
  return (
    <div className="space-y-4">
      {runs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Organization Runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {runs.map((run: any) => (
              <div key={run.id} className="flex items-center gap-2 py-1.5 px-2 rounded text-sm" data-testid={`run-${run.id}`}>
                <Badge variant="outline">{run.status}</Badge>
                <span>{run.totalFiles} files</span>
                <span className="text-xs text-muted-foreground">
                  {run.createdAt ? new Date(run.createdAt).toLocaleString() : ""}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {run.executedCount || 0} executed
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Change Log ({changeLog.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {changeLog.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No changes recorded yet</div>
          ) : (
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {changeLog.map((entry: any) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded text-sm"
                  data-testid={`log-entry-${entry.id}`}
                >
                  <Badge variant="outline" className="text-xs shrink-0">{entry.action}</Badge>
                  <span className="truncate flex-1 font-mono text-xs">
                    {entry.oldFilename} → {entry.newFilename}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}
                  </span>
                  {entry.reversible && !entry.reversedAt && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUndo(entry.id)}
                      disabled={isUndoing}
                      data-testid={`button-undo-${entry.id}`}
                    >
                      <Undo2 className="h-3 w-3 mr-1" />
                      Undo
                    </Button>
                  )}
                  {entry.reversedAt && (
                    <Badge variant="secondary" className="text-xs">Reversed</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {changeLog.length === 0 && runs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <div className="font-medium">No history yet</div>
            <div className="text-sm text-muted-foreground mt-1">
              Organization runs and file changes will appear here
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
