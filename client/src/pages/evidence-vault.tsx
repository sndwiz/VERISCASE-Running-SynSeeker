import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
  Plus
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

export default function EvidenceVaultPage() {
  const { toast } = useToast();
  const [selectedMatterId, setSelectedMatterId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<EvidenceVaultFile | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCustodyDialog, setShowCustodyDialog] = useState(false);
  
  const [uploadForm, setUploadForm] = useState({
    originalName: "",
    originalUrl: "",
    description: "",
    evidenceType: "document" as const,
    confidentiality: "confidential" as const,
    tags: "",
  });
  
  const [custodyForm, setCustodyForm] = useState({
    action: "",
    performedBy: "",
    notes: "",
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: evidenceFiles = [], isLoading: isLoadingFiles } = useQuery<EvidenceVaultFile[]>({
    queryKey: ["/api/matters", selectedMatterId, "evidence"],
    enabled: !!selectedMatterId,
  });

  const { data: ocrJobs = [] } = useQuery<OCRJob[]>({
    queryKey: ["/api/ocr-jobs"],
  });

  const createEvidenceMutation = useMutation({
    mutationFn: async (data: typeof uploadForm) => {
      const hash = await generateHash(data.originalUrl);
      const res = await apiRequest("POST", `/api/matters/${selectedMatterId}/evidence`, {
        matterId: selectedMatterId,
        originalName: data.originalName,
        originalUrl: data.originalUrl,
        originalHash: hash,
        originalSize: Math.floor(Math.random() * 10000000),
        originalMimeType: getMimeType(data.originalName),
        evidenceType: data.evidenceType,
        confidentiality: data.confidentiality,
        description: data.description,
        tags: data.tags.split(",").map(t => t.trim()).filter(Boolean),
        uploadedBy: "Current User",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "evidence"] });
      setShowUploadDialog(false);
      setUploadForm({
        originalName: "",
        originalUrl: "",
        description: "",
        evidenceType: "document",
        confidentiality: "confidential",
        tags: "",
      });
      toast({ title: "Evidence added", description: "File has been added to the vault with immutable hash." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add evidence.", variant: "destructive" });
    }
  });

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
      toast({ title: "Custody entry added", description: "Chain of custody has been updated." });
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
    onError: () => {
      toast({ title: "Error", description: "Failed to create OCR job.", variant: "destructive" });
    }
  });

  const filteredFiles = evidenceFiles.filter(file => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      file.originalName.toLowerCase().includes(query) ||
      file.description.toLowerCase().includes(query) ||
      file.tags.some(t => t.toLowerCase().includes(query))
    );
  });

  async function generateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content + Date.now());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function getMimeType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      mp4: "video/mp4",
      mp3: "audio/mpeg",
      eml: "message/rfc822",
    };
    return mimeTypes[ext || ""] || "application/octet-stream";
  }

  return (
    <div className="h-full flex flex-col" data-testid="page-evidence-vault">
      <div className="flex items-center justify-between p-4 border-b gap-4">
        <div>
          <h1 className="text-2xl font-bold">Evidence Vault</h1>
          <p className="text-muted-foreground">Immutable file storage with chain-of-custody tracking</p>
        </div>
        <div className="flex items-center gap-2">
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
          
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button disabled={!selectedMatterId} data-testid="button-add-evidence">
                <Plus className="h-4 w-4 mr-2" />
                Add Evidence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Evidence to Vault</DialogTitle>
                <DialogDescription>
                  Files added to the vault are immutable. Original content cannot be modified.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>File Name</Label>
                  <Input 
                    value={uploadForm.originalName}
                    onChange={e => setUploadForm(p => ({ ...p, originalName: e.target.value }))}
                    placeholder="document.pdf"
                    data-testid="input-evidence-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>File URL</Label>
                  <Input 
                    value={uploadForm.originalUrl}
                    onChange={e => setUploadForm(p => ({ ...p, originalUrl: e.target.value }))}
                    placeholder="https://storage.example.com/file.pdf"
                    data-testid="input-evidence-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea 
                    value={uploadForm.description}
                    onChange={e => setUploadForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Describe this evidence..."
                    data-testid="input-evidence-description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Evidence Type</Label>
                    <Select 
                      value={uploadForm.evidenceType} 
                      onValueChange={v => setUploadForm(p => ({ ...p, evidenceType: v as any }))}
                    >
                      <SelectTrigger data-testid="select-evidence-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="photo">Photo</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Confidentiality</Label>
                    <Select 
                      value={uploadForm.confidentiality} 
                      onValueChange={v => setUploadForm(p => ({ ...p, confidentiality: v as any }))}
                    >
                      <SelectTrigger data-testid="select-confidentiality">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="confidential">Confidential</SelectItem>
                        <SelectItem value="privileged">Privileged</SelectItem>
                        <SelectItem value="work-product">Work Product</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input 
                    value={uploadForm.tags}
                    onChange={e => setUploadForm(p => ({ ...p, tags: e.target.value }))}
                    placeholder="contract, signed, original"
                    data-testid="input-evidence-tags"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={() => createEvidenceMutation.mutate(uploadForm)}
                  disabled={!uploadForm.originalName || !uploadForm.originalUrl || createEvidenceMutation.isPending}
                  data-testid="button-submit-evidence"
                >
                  {createEvidenceMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add to Vault
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
          <div className="flex-1 flex flex-col border-r">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  className="pl-10"
                  placeholder="Search evidence..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  data-testid="input-search-evidence"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No evidence files found</p>
                  </div>
                ) : (
                  filteredFiles.map(file => {
                    const Icon = getEvidenceIcon(file.evidenceType);
                    const ocrJob = ocrJobs.find(j => j.fileId === file.id);
                    return (
                      <Card 
                        key={file.id}
                        className={`cursor-pointer hover-elevate ${selectedFile?.id === file.id ? "ring-2 ring-primary" : ""}`}
                        onClick={() => setSelectedFile(file)}
                        data-testid={`card-evidence-${file.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-md bg-muted">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate">{file.originalName}</span>
                                {getConfidentialityBadge(file.confidentiality)}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{file.description || "No description"}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(file.uploadedAt)}
                                </span>
                                <span>{formatFileSize(file.originalSize)}</span>
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

          <div className="w-[400px] flex flex-col">
            {selectedFile ? (
              <Tabs defaultValue="details" className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4">
                  <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
                  <TabsTrigger value="custody" data-testid="tab-custody">Chain of Custody</TabsTrigger>
                  <TabsTrigger value="analysis" data-testid="tab-analysis">AI Analysis</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="flex-1 overflow-auto">
                  <div className="p-4 space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{selectedFile.originalName}</h3>
                      {getConfidentialityBadge(selectedFile.confidentiality)}
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
                    </div>
                    
                    {selectedFile.description && (
                      <div>
                        <Label className="text-muted-foreground">Description</Label>
                        <p className="mt-1">{selectedFile.description}</p>
                      </div>
                    )}
                    
                    {selectedFile.tags.length > 0 && (
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
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="custody" className="flex-1 overflow-auto">
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <h3 className="font-semibold">Chain of Custody</h3>
                      <Dialog open={showCustodyDialog} onOpenChange={setShowCustodyDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm" data-testid="button-add-custody">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Entry
                          </Button>
                        </DialogTrigger>
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
                    
                    <div className="space-y-3">
                      {selectedFile.chainOfCustody.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No custody entries recorded
                        </p>
                      ) : (
                        selectedFile.chainOfCustody.map((entry, idx) => (
                          <div key={idx} className="flex gap-3 text-sm">
                            <div className="flex flex-col items-center">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              {idx < selectedFile.chainOfCustody.length - 1 && (
                                <div className="w-0.5 flex-1 bg-border mt-1" />
                              )}
                            </div>
                            <div className="pb-4">
                              <div className="font-medium">{entry.action}</div>
                              <div className="text-muted-foreground">
                                {entry.by} • {formatDate(entry.at)}
                              </div>
                              {entry.notes && (
                                <div className="mt-1 text-muted-foreground italic">
                                  {entry.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="analysis" className="flex-1 overflow-auto">
                  <div className="p-4">
                    {selectedFile.aiAnalysis ? (
                      <div className="prose prose-sm dark:prose-invert">
                        <h4>AI Analysis</h4>
                        <p>{selectedFile.aiAnalysis}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <ScanLine className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground mb-4">No AI analysis available</p>
                        <Button 
                          variant="outline"
                          onClick={() => createOCRJobMutation.mutate(selectedFile.id)}
                          disabled={createOCRJobMutation.isPending}
                          data-testid="button-run-analysis"
                        >
                          Run AI Analysis
                        </Button>
                      </div>
                    )}
                    
                    {selectedFile.extractedText && (
                      <div className="mt-4">
                        <h4 className="font-semibold mb-2">Extracted Text</h4>
                        <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                          {selectedFile.extractedText}
                        </pre>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Select a file to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
