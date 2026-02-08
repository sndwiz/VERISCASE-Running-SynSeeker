import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Loader2,
  Eye,
  Hash,
  Stamp,
  Shield,
  Plus,
  ChevronDown,
  ChevronRight,
  ScanText,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

interface Matter {
  id: string;
  name: string;
  caseNumber: string;
}

interface PdfDocument {
  id: string;
  matterId: string;
  title: string;
  originalFilename: string;
  fileSize: number;
  pageCount: number | null;
  sha256Hash: string;
  createdAt: string;
  hasOcrText: boolean;
  activeJobs: number;
  latestVersion: DocumentVersion | null;
}

interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  storageKey: string;
  jobType: string;
  createdAt: string;
}

interface DocumentJob {
  id: string;
  documentId: string;
  jobType: string;
  status: string;
  progressPercent: number;
  createdAt: string;
}

interface DocumentDetail {
  document: PdfDocument;
  versions: DocumentVersion[];
  jobs: DocumentJob[];
  ocrText: { text: string } | null;
  washReports: WashReport[];
}

interface BatesSet {
  id: string;
  matterId: string;
  name: string;
  prefix: string;
  padding: number;
  nextNumber: number;
  placement: string;
  fontSize: number;
  createdAt: string;
  ranges: BatesRange[];
}

interface BatesRange {
  id: string;
  batesSetId: string;
  documentId: string;
  startNumber: number;
  endNumber: number;
  createdAt: string;
}

interface WashReport {
  id: string;
  documentId: string;
  policy: string;
  detectionMode: string;
  totalDetections: number;
  detections: WashDetection[];
  createdAt: string;
}

interface WashDetection {
  type: string;
  value: string;
  page: number;
  confidence: number;
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
    minute: "2-digit",
  });
}

function jobStatusBadge(status: string) {
  switch (status) {
    case "running":
      return <Badge variant="default" data-testid="badge-job-running"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
    case "queued":
      return <Badge variant="secondary" data-testid="badge-job-queued"><Clock className="h-3 w-3 mr-1" />Queued</Badge>;
    case "complete":
      return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" data-testid="badge-job-complete"><CheckCircle2 className="h-3 w-3 mr-1" />Complete</Badge>;
    case "failed":
      return <Badge variant="destructive" data-testid="badge-job-failed"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    default:
      return <Badge variant="outline" data-testid="badge-job-unknown">{status}</Badge>;
  }
}

export default function PdfProPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMatterId, setSelectedMatterId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("documents");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [showDocDetailDialog, setShowDocDetailDialog] = useState(false);

  const [batesForm, setBatesForm] = useState({
    name: "",
    prefix: "",
    padding: 6,
    nextNumber: 1,
    placement: "bottom-right",
    fontSize: 10,
  });

  const [washDocId, setWashDocId] = useState<string>("");
  const [washPolicy, setWashPolicy] = useState<string>("medium");
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery<PdfDocument[]>({
    queryKey: ["/api/pdf-pro/matters", selectedMatterId, "documents"],
    enabled: !!selectedMatterId,
  });

  const { data: batesSets = [], isLoading: batesLoading } = useQuery<BatesSet[]>({
    queryKey: ["/api/pdf-pro/matters", selectedMatterId, "bates-sets"],
    enabled: !!selectedMatterId,
  });

  const { data: docDetail, isLoading: detailLoading } = useQuery<DocumentDetail>({
    queryKey: ["/api/pdf-pro/documents", selectedDocId],
    enabled: !!selectedDocId && showDocDetailDialog,
  });

  const { data: washReports = [], isLoading: washReportsLoading } = useQuery<WashReport[]>({
    queryKey: ["/api/pdf-pro/documents", washDocId, "wash-reports"],
    enabled: !!washDocId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/pdf-pro/matters/${selectedMatterId}/documents/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-pro/matters", selectedMatterId, "documents"] });
      toast({ title: "Document uploaded successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => apiRequest("DELETE", `/api/pdf-pro/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-pro/matters", selectedMatterId, "documents"] });
      toast({ title: "Document deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete document", variant: "destructive" });
    },
  });

  const ocrMutation = useMutation({
    mutationFn: (docId: string) => apiRequest("POST", `/api/pdf-pro/documents/${docId}/jobs/ocr`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-pro/matters", selectedMatterId, "documents"] });
      toast({ title: "OCR job queued" });
    },
    onError: () => {
      toast({ title: "Failed to start OCR", variant: "destructive" });
    },
  });

  const batesMutation = useMutation({
    mutationFn: ({ docId, body }: { docId: string; body: any }) =>
      apiRequest("POST", `/api/pdf-pro/documents/${docId}/jobs/bates`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-pro/matters", selectedMatterId, "documents"] });
      toast({ title: "Bates numbering job queued" });
    },
    onError: () => {
      toast({ title: "Failed to start Bates job", variant: "destructive" });
    },
  });

  const stampMutation = useMutation({
    mutationFn: (docId: string) =>
      apiRequest("POST", `/api/pdf-pro/documents/${docId}/jobs/stamp`, {
        stampType: "confidential",
        placement: "top-right",
        fontSize: 12,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-pro/matters", selectedMatterId, "documents"] });
      toast({ title: "Stamp job queued" });
    },
    onError: () => {
      toast({ title: "Failed to start stamp job", variant: "destructive" });
    },
  });

  const washJobMutation = useMutation({
    mutationFn: ({ docId, policy }: { docId: string; policy: string }) =>
      apiRequest("POST", `/api/pdf-pro/documents/${docId}/jobs/wash`, {
        policy,
        detectionMode: "regex",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-pro/matters", selectedMatterId, "documents"] });
      if (washDocId) {
        queryClient.invalidateQueries({ queryKey: ["/api/pdf-pro/documents", washDocId, "wash-reports"] });
      }
      toast({ title: "Wash job queued" });
    },
    onError: () => {
      toast({ title: "Failed to start wash job", variant: "destructive" });
    },
  });

  const createBatesSetMutation = useMutation({
    mutationFn: (body: typeof batesForm) =>
      apiRequest("POST", `/api/pdf-pro/matters/${selectedMatterId}/bates-sets`, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pdf-pro/matters", selectedMatterId, "bates-sets"] });
      toast({ title: "Bates set created" });
      setBatesForm({ name: "", prefix: "", padding: 6, nextNumber: 1, placement: "bottom-right", fontSize: 10 });
    },
    onError: () => {
      toast({ title: "Failed to create Bates set", variant: "destructive" });
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (!selectedMatterId) {
        toast({ title: "Please select a matter first", variant: "destructive" });
        return;
      }
      const files = Array.from(e.dataTransfer.files);
      const pdfFiles = files.filter((f) => f.type === "application/pdf");
      if (pdfFiles.length === 0) {
        toast({ title: "Only PDF files are accepted", variant: "destructive" });
        return;
      }
      pdfFiles.forEach((file) => uploadMutation.mutate(file));
    },
    [selectedMatterId, uploadMutation, toast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      files.forEach((file) => uploadMutation.mutate(file));
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [uploadMutation]
  );

  const handleDownload = (docId: string) => {
    window.open(`/api/pdf-pro/documents/${docId}/download`, "_blank");
  };

  const openDocDetail = (docId: string) => {
    setSelectedDocId(docId);
    setShowDocDetailDialog(true);
  };

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center flex-wrap gap-3">
        <FileText className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold" data-testid="text-page-title">PDF Pro</h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-base">Matter</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedMatterId} onValueChange={setSelectedMatterId} data-testid="select-matter">
            <SelectTrigger data-testid="select-matter-trigger">
              <SelectValue placeholder="Select a matter..." />
            </SelectTrigger>
            <SelectContent>
              {matters.map((m) => (
                <SelectItem key={m.id} value={m.id} data-testid={`select-matter-${m.id}`}>
                  {m.name} {m.caseNumber ? `(${m.caseNumber})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedMatterId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-list">
            <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
            <TabsTrigger value="productions" data-testid="tab-productions">Productions</TabsTrigger>
            <TabsTrigger value="wash" data-testid="tab-wash">Wash & Export</TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="upload-dropzone"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag & drop PDF files here, or click to browse
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                data-testid="button-browse-files"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Browse Files
              </Button>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Documents</CardTitle>
              </CardHeader>
              <CardContent>
                {docsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-documents">
                    No documents uploaded yet. Upload a PDF to get started.
                  </p>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Filename</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Pages</TableHead>
                          <TableHead>SHA-256</TableHead>
                          <TableHead>OCR</TableHead>
                          <TableHead>Jobs</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => (
                          <TableRow
                            key={doc.id}
                            className="cursor-pointer"
                            onClick={() => openDocDetail(doc.id)}
                            data-testid={`row-doc-${doc.id}`}
                          >
                            <TableCell className="font-medium" data-testid={`text-filename-${doc.id}`}>
                              {doc.originalFilename}
                            </TableCell>
                            <TableCell data-testid={`text-size-${doc.id}`}>
                              {formatFileSize(doc.fileSize)}
                            </TableCell>
                            <TableCell data-testid={`text-pages-${doc.id}`}>
                              {doc.pageCount ?? "-"}
                            </TableCell>
                            <TableCell className="font-mono text-xs" data-testid={`text-hash-${doc.id}`}>
                              {doc.sha256Hash?.substring(0, 12)}...
                            </TableCell>
                            <TableCell data-testid={`text-ocr-${doc.id}`}>
                              {doc.hasOcrText ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />Done
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell data-testid={`text-jobs-${doc.id}`}>
                              {doc.activeJobs > 0 ? (
                                <Badge variant="default">
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  {doc.activeJobs}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground" data-testid={`text-date-${doc.id}`}>
                              {formatDate(doc.createdAt)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleDownload(doc.id)}
                                  data-testid={`button-download-${doc.id}`}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => ocrMutation.mutate(doc.id)}
                                  disabled={ocrMutation.isPending}
                                  data-testid={`button-ocr-${doc.id}`}
                                >
                                  <ScanText className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (batesSets.length > 0) {
                                      const set = batesSets[0];
                                      batesMutation.mutate({
                                        docId: doc.id,
                                        body: {
                                          batesSetId: set.id,
                                          prefix: set.prefix,
                                          padding: set.padding,
                                          startNumber: set.nextNumber,
                                          placement: set.placement,
                                          fontSize: set.fontSize,
                                        },
                                      });
                                    } else {
                                      toast({ title: "Create a Bates set first in Productions tab", variant: "destructive" });
                                    }
                                  }}
                                  disabled={batesMutation.isPending}
                                  data-testid={`button-bates-${doc.id}`}
                                >
                                  <Hash className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => stampMutation.mutate(doc.id)}
                                  disabled={stampMutation.isPending}
                                  data-testid={`button-stamp-${doc.id}`}
                                >
                                  <Stamp className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setWashDocId(doc.id);
                                    setActiveTab("wash");
                                  }}
                                  data-testid={`button-wash-${doc.id}`}
                                >
                                  <Shield className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm("Delete this document? This cannot be undone.")) {
                                      deleteMutation.mutate(doc.id);
                                    }
                                  }}
                                  disabled={deleteMutation.isPending}
                                  data-testid={`button-delete-${doc.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="productions" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Create Bates Set</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="bates-name">Name</Label>
                    <Input
                      id="bates-name"
                      placeholder="e.g. Production Set 1"
                      value={batesForm.name}
                      onChange={(e) => setBatesForm({ ...batesForm, name: e.target.value })}
                      data-testid="input-bates-name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bates-prefix">Prefix</Label>
                    <Input
                      id="bates-prefix"
                      placeholder="e.g. DEF"
                      value={batesForm.prefix}
                      onChange={(e) => setBatesForm({ ...batesForm, prefix: e.target.value })}
                      data-testid="input-bates-prefix"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bates-padding">Padding</Label>
                    <Input
                      id="bates-padding"
                      type="number"
                      min={1}
                      max={12}
                      value={batesForm.padding}
                      onChange={(e) => setBatesForm({ ...batesForm, padding: parseInt(e.target.value) || 6 })}
                      data-testid="input-bates-padding"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bates-start">Start Number</Label>
                    <Input
                      id="bates-start"
                      type="number"
                      min={1}
                      value={batesForm.nextNumber}
                      onChange={(e) => setBatesForm({ ...batesForm, nextNumber: parseInt(e.target.value) || 1 })}
                      data-testid="input-bates-start"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bates-placement">Placement</Label>
                    <Select
                      value={batesForm.placement}
                      onValueChange={(v) => setBatesForm({ ...batesForm, placement: v })}
                    >
                      <SelectTrigger data-testid="select-bates-placement">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="top-center">Top Center</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="bottom-center">Bottom Center</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bates-fontsize">Font Size</Label>
                    <Input
                      id="bates-fontsize"
                      type="number"
                      min={6}
                      max={24}
                      value={batesForm.fontSize}
                      onChange={(e) => setBatesForm({ ...batesForm, fontSize: parseInt(e.target.value) || 10 })}
                      data-testid="input-bates-fontsize"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      if (!batesForm.name || !batesForm.prefix) {
                        toast({ title: "Name and prefix are required", variant: "destructive" });
                        return;
                      }
                      createBatesSetMutation.mutate(batesForm);
                    }}
                    disabled={createBatesSetMutation.isPending}
                    data-testid="button-create-bates-set"
                  >
                    {createBatesSetMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create Bates Set
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bates Sets</CardTitle>
              </CardHeader>
              <CardContent>
                {batesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : batesSets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-bates-sets">
                    No Bates sets created yet.
                  </p>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Prefix</TableHead>
                          <TableHead>Padding</TableHead>
                          <TableHead>Next Number</TableHead>
                          <TableHead>Placement</TableHead>
                          <TableHead>Font Size</TableHead>
                          <TableHead>Ranges</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batesSets.map((set) => (
                          <TableRow key={set.id} data-testid={`row-bates-${set.id}`}>
                            <TableCell className="font-medium" data-testid={`text-bates-name-${set.id}`}>
                              {set.name}
                            </TableCell>
                            <TableCell className="font-mono" data-testid={`text-bates-prefix-${set.id}`}>
                              {set.prefix}
                            </TableCell>
                            <TableCell data-testid={`text-bates-padding-${set.id}`}>{set.padding}</TableCell>
                            <TableCell data-testid={`text-bates-next-${set.id}`}>
                              <Badge variant="outline">
                                {set.prefix}{String(set.nextNumber).padStart(set.padding, "0")}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-bates-placement-${set.id}`}>{set.placement}</TableCell>
                            <TableCell data-testid={`text-bates-fontsize-${set.id}`}>{set.fontSize}pt</TableCell>
                            <TableCell>
                              {set.ranges && set.ranges.length > 0 ? (
                                <div className="space-y-1">
                                  {set.ranges.map((r) => (
                                    <Badge key={r.id} variant="secondary" className="mr-1">
                                      {set.prefix}{String(r.startNumber).padStart(set.padding, "0")} - {set.prefix}{String(r.endNumber).padStart(set.padding, "0")}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(set.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wash" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Run PII Wash</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Document</Label>
                    <Select value={washDocId} onValueChange={setWashDocId}>
                      <SelectTrigger data-testid="select-wash-document">
                        <SelectValue placeholder="Select document..." />
                      </SelectTrigger>
                      <SelectContent>
                        {documents.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>
                            {doc.originalFilename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Wash Policy</Label>
                    <Select value={washPolicy} onValueChange={setWashPolicy}>
                      <SelectTrigger data-testid="select-wash-policy">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="strict">Strict</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => {
                        if (!washDocId) {
                          toast({ title: "Select a document first", variant: "destructive" });
                          return;
                        }
                        washJobMutation.mutate({ docId: washDocId, policy: washPolicy });
                      }}
                      disabled={washJobMutation.isPending || !washDocId}
                      data-testid="button-run-wash"
                    >
                      {washJobMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run Wash
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {washDocId && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Wash Reports</CardTitle>
                </CardHeader>
                <CardContent>
                  {washReportsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : washReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-wash-reports">
                      No wash reports for this document yet.
                    </p>
                  ) : (
                    <div className="overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8"></TableHead>
                            <TableHead>Policy</TableHead>
                            <TableHead>Detection Mode</TableHead>
                            <TableHead>Detections</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {washReports.map((report) => (
                            <>
                              <TableRow
                                key={report.id}
                                className="cursor-pointer"
                                onClick={() =>
                                  setExpandedReportId(
                                    expandedReportId === report.id ? null : report.id
                                  )
                                }
                                data-testid={`row-wash-report-${report.id}`}
                              >
                                <TableCell>
                                  {expandedReportId === report.id ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </TableCell>
                                <TableCell data-testid={`text-report-policy-${report.id}`}>
                                  <Badge variant="outline">{report.policy}</Badge>
                                </TableCell>
                                <TableCell data-testid={`text-report-mode-${report.id}`}>
                                  {report.detectionMode}
                                </TableCell>
                                <TableCell data-testid={`text-report-detections-${report.id}`}>
                                  <Badge variant={report.totalDetections > 0 ? "destructive" : "secondary"}>
                                    {report.totalDetections} found
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {formatDate(report.createdAt)}
                                </TableCell>
                              </TableRow>
                              {expandedReportId === report.id && report.detections && report.detections.length > 0 && (
                                <TableRow key={`${report.id}-details`}>
                                  <TableCell colSpan={5} className="p-0">
                                    <div className="p-4 bg-muted/50">
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Value</TableHead>
                                            <TableHead>Page</TableHead>
                                            <TableHead>Confidence</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {report.detections.map((d, idx) => (
                                            <TableRow key={idx} data-testid={`row-detection-${report.id}-${idx}`}>
                                              <TableCell>
                                                <Badge variant="outline">{d.type}</Badge>
                                              </TableCell>
                                              <TableCell className="font-mono text-xs">
                                                {d.value}
                                              </TableCell>
                                              <TableCell>{d.page}</TableCell>
                                              <TableCell>
                                                {d.confidence != null
                                                  ? `${(d.confidence * 100).toFixed(0)}%`
                                                  : "-"}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {!selectedMatterId && (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground" data-testid="text-select-matter-prompt">
            Select a matter above to manage PDF documents.
          </p>
        </div>
      )}

      <Dialog open={showDocDetailDialog} onOpenChange={setShowDocDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-doc-detail-title">
              {docDetail?.document?.originalFilename || "Document Details"}
            </DialogTitle>
            <DialogDescription>
              View version history, jobs, and metadata.
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : docDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Title:</span>{" "}
                  <span className="font-medium" data-testid="text-detail-title">{docDetail.document.title}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>{" "}
                  <span data-testid="text-detail-size">{formatFileSize(docDetail.document.fileSize)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Pages:</span>{" "}
                  <span data-testid="text-detail-pages">{docDetail.document.pageCount ?? "Unknown"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">SHA-256:</span>{" "}
                  <span className="font-mono text-xs break-all" data-testid="text-detail-hash">{docDetail.document.sha256Hash}</span>
                </div>
              </div>

              {docDetail.versions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Version History</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Version</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docDetail.versions.map((v) => (
                        <TableRow key={v.id} data-testid={`row-version-${v.id}`}>
                          <TableCell>v{v.versionNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{v.jobType}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(v.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => window.open(`/api/pdf-pro/versions/${v.id}/download`, "_blank")}
                              data-testid={`button-download-version-${v.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {docDetail.jobs.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Job History</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {docDetail.jobs.map((j) => (
                        <TableRow key={j.id} data-testid={`row-job-${j.id}`}>
                          <TableCell>
                            <Badge variant="outline">{j.jobType}</Badge>
                          </TableCell>
                          <TableCell>{jobStatusBadge(j.status)}</TableCell>
                          <TableCell>{j.progressPercent}%</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(j.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {docDetail.ocrText && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">OCR Text</h3>
                  <div className="bg-muted/50 rounded-md p-3 max-h-40 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap" data-testid="text-ocr-content">
                      {docDetail.ocrText.text}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
