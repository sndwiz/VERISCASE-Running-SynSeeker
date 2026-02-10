import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Image as ImageIcon,
  Video,
  AudioLines,
  Mail,
  File,
  Shield,
  Lock,
  Eye,
  Search,
  Upload,
  Clock,
  Hash,
  User,
  Calendar,
  FileSearch,
  ScanLine,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Download,
  Archive,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  CloudUpload,
  Trash2,
  ArchiveRestore
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EvidenceVaultFile {
  id: string;
  matterId: string;
  originalName: string;
  originalUrl: string;
  originalHash: string;
  originalSize: number;
  originalMimeType: string;
  evidenceType: "document" | "photo" | "video" | "audio" | "email" | "other";
  confidentiality: "public" | "confidential" | "privileged" | "work-product";
  description: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: string;
  chainOfCustody: CustodyEntry[];
  storageKey?: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  aiAnalysis?: string;
  extractedText?: string;
}

interface CustodyEntry {
  action: string;
  by: string;
  at: string;
  notes?: string;
}

interface OCRJob {
  id: string;
  fileId: string;
  matterId: string;
  status: "pending" | "processing" | "completed" | "failed";
  provider: string;
  extractedText?: string;
  analysis?: string;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface Matter {
  id: string;
  name: string;
  caseNumber: string;
}

interface VerifyResult {
  verified: boolean;
  originalHash: string;
  currentHash?: string;
  verifiedAt: string;
  verifiedBy: string;
  reason?: string;
}

function getEvidenceIcon(type: string) {
  switch (type) {
    case "document": return FileText;
    case "photo": return ImageIcon;
    case "video": return Video;
    case "audio": return AudioLines;
    case "email": return Mail;
    default: return File;
  }
}

function getConfidentialityBadge(level: string) {
  switch (level) {
    case "public":
      return <Badge variant="secondary" data-testid="badge-confidentiality-public"><Eye className="h-3 w-3 mr-1" />Public</Badge>;
    case "confidential":
      return <Badge variant="default" data-testid="badge-confidentiality-confidential"><Lock className="h-3 w-3 mr-1" />Confidential</Badge>;
    case "privileged":
      return <Badge variant="destructive" data-testid="badge-confidentiality-privileged"><Shield className="h-3 w-3 mr-1" />Privileged</Badge>;
    case "work-product":
      return <Badge variant="outline" data-testid="badge-confidentiality-work-product"><FileSearch className="h-3 w-3 mr-1" />Work Product</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
}

function getCustodyIcon(action: string) {
  switch (action) {
    case "uploaded": return <CloudUpload className="h-3 w-3" />;
    case "viewed": return <Eye className="h-3 w-3" />;
    case "downloaded": return <Download className="h-3 w-3" />;
    case "integrity_verified": return <ShieldCheck className="h-3 w-3" />;
    case "archived": return <Archive className="h-3 w-3" />;
    case "restored": return <ArchiveRestore className="h-3 w-3" />;
    case "printed": return <FileText className="h-3 w-3" />;
    case "shared": return <User className="h-3 w-3" />;
    case "analyzed": return <ScanLine className="h-3 w-3" />;
    case "presented": return <Shield className="h-3 w-3" />;
    default: return <Clock className="h-3 w-3" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatCustodyAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export default function EvidenceVaultPage() {
  const { toast } = useToast();
  const [selectedMatterId, setSelectedMatterId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<EvidenceVaultFile | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showCustodyDialog, setShowCustodyDialog] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [showVerifyResult, setShowVerifyResult] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; status: string }[]>([]);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadConfidentiality, setUploadConfidentiality] = useState("confidential");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [custodyForm, setCustodyForm] = useState({
    action: "",
    performedBy: "",
    notes: "",
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: evidenceFiles = [], isLoading: isLoadingFiles } = useQuery<EvidenceVaultFile[]>({
    queryKey: ["/api/matters", selectedMatterId, "evidence", showArchived ? "all" : "active"],
    queryFn: async () => {
      const res = await fetch(`/api/matters/${selectedMatterId}/evidence?includeArchived=${showArchived}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch evidence");
      return res.json();
    },
    enabled: !!selectedMatterId,
  });

  const { data: ocrJobs = [] } = useQuery<OCRJob[]>({
    queryKey: ["/api/ocr-jobs"],
  });

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!selectedMatterId) return;
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setShowUploadPanel(true);
    setUploadProgress(fileArray.map(f => ({ name: f.name, status: "uploading" })));

    const formData = new FormData();
    for (const file of fileArray) {
      formData.append("files", file);
    }
    formData.append("confidentiality", uploadConfidentiality);

    try {
      const res = await fetch(`/api/matters/${selectedMatterId}/evidence/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }

      const results = await res.json();
      setUploadProgress(fileArray.map(f => ({ name: f.name, status: "done" })));
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "evidence"] });
      toast({
        title: `${results.length} file${results.length > 1 ? "s" : ""} uploaded`,
        description: "SHA-256 hashes computed and chain of custody initialized.",
      });

      setTimeout(() => {
        setShowUploadPanel(false);
        setUploadProgress([]);
      }, 2000);
    } catch (error: any) {
      setUploadProgress(fileArray.map(f => ({ name: f.name, status: "error" })));
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    }
  }, [selectedMatterId, uploadConfidentiality, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }, [uploadFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = "";
    }
  }, [uploadFiles]);

  const addCustodyMutation = useMutation({
    mutationFn: async (data: { fileId: string; entry: typeof custodyForm }) => {
      const res = await apiRequest("POST", `/api/evidence/${data.fileId}/custody`, {
        action: data.entry.action,
        by: data.entry.performedBy,
        notes: data.entry.notes,
      });
      return res.json();
    },
    onSuccess: (updatedFile: EvidenceVaultFile) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "evidence"] });
      setSelectedFile(updatedFile);
      setShowCustodyDialog(false);
      setCustodyForm({ action: "", performedBy: "", notes: "" });
      toast({ title: "Custody entry added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add custody entry.", variant: "destructive" });
    }
  });

  const createOCRJobMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const file = evidenceFiles.find(f => f.id === fileId);
      if (!file) throw new Error("File not found");
      const res = await apiRequest("POST", "/api/ocr-jobs", {
        fileId,
        matterId: file.matterId,
        provider: "anthropic-vision",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ocr-jobs"] });
      toast({ title: "OCR job created", description: "Document analysis has been queued." });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiRequest("POST", `/api/evidence/${fileId}/verify`, {});
      return res.json();
    },
    onSuccess: (result: VerifyResult) => {
      setVerifyResult(result);
      setShowVerifyResult(true);
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "evidence"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to verify integrity.", variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiRequest("POST", `/api/evidence/${fileId}/archive`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "evidence"] });
      setSelectedFile(null);
      setShowArchiveConfirm(false);
      toast({ title: "Evidence archived", description: "The file has been soft-deleted. It can be restored." });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiRequest("POST", `/api/evidence/${fileId}/restore`, {});
      return res.json();
    },
    onSuccess: (updatedFile: EvidenceVaultFile) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "evidence"] });
      setSelectedFile(updatedFile);
      toast({ title: "Evidence restored" });
    },
  });

  const filteredFiles = evidenceFiles.filter(file => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      file.originalName.toLowerCase().includes(query) ||
      (file.description || "").toLowerCase().includes(query) ||
      (file.tags || []).some(t => t.toLowerCase().includes(query))
    );
  });

  const handleDownload = useCallback((fileId: string) => {
    window.open(`/api/evidence/${fileId}/download`, "_blank");
  }, []);

  const handlePreview = useCallback((fileId: string) => {
    window.open(`/api/evidence/${fileId}/preview`, "_blank");
  }, []);

  const canPreview = (mime: string) => {
    return mime.startsWith("image/") || mime === "application/pdf" || mime.startsWith("text/") || mime.startsWith("video/") || mime.startsWith("audio/");
  };

  return (
    <div className="h-full flex flex-col" data-testid="page-evidence-vault">
      <div className="flex items-center justify-between p-4 border-b gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Evidence Vault</h1>
          <p className="text-muted-foreground text-sm">Immutable file storage with SHA-256 integrity and chain-of-custody tracking</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedMatterId} onValueChange={setSelectedMatterId}>
            <SelectTrigger className="w-[200px]" data-testid="select-matter">
              <SelectValue placeholder="Select matter" />
            </SelectTrigger>
            <SelectContent>
              {matters.map(matter => (
                <SelectItem key={matter.id} value={matter.id}>
                  {matter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={uploadConfidentiality} onValueChange={setUploadConfidentiality}>
            <SelectTrigger className="w-[150px]" data-testid="select-upload-confidentiality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="confidential">Confidential</SelectItem>
              <SelectItem value="privileged">Privileged</SelectItem>
              <SelectItem value="work-product">Work Product</SelectItem>
            </SelectContent>
          </Select>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
            data-testid="input-file-upload"
          />
          <Button
            disabled={!selectedMatterId}
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-evidence"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>

          <Button
            variant={showArchived ? "default" : "outline"}
            size="icon"
            onClick={() => setShowArchived(!showArchived)}
            title={showArchived ? "Showing archived" : "Show archived"}
            data-testid="button-toggle-archived"
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!selectedMatterId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Select a Matter</h2>
            <p className="text-muted-foreground">Choose a matter to view its evidence vault</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div
            className={`flex-1 flex flex-col border-r relative ${isDragging ? "ring-2 ring-primary ring-inset" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-0 bg-primary/10 z-10 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <CloudUpload className="h-16 w-16 mx-auto text-primary mb-2" />
                  <p className="text-lg font-semibold text-primary">Drop files to upload</p>
                  <p className="text-sm text-muted-foreground">SHA-256 hashes will be computed automatically</p>
                </div>
              </div>
            )}

            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search evidence by name, description, or tags..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  data-testid="input-search-evidence"
                />
              </div>
            </div>

            {showUploadPanel && uploadProgress.length > 0 && (
              <div className="p-3 border-b bg-muted/50">
                <p className="text-sm font-medium mb-2">Uploading {uploadProgress.length} file{uploadProgress.length > 1 ? "s" : ""}...</p>
                <div className="space-y-1">
                  {uploadProgress.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {item.status === "uploading" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                      {item.status === "done" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      {item.status === "error" && <XCircle className="h-3 w-3 text-destructive" />}
                      <span className="truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CloudUpload className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No evidence files</p>
                    <p className="text-sm mt-1">Drag and drop files here or click Upload Files</p>
                  </div>
                ) : (
                  filteredFiles.map(file => {
                    const Icon = getEvidenceIcon(file.evidenceType);
                    const ocrJob = ocrJobs.find(j => j.fileId === file.id);
                    return (
                      <Card
                        key={file.id}
                        className={`cursor-pointer hover-elevate ${selectedFile?.id === file.id ? "ring-2 ring-primary" : ""} ${file.isArchived ? "opacity-60" : ""}`}
                        onClick={() => setSelectedFile(file)}
                        data-testid={`card-evidence-${file.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-md bg-muted">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium truncate">{file.originalName}</span>
                                {getConfidentialityBadge(file.confidentiality)}
                                {file.isArchived && <Badge variant="secondary"><Archive className="h-3 w-3 mr-1" />Archived</Badge>}
                                {file.storageKey && <Badge variant="outline" className="text-green-600 border-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />File stored</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{file.description || "No description"}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(file.uploadedAt)}
                                </span>
                                <span>{formatFileSize(file.originalSize)}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {(file.chainOfCustody || []).length} custody entries
                                </span>
                                {ocrJob && (
                                  <Badge variant={ocrJob.status === "completed" ? "default" : ocrJob.status === "failed" ? "destructive" : "secondary"}>
                                    <ScanLine className="h-3 w-3 mr-1" />
                                    OCR: {ocrJob.status}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="w-[420px] flex flex-col">
            {selectedFile ? (
              <Tabs defaultValue="details" className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4">
                  <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
                  <TabsTrigger value="custody" data-testid="tab-custody">Custody ({(selectedFile.chainOfCustody || []).length})</TabsTrigger>
                  <TabsTrigger value="analysis" data-testid="tab-analysis">Analysis</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="flex-1 overflow-auto">
                  <div className="p-4 space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{selectedFile.originalName}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getConfidentialityBadge(selectedFile.confidentiality)}
                        {selectedFile.isArchived && <Badge variant="secondary"><Archive className="h-3 w-3 mr-1" />Archived</Badge>}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">SHA-256:</span>
                        <code className="text-xs bg-muted px-1 py-0.5 rounded truncate flex-1">
                          {selectedFile.originalHash}
                        </code>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Size:</span>
                        <span>{formatFileSize(selectedFile.originalSize)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Type:</span>
                        <span>{selectedFile.originalMimeType}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Uploaded by:</span>
                        <span>{selectedFile.uploadedBy}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Uploaded:</span>
                        <span>{formatDate(selectedFile.uploadedAt)}</span>
                      </div>

                      {selectedFile.storageKey && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 dark:text-green-400">File stored on server</span>
                        </div>
                      )}
                    </div>

                    {selectedFile.description && (
                      <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <p className="mt-1">{selectedFile.description}</p>
                      </div>
                    )}

                    {(selectedFile.tags || []).length > 0 && (
                      <div>
                        <Label className="text-muted-foreground">Tags</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedFile.tags.map((tag, i) => (
                            <Badge key={i} variant="outline">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t space-y-2">
                      {selectedFile.storageKey && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handleDownload(selectedFile.id)}
                              data-testid="button-download"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                            {canPreview(selectedFile.originalMimeType) && (
                              <Button
                                variant="outline"
                                onClick={() => handlePreview(selectedFile.id)}
                                data-testid="button-preview"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </Button>
                            )}
                          </div>

                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => verifyMutation.mutate(selectedFile.id)}
                            disabled={verifyMutation.isPending}
                            data-testid="button-verify-integrity"
                          >
                            {verifyMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-4 w-4 mr-2" />
                            )}
                            Verify Integrity
                          </Button>
                        </>
                      )}

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => createOCRJobMutation.mutate(selectedFile.id)}
                        disabled={createOCRJobMutation.isPending}
                        data-testid="button-run-ocr"
                      >
                        <ScanLine className="h-4 w-4 mr-2" />
                        Run OCR / AI Analysis
                      </Button>

                      {selectedFile.isArchived ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => restoreMutation.mutate(selectedFile.id)}
                          disabled={restoreMutation.isPending}
                          data-testid="button-restore"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restore from Archive
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full text-destructive"
                          onClick={() => setShowArchiveConfirm(true)}
                          data-testid="button-archive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Archive Evidence
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="custody" className="flex-1 overflow-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <h3 className="font-semibold">Chain of Custody</h3>
                      <Dialog open={showCustodyDialog} onOpenChange={setShowCustodyDialog}>
                        <Button size="sm" onClick={() => setShowCustodyDialog(true)} data-testid="button-add-custody">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Entry
                        </Button>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Custody Entry</DialogTitle>
                            <DialogDescription>
                              Record a chain of custody event for this evidence.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Action</Label>
                              <Select
                                value={custodyForm.action}
                                onValueChange={v => setCustodyForm(p => ({ ...p, action: v }))}
                              >
                                <SelectTrigger data-testid="select-custody-action">
                                  <SelectValue placeholder="Select action" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="viewed">Viewed</SelectItem>
                                  <SelectItem value="downloaded">Downloaded</SelectItem>
                                  <SelectItem value="printed">Printed</SelectItem>
                                  <SelectItem value="shared">Shared</SelectItem>
                                  <SelectItem value="analyzed">Analyzed</SelectItem>
                                  <SelectItem value="presented">Presented in Court</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Performed By</Label>
                              <Input
                                value={custodyForm.performedBy}
                                onChange={e => setCustodyForm(p => ({ ...p, performedBy: e.target.value }))}
                                placeholder="Attorney name"
                                data-testid="input-custody-performed-by"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Notes (optional)</Label>
                              <Textarea
                                value={custodyForm.notes}
                                onChange={e => setCustodyForm(p => ({ ...p, notes: e.target.value }))}
                                placeholder="Additional notes..."
                                data-testid="input-custody-notes"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={() => addCustodyMutation.mutate({ fileId: selectedFile.id, entry: custodyForm })}
                              disabled={!custodyForm.action || !custodyForm.performedBy || addCustodyMutation.isPending}
                              data-testid="button-submit-custody"
                            >
                              {addCustodyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                              Add Entry
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <ScrollArea className="h-[calc(100vh-300px)]">
                      <div className="space-y-1">
                        {(selectedFile.chainOfCustody || []).length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No custody entries recorded
                          </p>
                        ) : (
                          [...(selectedFile.chainOfCustody || [])].reverse().map((entry, idx) => (
                            <div key={idx} className="flex gap-3 py-2 text-sm border-b last:border-0">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0 mt-0.5">
                                {getCustodyIcon(entry.action)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium">{formatCustodyAction(entry.action)}</span>
                                  <span className="text-muted-foreground">by {entry.by}</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {formatDate(entry.at)}
                                </div>
                                {entry.notes && (
                                  <p className="text-xs text-muted-foreground mt-1 italic">{entry.notes}</p>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="analysis" className="flex-1 overflow-auto">
                  <div className="p-4 space-y-4">
                    {selectedFile.extractedText ? (
                      <div>
                        <Label className="text-muted-foreground mb-2 block">Extracted Text</Label>
                        <div className="bg-muted p-3 rounded-md text-sm max-h-64 overflow-auto whitespace-pre-wrap">
                          {selectedFile.extractedText}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <ScanLine className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No analysis available</p>
                        <p className="text-sm mt-1">Run OCR / AI Analysis from the Details tab</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground p-4">
                  <FileSearch className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">Select evidence to view details</p>
                  <p className="text-sm mt-1">Click a file from the list or drag and drop files to upload</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Dialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Archive Evidence
            </DialogTitle>
            <DialogDescription>
              This will soft-delete the evidence file. The original file and all custody records
              will be preserved and can be restored later. This action is logged in the chain of custody.
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="font-medium">{selectedFile.originalName}</p>
              <p className="text-muted-foreground mt-1">SHA-256: {selectedFile.originalHash.substring(0, 16)}...</p>
              <p className="text-muted-foreground">{formatFileSize(selectedFile.originalSize)} | {(selectedFile.chainOfCustody || []).length} custody entries</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveConfirm(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => selectedFile && archiveMutation.mutate(selectedFile.id)}
              disabled={archiveMutation.isPending}
              data-testid="button-confirm-archive"
            >
              {archiveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showVerifyResult} onOpenChange={setShowVerifyResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {verifyResult?.verified ? (
                <ShieldCheck className="h-5 w-5 text-green-500" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              )}
              Integrity Verification
            </DialogTitle>
            <DialogDescription>
              {verifyResult?.verified
                ? "The file has not been modified since upload. Integrity confirmed."
                : verifyResult?.reason || "WARNING: The file hash does not match. The file may have been tampered with."}
            </DialogDescription>
          </DialogHeader>
          {verifyResult && (
            <div className="space-y-3">
              <div className="bg-muted p-3 rounded-md text-sm space-y-2">
                <div>
                  <span className="text-muted-foreground">Original hash: </span>
                  <code className="text-xs break-all">{verifyResult.originalHash}</code>
                </div>
                {verifyResult.currentHash && (
                  <div>
                    <span className="text-muted-foreground">Current hash: </span>
                    <code className={`text-xs break-all ${verifyResult.verified ? "" : "text-destructive"}`}>
                      {verifyResult.currentHash}
                    </code>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Verified at: </span>
                  <span className="text-xs">{formatDate(verifyResult.verifiedAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Verified by: </span>
                  <span className="text-xs">{verifyResult.verifiedBy}</span>
                </div>
              </div>
              <Badge variant={verifyResult.verified ? "default" : "destructive"} className="w-full justify-center py-1">
                {verifyResult.verified ? "INTEGRITY VERIFIED" : "INTEGRITY CHECK FAILED"}
              </Badge>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVerifyResult(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
