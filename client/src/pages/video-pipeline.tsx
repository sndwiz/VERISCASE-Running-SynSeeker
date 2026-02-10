import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileVideo,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileText,
  Copy,
  Download,
  Link2,
  Eye,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

type PipelineJob = {
  id: string;
  fileName: string;
  fileSize: number;
  status: string;
  currentStage: string;
  progress: number;
  rawFrameCount: number | null;
  uniqueFrameCount: number | null;
  stitchedText: string | null;
  entities: any[] | null;
  stageResults: Record<string, any> | null;
  warnings: string[] | null;
  error: string | null;
  totalDuration: number | null;
  matterId: string | null;
  boardId: string | null;
  createdAt: string;
  completedAt: string | null;
};

type SSEMessage = {
  stage?: string;
  progress?: number;
  message?: string;
  done?: boolean;
};

const STAGES = [
  { key: "validate", label: "Validate" },
  { key: "extract", label: "Extract Frames" },
  { key: "deduplicate", label: "Deduplicate" },
  { key: "ocr", label: "OCR" },
  { key: "stitch", label: "Stitch Document" },
  { key: "entities", label: "Extract Entities" },
  { key: "output", label: "Generate Output" },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec.toFixed(0)}s`;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
    pending: { variant: "secondary", label: "Pending" },
    processing: { variant: "default", label: "Processing" },
    completed: { variant: "outline", label: "Completed" },
    failed: { variant: "destructive", label: "Failed" },
    cancelled: { variant: "secondary", label: "Cancelled" },
  };
  const { variant, label } = variants[status] || { variant: "secondary" as const, label: status };
  return <Badge variant={variant} data-testid={`badge-status-${status}`}>{label}</Badge>;
}

function StageIndicator({ currentStage, status }: { currentStage: string; status: string }) {
  const currentIdx = STAGES.findIndex(s => s.key === currentStage);
  return (
    <div className="flex items-center gap-1 flex-wrap" data-testid="stage-indicator">
      {STAGES.map((stage, idx) => {
        let stageStatus: "done" | "active" | "pending" = "pending";
        if (status === "completed") stageStatus = "done";
        else if (status === "failed" && idx <= currentIdx) stageStatus = idx === currentIdx ? "active" : "done";
        else if (idx < currentIdx) stageStatus = "done";
        else if (idx === currentIdx) stageStatus = "active";

        return (
          <div key={stage.key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              stageStatus === "done" ? "bg-green-500" :
              stageStatus === "active" ? "bg-primary animate-pulse" :
              "bg-muted-foreground/30"
            }`} />
            <span className={`text-xs ${
              stageStatus === "active" ? "text-foreground font-medium" : "text-muted-foreground"
            }`}>{stage.label}</span>
            {idx < STAGES.length - 1 && <span className="text-muted-foreground/30 text-xs mx-0.5">/</span>}
          </div>
        );
      })}
    </div>
  );
}

function UploadSection({ onJobStarted }: { onJobStarted: (jobId: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["mov", "mp4", "m4v", "avi", "mkv", "webm"];
    if (!ext || !allowed.includes(ext)) {
      toast({ title: "Unsupported Format", description: `Only ${allowed.join(", ")} files are supported.`, variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  }, [toast]);

  const uploadFile = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("video", selectedFile);
      formData.append("config", JSON.stringify({}));

      const response = await fetch("/api/video-pipeline/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await response.json();
      toast({ title: "Upload Successful", description: `Job ${data.jobId.slice(0, 8)} started processing.` });
      setSelectedFile(null);
      onJobStarted(data.jobId);
      queryClient.invalidateQueries({ queryKey: ["/api/video-pipeline/jobs"] });
    } catch (err: any) {
      toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card data-testid="card-upload">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Screen Recording
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          data-testid="dropzone-upload"
        >
          {selectedFile ? (
            <div className="flex flex-col items-center gap-3">
              <FileVideo className="w-10 h-10 text-primary" />
              <div>
                <p className="font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={uploadFile} disabled={uploading} data-testid="button-start-pipeline">
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</> : "Start Pipeline"}
                </Button>
                <Button variant="outline" onClick={() => setSelectedFile(null)} disabled={uploading} data-testid="button-clear-file">
                  Clear
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-10 h-10 text-muted-foreground" />
              <div>
                <p className="text-foreground">Drop an iPhone screen recording here</p>
                <p className="text-sm text-muted-foreground">MOV, MP4, MKV, AVI, WebM supported</p>
              </div>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-browse-files">
                Browse Files
              </Button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mov,.mp4,.m4v,.avi,.mkv,.webm"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
            data-testid="input-file-upload"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function JobProgress({ jobId }: { jobId: string }) {
  const [messages, setMessages] = useState<SSEMessage[]>([]);
  const [liveProgress, setLiveProgress] = useState(0);
  const [liveMessage, setLiveMessage] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/video-pipeline/jobs/${jobId}/stream`, { withCredentials: true });
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);
        setMessages(prev => [...prev, data]);
        if (data.progress !== undefined) setLiveProgress(data.progress);
        if (data.message) setLiveMessage(data.message);
        if (data.done) {
          es.close();
          queryClient.invalidateQueries({ queryKey: ["/api/video-pipeline/jobs"] });
          queryClient.invalidateQueries({ queryKey: ["/api/video-pipeline/jobs", jobId] });
        }
      } catch {}
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
    };
  }, [jobId]);

  return (
    <Card data-testid={`card-progress-${jobId}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing: {jobId.slice(0, 8)}...
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={Math.max(0, liveProgress)} className="h-2" data-testid="progress-pipeline" />
        <p className="text-sm text-muted-foreground">{liveMessage || "Starting pipeline..."}</p>
        <ScrollArea className="h-24">
          <div className="space-y-1">
            {messages.filter(m => m.message).map((m, i) => (
              <p key={i} className="text-xs text-muted-foreground font-mono">{m.message}</p>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function BoardLinkSection({ job }: { job: PipelineJob }) {
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const { toast } = useToast();

  const { data: boardsList } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/boards"],
    enabled: job.status === "completed",
  });

  const linkMutation = useMutation({
    mutationFn: async (boardId: string) => {
      const res = await apiRequest("POST", `/api/video-pipeline/jobs/${job.id}/link-board`, { boardId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Linked", description: "Job output linked to board." });
      queryClient.invalidateQueries({ queryKey: ["/api/video-pipeline/jobs"] });
    },
    onError: (err: any) => {
      toast({ title: "Link Failed", description: err.message, variant: "destructive" });
    },
  });

  if (job.boardId) {
    const linkedBoard = boardsList?.find(b => b.id === job.boardId);
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link2 className="w-3.5 h-3.5" />
        <span>Linked to board: {linkedBoard?.name || job.boardId.slice(0, 8)}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
        <SelectTrigger className="w-48" data-testid="select-link-board">
          <SelectValue placeholder="Select a board" />
        </SelectTrigger>
        <SelectContent>
          {(boardsList || []).map(b => (
            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        disabled={!selectedBoardId || linkMutation.isPending}
        onClick={() => selectedBoardId && linkMutation.mutate(selectedBoardId)}
        data-testid="button-link-board"
      >
        {linkMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Link2 className="w-3.5 h-3.5 mr-1" />}
        Link to Board
      </Button>
    </div>
  );
}

function JobDetail({ job }: { job: PipelineJob }) {
  const { toast } = useToast();

  const copyText = useCallback(() => {
    if (job.stitchedText) {
      navigator.clipboard.writeText(job.stitchedText);
      toast({ title: "Copied", description: "Document text copied to clipboard." });
    }
  }, [job.stitchedText, toast]);

  const entities = (job.entities || []) as any[];
  const entityGroups: Record<string, any[]> = {};
  for (const e of entities) {
    const type = e.entityType || "unknown";
    if (!entityGroups[type]) entityGroups[type] = [];
    entityGroups[type].push(e);
  }

  return (
    <Card data-testid={`card-job-${job.id}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <FileVideo className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">{job.fileName}</CardTitle>
            <StatusBadge status={job.status} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{formatFileSize(job.fileSize)}</span>
            {job.totalDuration && (
              <span className="text-xs text-muted-foreground">{formatDuration(job.totalDuration)}</span>
            )}
          </div>
        </div>
        {job.status === "processing" && <StageIndicator currentStage={job.currentStage} status={job.status} />}
        {job.status === "processing" && <Progress value={job.progress} className="h-1.5 mt-2" />}
      </CardHeader>

      {job.status === "completed" && (
        <CardContent>
          <Tabs defaultValue="document" data-testid="tabs-job-result">
            <TabsList>
              <TabsTrigger value="document" data-testid="tab-document">
                <FileText className="w-3.5 h-3.5 mr-1" /> Document
              </TabsTrigger>
              <TabsTrigger value="entities" data-testid="tab-entities">
                <Eye className="w-3.5 h-3.5 mr-1" /> Entities ({entities.length})
              </TabsTrigger>
              <TabsTrigger value="stages" data-testid="tab-stages">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Stages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="document" className="space-y-3 mt-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{job.stitchedText?.split(/\s+/).length || 0} words</span>
                  <span>{job.rawFrameCount || 0} frames extracted</span>
                  <span>{job.uniqueFrameCount || 0} unique</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={copyText} data-testid="button-copy-text">
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy
                  </Button>
                </div>
              </div>
              <ScrollArea className="h-80 border rounded-md p-3">
                <pre className="text-sm whitespace-pre-wrap font-mono text-foreground leading-relaxed">
                  {job.stitchedText || "No text extracted."}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="entities" className="mt-3">
              {entities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No entities extracted.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(entityGroups).map(([type, items]) => (
                    <div key={type}>
                      <h4 className="text-sm font-medium text-foreground mb-1 capitalize">{type.replace(/_/g, " ")}</h4>
                      <div className="flex flex-wrap gap-1">
                        {items.map((e: any, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-entity-${type}-${i}`}>
                            {e.value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="stages" className="mt-3">
              <div className="space-y-2">
                {STAGES.map(stage => {
                  const result = job.stageResults?.[stage.key];
                  if (!result) return null;
                  return (
                    <div key={stage.key} className="flex items-center justify-between gap-2 text-sm py-1 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        {result.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span className="text-foreground">{stage.label}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {result.stageDuration ? `${(result.stageDuration / 1000).toFixed(1)}s` :
                         result.duration ? `${(result.duration / 1000).toFixed(1)}s` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          {job.warnings && job.warnings.length > 0 && (
            <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
              {job.warnings.map((w: string, i: number) => (
                <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {w}
                </p>
              ))}
            </div>
          )}

          <div className="mt-3 pt-3 border-t">
            <BoardLinkSection job={job} />
          </div>
        </CardContent>
      )}

      {job.status === "failed" && job.error && (
        <CardContent>
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive flex items-center gap-2">
              <XCircle className="w-4 h-4" /> {job.error}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function VideoPipelinePage() {
  const [activeJobIds, setActiveJobIds] = useState<string[]>([]);

  const { data: jobs, isLoading } = useQuery<PipelineJob[]>({
    queryKey: ["/api/video-pipeline/jobs"],
    refetchInterval: 10000,
  });

  const handleJobStarted = useCallback((jobId: string) => {
    setActiveJobIds(prev => [...prev, jobId]);
  }, []);

  const completedJobs = (jobs || []).filter(j => j.status === "completed");
  const processingJobs = (jobs || []).filter(j => j.status === "processing" || j.status === "pending");
  const failedJobs = (jobs || []).filter(j => j.status === "failed");

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Legal Video Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Convert iPhone screen recordings of legal documents into structured, searchable text using local AI models.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/video-pipeline/jobs"] })}
            data-testid="button-refresh-jobs"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
        </div>

        <UploadSection onJobStarted={handleJobStarted} />

        {activeJobIds.map(id => (
          <JobProgress key={id} jobId={id} />
        ))}

        {processingJobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> In Progress ({processingJobs.length})
            </h2>
            {processingJobs.map(job => <JobDetail key={job.id} job={job} />)}
          </div>
        )}

        {completedJobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" /> Completed ({completedJobs.length})
            </h2>
            {completedJobs.map(job => <JobDetail key={job.id} job={job} />)}
          </div>
        )}

        {failedJobs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" /> Failed ({failedJobs.length})
            </h2>
            {failedJobs.map(job => <JobDetail key={job.id} job={job} />)}
          </div>
        )}

        {!isLoading && (!jobs || jobs.length === 0) && activeJobIds.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <FileVideo className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No pipeline jobs yet. Upload a screen recording to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
