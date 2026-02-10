import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  FileText, 
  FolderOpen,
  Folder,
  Search,
  Plus,
  Filter,
  SortAsc,
  Eye,
  Lock,
  Shield,
  FileSearch,
  Calendar,
  User,
  Tag,
  MoreVertical,
  Trash2,
  Edit,
  Download,
  ChevronRight,
  ChevronDown,
  Gavel,
  Scale,
  Mail,
  FileQuestion,
  FileCheck,
  Briefcase,
  FolderLock,
  Upload,
  Loader2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DOC_CATEGORIES, docTypesByCategory, CONFIDENTIALITY_LEVELS, DOC_PARTIES, DOC_ROLES } from "@shared/schema";
import type { FileItemWithProfile, DocCategory, ConfidentialityLevel, DocParty, DocRole } from "@shared/schema";
import type { Matter } from "@/types/matters";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FilingTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

const categoryIcons: Record<DocCategory, typeof FileText> = {
  "pleading": Gavel,
  "motion": Scale,
  "discovery": FileSearch,
  "order-ruling": FileCheck,
  "correspondence": Mail,
  "evidence-records": Eye,
  "internal-work-product": FolderLock,
  "admin-operations": Briefcase,
};

function getCategoryIcon(category: DocCategory) {
  return categoryIcons[category] || FileQuestion;
}

function getConfidentialityBadge(level: ConfidentialityLevel) {
  switch (level) {
    case "public":
      return <Badge variant="secondary" data-testid="badge-conf-public"><Eye className="h-3 w-3 mr-1" />Public</Badge>;
    case "confidential":
      return <Badge variant="default" data-testid="badge-conf-confidential"><Lock className="h-3 w-3 mr-1" />Confidential</Badge>;
    case "aeo":
      return <Badge variant="destructive" data-testid="badge-conf-aeo"><Shield className="h-3 w-3 mr-1" />AEO</Badge>;
    case "privileged":
      return <Badge variant="destructive" data-testid="badge-conf-privileged"><Shield className="h-3 w-3 mr-1" />Privileged</Badge>;
    case "work-product":
      return <Badge variant="outline" data-testid="badge-conf-work-product"><FileSearch className="h-3 w-3 mr-1" />Work Product</Badge>;
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

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface BatchUploadResult {
  total: number;
  successCount: number;
  failedCount: number;
  files: any[];
  errors: { index: number; error: string }[];
}

export default function FilingCabinetPage() {
  const { toast } = useToast();
  const [selectedMatterId, setSelectedMatterId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | "all">("all");
  const [selectedFile, setSelectedFile] = useState<FileItemWithProfile | null>(null);
  const [showAddFileDialog, setShowAddFileDialog] = useState(false);
  const [showClassifyDialog, setShowClassifyDialog] = useState(false);
  const [showBatchUploadDialog, setShowBatchUploadDialog] = useState(false);
  const [batchUploadText, setBatchUploadText] = useState("");
  const [batchUploadResult, setBatchUploadResult] = useState<BatchUploadResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [addFileForm, setAddFileForm] = useState({
    serverPath: "",
    fileName: "",
    extension: "",
    confidentiality: "confidential" as ConfidentialityLevel,
  });

  const [classifyForm, setClassifyForm] = useState<{
    docCategory: DocCategory;
    docType: string;
    docRole: DocRole;
    captionTitle: string;
    party: DocParty | "";
    filingDate: string;
    docketNumber: string;
  }>({
    docCategory: "pleading",
    docType: "Complaint/Petition",
    docRole: "primary",
    captionTitle: "",
    party: "",
    filingDate: "",
    docketNumber: "",
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: files = [], isLoading } = useQuery<FileItemWithProfile[]>({
    queryKey: ["/api/matters", selectedMatterId, "files"],
    enabled: !!selectedMatterId,
  });

  const { data: tags = [] } = useQuery<FilingTag[]>({
    queryKey: ["/api/filing-tags"],
  });

  const createFileMutation = useMutation({
    mutationFn: (data: typeof addFileForm) =>
      apiRequest("POST", `/api/matters/${selectedMatterId}/files`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "files"] });
      toast({ title: "File added successfully" });
      setShowAddFileDialog(false);
      setAddFileForm({ serverPath: "", fileName: "", extension: "", confidentiality: "confidential" });
    },
    onError: () => {
      toast({ title: "Failed to add file", variant: "destructive" });
    },
  });

  const batchUploadMutation = useMutation({
    mutationFn: async (files: { fileName: string; extension: string; serverPath?: string; confidentiality: ConfidentialityLevel }[]) => {
      const res = await apiRequest("POST", `/api/matters/${selectedMatterId}/files/batch`, { files });
      return res.json();
    },
    onSuccess: (result: BatchUploadResult) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "files"] });
      setBatchUploadResult(result);
      if (result.failedCount === 0) {
        toast({ title: `Successfully uploaded ${result.successCount} files` });
      } else {
        toast({ 
          title: `Uploaded ${result.successCount} of ${result.total} files`,
          description: `${result.failedCount} files failed`,
          variant: "destructive"
        });
      }
    },
    onError: () => {
      toast({ title: "Failed to batch upload files", variant: "destructive" });
    },
  });

  const handleBatchUpload = useCallback(() => {
    if (!selectedMatterId) {
      toast({ title: "Please select a matter first", variant: "destructive" });
      return;
    }
    
    const lines = batchUploadText.split("\n").filter(line => line.trim());
    const files = lines.map(line => {
      const parts = line.split(/[,\t]/).map(p => p.trim());
      const fileName = parts[0] || "";
      const extension = fileName.split(".").pop() || "";
      return {
        fileName,
        extension,
        serverPath: parts[1] || `/matters/${selectedMatterId}/files/`,
        confidentiality: "confidential" as ConfidentialityLevel,
      };
    }).filter(f => f.fileName);
    
    if (files.length === 0) {
      toast({ title: "No valid files to upload", variant: "destructive" });
      return;
    }
    
    if (files.length > 100) {
      toast({ 
        title: "Too many files", 
        description: "Maximum 100 files per batch. Please split into multiple uploads.",
        variant: "destructive" 
      });
      return;
    }
    
    batchUploadMutation.mutate(files);
  }, [batchUploadText, selectedMatterId, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    
    const fileEntries = droppedFiles.map(f => f.name).join("\n");
    setBatchUploadText(prev => prev ? prev + "\n" + fileEntries : fileEntries);
    setShowBatchUploadDialog(true);
  }, []);

  const createProfileMutation = useMutation({
    mutationFn: (data: { fileId: string; profile: typeof classifyForm }) =>
      apiRequest("POST", `/api/files/${data.fileId}/profile`, data.profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "files"] });
      toast({ title: "Document classified successfully" });
      setShowClassifyDialog(false);
      setSelectedFile(null);
    },
    onError: () => {
      toast({ title: "Failed to classify document", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { fileId: string; profile: Partial<typeof classifyForm> }) =>
      apiRequest("PATCH", `/api/files/${data.fileId}/profile`, data.profile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "files"] });
      toast({ title: "Document updated successfully" });
      setShowClassifyDialog(false);
      setSelectedFile(null);
    },
    onError: () => {
      toast({ title: "Failed to update document", variant: "destructive" });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatterId, "files"] });
      toast({ title: "File deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete file", variant: "destructive" });
    },
  });

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.profile?.captionTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.profile?.docketNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || file.profile?.docCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filesByCategory = DOC_CATEGORIES.reduce((acc, category) => {
    acc[category] = filteredFiles.filter(f => f.profile?.docCategory === category);
    return acc;
  }, {} as Record<DocCategory, FileItemWithProfile[]>);

  const unclassifiedFiles = filteredFiles.filter(f => !f.profile);

  const handleClassify = (file: FileItemWithProfile) => {
    setSelectedFile(file);
    if (file.profile) {
      setClassifyForm({
        docCategory: file.profile.docCategory,
        docType: file.profile.docType,
        docRole: file.profile.docRole || "primary",
        captionTitle: file.profile.captionTitle || "",
        party: file.profile.party as DocParty || "",
        filingDate: file.profile.filingDate || "",
        docketNumber: file.profile.docketNumber || "",
      });
    } else {
      setClassifyForm({
        docCategory: "pleading",
        docType: "Complaint/Petition",
        docRole: "primary",
        captionTitle: "",
        party: "",
        filingDate: "",
        docketNumber: "",
      });
    }
    setShowClassifyDialog(true);
  };

  const handleSaveClassification = () => {
    if (!selectedFile) return;
    if (selectedFile.profile) {
      updateProfileMutation.mutate({ fileId: selectedFile.id, profile: classifyForm });
    } else {
      createProfileMutation.mutate({ fileId: selectedFile.id, profile: classifyForm });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Filing Cabinet</h1>
          <p className="text-muted-foreground">Organize and classify legal documents</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMatterId} onValueChange={setSelectedMatterId}>
            <SelectTrigger className="w-[250px]" data-testid="select-matter">
              <SelectValue placeholder="Select a matter" />
            </SelectTrigger>
            <SelectContent>
              {matters.map((matter) => (
                <SelectItem key={matter.id} value={matter.id} data-testid={`select-item-matter-${matter.id}`}>
                  {matter.caseNumber} - {matter.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedMatterId && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowBatchUploadDialog(true)} 
                    data-testid="button-batch-upload"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Batch Upload
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Upload multiple files at once</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setShowAddFileDialog(true)} data-testid="button-add-file">
                    <Plus className="h-4 w-4 mr-2" />
                    Add File
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add a single file</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {!selectedMatterId ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center py-12">
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Select a Matter</h2>
            <p className="text-muted-foreground">Choose a matter above to view and organize its documents</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 flex gap-4 min-h-0">
          <Card className="w-64 shrink-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-1">
                  <Button
                    variant={selectedCategory === "all" ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => setSelectedCategory("all")}
                    data-testid="button-category-all"
                  >
                    <FolderOpen className="h-4 w-4" />
                    All Documents
                    <Badge variant="outline" className="ml-auto">{filteredFiles.length}</Badge>
                  </Button>
                  {DOC_CATEGORIES.map((category) => {
                    const Icon = getCategoryIcon(category);
                    const count = filesByCategory[category].length;
                    return (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2"
                        onClick={() => setSelectedCategory(category)}
                        data-testid={`button-category-${category}`}
                      >
                        <Icon className="h-4 w-4" />
                        {category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")}
                        <Badge variant="outline" className="ml-auto">{count}</Badge>
                      </Button>
                    );
                  })}
                  {unclassifiedFiles.length > 0 && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-amber-600"
                      onClick={() => setSelectedCategory("all")}
                      data-testid="button-category-unclassified"
                    >
                      <FileQuestion className="h-4 w-4" />
                      Unclassified
                      <Badge variant="outline" className="ml-auto">{unclassifiedFiles.length}</Badge>
                    </Button>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2 shrink-0">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-sm font-medium">
                  {selectedCategory === "all" ? "All Documents" : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1).replace("-", " ")}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                      data-testid="input-search-files"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
              <ScrollArea className="h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No documents found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredFiles.map((file) => {
                      const Icon = file.profile ? getCategoryIcon(file.profile.docCategory) : FileQuestion;
                      return (
                        <div
                          key={file.id}
                          className="flex items-center gap-4 p-4 hover-elevate cursor-pointer"
                          onClick={() => handleClassify(file)}
                          data-testid={`row-file-${file.id}`}
                        >
                          <div className="shrink-0">
                            <Icon className="h-8 w-8 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate" data-testid={`text-filename-${file.id}`}>
                                {file.profile?.captionTitle || file.fileName}
                              </span>
                              {!file.profile && (
                                <Badge variant="outline" className="text-amber-600 border-amber-600">
                                  Unclassified
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {file.fileName}
                              </span>
                              {file.profile?.docType && (
                                <span className="capitalize">{file.profile.docType.replace("-", " ")}</span>
                              )}
                              {file.profile?.filingDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(file.profile.filingDate)}
                                </span>
                              )}
                              <span>{formatFileSize(file.sizeBytes)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {getConfidentialityBadge(file.confidentiality)}
                            {file.tags && file.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                {file.tags.slice(0, 2).map((tag) => (
                                  <Badge
                                    key={tag.id}
                                    variant="outline"
                                    style={{ borderColor: tag.color, color: tag.color }}
                                  >
                                    {tag.name}
                                  </Badge>
                                ))}
                                {file.tags.length > 2 && (
                                  <Badge variant="outline">+{file.tags.length - 2}</Badge>
                                )}
                              </div>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} data-testid={`button-file-menu-${file.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleClassify(file); }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Classify
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={(e) => { e.stopPropagation(); deleteFileMutation.mutate(file.id); }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={showAddFileDialog} onOpenChange={setShowAddFileDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New File</DialogTitle>
            <DialogDescription>Add a file reference to this matter</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">File Name</Label>
              <Input
                id="fileName"
                value={addFileForm.fileName}
                onChange={(e) => setAddFileForm({ ...addFileForm, fileName: e.target.value })}
                placeholder="e.g., Complaint.pdf"
                data-testid="input-add-filename"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serverPath">Server Path</Label>
              <Input
                id="serverPath"
                value={addFileForm.serverPath}
                onChange={(e) => setAddFileForm({ ...addFileForm, serverPath: e.target.value })}
                placeholder="e.g., /matters/2024-001/pleadings/"
                data-testid="input-add-server-path"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extension">File Extension</Label>
              <Input
                id="extension"
                value={addFileForm.extension}
                onChange={(e) => setAddFileForm({ ...addFileForm, extension: e.target.value })}
                placeholder="e.g., pdf"
                data-testid="input-add-extension"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confidentiality">Confidentiality</Label>
              <Select 
                value={addFileForm.confidentiality} 
                onValueChange={(v) => setAddFileForm({ ...addFileForm, confidentiality: v as ConfidentialityLevel })}
              >
                <SelectTrigger data-testid="select-add-confidentiality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONFIDENTIALITY_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFileDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => createFileMutation.mutate(addFileForm)}
              disabled={!addFileForm.fileName || !addFileForm.serverPath}
              data-testid="button-submit-add-file"
            >
              Add File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClassifyDialog} onOpenChange={setShowClassifyDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Classify Document</DialogTitle>
            <DialogDescription>
              {selectedFile?.fileName} - Set document type and metadata
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="type" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="type" className="flex-1">Document Type</TabsTrigger>
              <TabsTrigger value="metadata" className="flex-1">Metadata</TabsTrigger>
            </TabsList>
            <TabsContent value="type" className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={classifyForm.docCategory} 
                    onValueChange={(v) => {
                      const category = v as DocCategory;
                      const types = docTypesByCategory[category];
                      setClassifyForm({ 
                        ...classifyForm, 
                        docCategory: category,
                        docType: types[0]
                      });
                    }}
                  >
                    <SelectTrigger data-testid="select-doc-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select 
                    value={classifyForm.docType} 
                    onValueChange={(v) => setClassifyForm({ ...classifyForm, docType: v })}
                  >
                    <SelectTrigger data-testid="select-doc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {docTypesByCategory[classifyForm.docCategory].map((type: string) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Document Role</Label>
                  <Select 
                    value={classifyForm.docRole} 
                    onValueChange={(v) => setClassifyForm({ ...classifyForm, docRole: v as DocRole })}
                  >
                    <SelectTrigger data-testid="select-doc-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Party</Label>
                  <Select 
                    value={classifyForm.party} 
                    onValueChange={(v) => setClassifyForm({ ...classifyForm, party: v as DocParty })}
                  >
                    <SelectTrigger data-testid="select-doc-party">
                      <SelectValue placeholder="Select party..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DOC_PARTIES.map((party) => (
                        <SelectItem key={party} value={party}>
                          {party.charAt(0).toUpperCase() + party.slice(1).replace("-", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="metadata" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Caption / Title</Label>
                <Input
                  value={classifyForm.captionTitle}
                  onChange={(e) => setClassifyForm({ ...classifyForm, captionTitle: e.target.value })}
                  placeholder="e.g., Complaint for Breach of Contract"
                  data-testid="input-caption-title"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Filing Date</Label>
                  <Input
                    type="date"
                    value={classifyForm.filingDate}
                    onChange={(e) => setClassifyForm({ ...classifyForm, filingDate: e.target.value })}
                    data-testid="input-filing-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Docket Number</Label>
                  <Input
                    value={classifyForm.docketNumber}
                    onChange={(e) => setClassifyForm({ ...classifyForm, docketNumber: e.target.value })}
                    placeholder="e.g., ECF No. 1"
                    data-testid="input-docket-number"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClassifyDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleSaveClassification}
              data-testid="button-save-classification"
            >
              Save Classification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBatchUploadDialog} onOpenChange={(open) => {
        setShowBatchUploadDialog(open);
        if (!open) {
          setBatchUploadResult(null);
          setBatchUploadText("");
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Batch Upload Files
            </DialogTitle>
            <DialogDescription>
              Upload multiple files at once. Enter one file per line, or drag and drop files onto this dialog.
            </DialogDescription>
          </DialogHeader>
          
          <div
            className={`space-y-4 ${isDragging ? "opacity-50" : ""}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop files here, or enter file names below
              </p>
            </div>

            <div className="space-y-2">
              <Label>File List (one per line)</Label>
              <Textarea
                value={batchUploadText}
                onChange={(e) => setBatchUploadText(e.target.value)}
                placeholder={`Enter file names, one per line:\nDocument1.pdf\nMotion.docx\nExhibit-A.pdf`}
                className="min-h-[150px] font-mono text-sm"
                data-testid="textarea-batch-files"
              />
              <p className="text-xs text-muted-foreground">
                Format: filename[,server_path] - Optional path separated by comma or tab
              </p>
            </div>

            {batchUploadText && (() => {
              const fileCount = batchUploadText.split("\n").filter(l => l.trim()).length;
              const isOverLimit = fileCount > 100;
              return (
                <div className={`text-sm ${isOverLimit ? "text-red-600" : "text-muted-foreground"}`}>
                  {fileCount} files ready to upload
                  {isOverLimit && " (exceeds 100 file limit)"}
                </div>
              );
            })()}

            {batchUploadResult && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>{batchUploadResult.successCount} uploaded</span>
                    </div>
                    {batchUploadResult.failedCount > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span>{batchUploadResult.failedCount} failed</span>
                      </div>
                    )}
                  </div>
                  {batchUploadResult.errors.length > 0 && (
                    <div className="text-sm text-red-600">
                      <p className="font-medium mb-1">Errors:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {batchUploadResult.errors.slice(0, 5).map((err, idx) => (
                          <li key={idx}>Line {err.index + 1}: {err.error}</li>
                        ))}
                        {batchUploadResult.errors.length > 5 && (
                          <li>...and {batchUploadResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchUploadDialog(false)}>
              {batchUploadResult ? "Close" : "Cancel"}
            </Button>
            {!batchUploadResult && (
              <Button 
                onClick={handleBatchUpload}
                disabled={!batchUploadText.trim() || batchUploadMutation.isPending}
                data-testid="button-submit-batch-upload"
              >
                {batchUploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
