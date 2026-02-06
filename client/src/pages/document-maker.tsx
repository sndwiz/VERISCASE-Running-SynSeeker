import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  FileText,
  FilePlus2,
  Scale,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Wand2,
  Download,
  Eye,
  Edit,
  Send,
  Loader2,
  AlertTriangle,
  FileCheck,
  History,
  Gavel,
} from "lucide-react";
import type { DocumentTemplate, GeneratedDocument, DocumentApproval } from "@shared/schema";

const TEMPLATE_CATEGORIES = [
  { value: "all", label: "All Templates" },
  { value: "motions", label: "Motions" },
  { value: "pleadings", label: "Pleadings" },
  { value: "discovery", label: "Discovery" },
  { value: "torts", label: "Torts" },
  { value: "court-filings", label: "Court Filings" },
  { value: "client-forms", label: "Client Forms" },
  { value: "correspondence", label: "Correspondence" },
];

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  draft: { label: "Draft", icon: FileText, color: "bg-gray-500" },
  "ai-generated": { label: "AI Generated", icon: Wand2, color: "bg-purple-500" },
  "pending-review": { label: "Pending Review", icon: Clock, color: "bg-yellow-500" },
  "under-review": { label: "Under Review", icon: Eye, color: "bg-blue-500" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-500" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-500" },
  "revision-requested": { label: "Revision Requested", icon: Edit, color: "bg-orange-500" },
  finalized: { label: "Finalized", icon: FileCheck, color: "bg-teal-500" },
};

export default function DocumentMakerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<GeneratedDocument | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [aiInstructions, setAiInstructions] = useState("");
  const [activeTab, setActiveTab] = useState("templates");

  const { data: templates = [], isLoading: templatesLoading } = useQuery<DocumentTemplate[]>({
    queryKey: ["/api/documents/templates"],
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<GeneratedDocument[]>({
    queryKey: ["/api/documents/documents"],
  });

  const { data: approvals = [] } = useQuery<DocumentApproval[]>({
    queryKey: ["/api/documents/approvals"],
  });

  const generateDocumentMutation = useMutation({
    mutationFn: async (data: { templateId: string; fieldValues: Record<string, string>; aiInstructions: string }) => {
      const response = await apiRequest("POST", "/api/documents/generate", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents/documents"] });
      toast({ title: "Document generated successfully" });
      setShowGenerateDialog(false);
      setSelectedTemplate(null);
      setFieldValues({});
      setAiInstructions("");
      setActiveTab("documents");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate document",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const submitForApprovalMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await apiRequest("POST", "/api/documents/approvals", { documentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/approvals"] });
      toast({ title: "Document submitted for review" });
    },
    onError: () => {
      toast({ title: "Failed to submit for review", variant: "destructive" });
    },
  });

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    const initialValues: Record<string, string> = {};
    template.requiredFields.forEach((field) => {
      initialValues[field.name] = "";
    });
    setFieldValues(initialValues);
    setShowGenerateDialog(true);
  };

  const handleGenerateDocument = () => {
    if (!selectedTemplate) return;

    const missingFields = selectedTemplate.requiredFields
      .filter((f) => f.required && !fieldValues[f.name])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      toast({
        title: "Missing required fields",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    generateDocumentMutation.mutate({
      templateId: selectedTemplate.id,
      fieldValues,
      aiInstructions,
    });
  };

  const handleViewDocument = (doc: GeneratedDocument) => {
    setSelectedDocument(doc);
    setShowPreviewDialog(true);
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getApprovalForDocument = (docId: string) => {
    return approvals.find((a) => a.documentId === docId);
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <FilePlus2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              Document & Form Maker
            </h1>
            <p className="text-muted-foreground">
              AI-powered Utah legal document generation with lawyer approval workflow
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 px-3 py-1">
          <Scale className="h-3 w-3" />
          URCP Compliant
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="templates" className="gap-1" data-testid="tab-templates">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1" data-testid="tab-documents">
            <FilePlus2 className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1" data-testid="tab-approvals">
            <Gavel className="h-4 w-4" />
            Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>Utah Legal Templates</CardTitle>
                  <CardDescription>
                    Select a template to generate a new document with AI assistance
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[200px]"
                      data-testid="input-search-templates"
                    />
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-[160px]" data-testid="select-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No templates found matching your criteria</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer transition-shadow hover-elevate"
                      onClick={() => handleSelectTemplate(template)}
                      data-testid={`card-template-${template.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {template.category}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {template.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1">
                          {template.utahRuleReferences?.slice(0, 2).map((rule) => (
                            <Badge key={rule} variant="outline" className="text-xs">
                              {rule}
                            </Badge>
                          ))}
                          {(template.utahRuleReferences?.length || 0) > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(template.utahRuleReferences?.length || 0) - 2}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Documents</CardTitle>
              <CardDescription>View and manage your AI-generated legal documents</CardDescription>
            </CardHeader>
            <CardContent>
              {documentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FilePlus2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No documents generated yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab("templates")}
                  >
                    Create your first document
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => {
                    const approval = getApprovalForDocument(doc.id);
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                        data-testid={`row-document-${doc.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{doc.documentType}</span>
                              <span>-</span>
                              <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(doc.status)}
                          {doc.formatCompliance && !doc.formatCompliance.isCompliant && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Format Issues
                            </Badge>
                          )}
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleViewDocument(doc)}
                              data-testid={`button-view-${doc.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(doc.status === "draft" || doc.status === "ai-generated") && !approval && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => submitForApprovalMutation.mutate(doc.id)}
                                disabled={submitForApprovalMutation.isPending}
                                data-testid={`button-submit-review-${doc.id}`}
                              >
                                <Send className="h-3 w-3" />
                                Submit for Review
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval Queue</CardTitle>
              <CardDescription>
                Documents pending lawyer review and approval with initialing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Gavel className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No documents pending approval</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {approvals.map((approval) => {
                    const doc = documents.find((d) => d.id === approval.documentId);
                    return (
                      <div
                        key={approval.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                        data-testid={`row-approval-${approval.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                              approval.status === "approved"
                                ? "bg-green-100 dark:bg-green-900"
                                : approval.status === "rejected"
                                  ? "bg-red-100 dark:bg-red-900"
                                  : "bg-yellow-100 dark:bg-yellow-900"
                            }`}
                          >
                            {approval.status === "approved" ? (
                              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                            ) : approval.status === "rejected" ? (
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{doc?.title || "Document"}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Assigned to: {approval.assignedReviewerName || "Unassigned"}</span>
                              {approval.lawyerInitials && (
                                <>
                                  <span>-</span>
                                  <Badge variant="outline" className="text-xs">
                                    Initialed: {approval.lawyerInitials}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStatusBadge(approval.status)}
                          <Button
                            size="icon"
                            variant="ghost"
                            data-testid={`button-view-audit-${approval.id}`}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              Generate: {selectedTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              Fill in the required fields and AI will generate a Utah-compliant legal document
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              {selectedTemplate?.requiredFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.name}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {field.type === "select" && field.options ? (
                    <Select
                      value={fieldValues[field.name] || ""}
                      onValueChange={(value) =>
                        setFieldValues((prev) => ({ ...prev, [field.name]: value }))
                      }
                    >
                      <SelectTrigger data-testid={`select-${field.name}`}>
                        <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === "textarea" ? (
                    <Textarea
                      id={field.name}
                      value={fieldValues[field.name] || ""}
                      onChange={(e) =>
                        setFieldValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      data-testid={`input-${field.name}`}
                    />
                  ) : field.type === "date" ? (
                    <Input
                      id={field.name}
                      type="date"
                      value={fieldValues[field.name] || ""}
                      onChange={(e) =>
                        setFieldValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }
                      data-testid={`input-${field.name}`}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      value={fieldValues[field.name] || ""}
                      onChange={(e) =>
                        setFieldValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      data-testid={`input-${field.name}`}
                    />
                  )}
                </div>
              ))}

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label htmlFor="aiInstructions">Additional AI Instructions (Optional)</Label>
                <Textarea
                  id="aiInstructions"
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  placeholder="Provide any specific instructions for the AI, such as tone, specific details to include, or legal arguments to emphasize..."
                  className="min-h-[100px]"
                  data-testid="input-ai-instructions"
                />
              </div>

              {selectedTemplate?.bilingualNoticeRequired && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <p className="text-sm text-muted-foreground">
                    This document requires a bilingual (English/Spanish) notice per Utah court rules
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateDocument}
              disabled={generateDocumentMutation.isPending}
              className="gap-1"
              data-testid="button-generate-document"
            >
              {generateDocumentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Generate Document
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.title}</DialogTitle>
            <DialogDescription>
              Generated on {selectedDocument?.createdAt && new Date(selectedDocument.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 py-4">
              <div className="flex flex-wrap gap-2">
                {selectedDocument && getStatusBadge(selectedDocument.status)}
                {selectedDocument?.formatCompliance?.isCompliant ? (
                  <Badge variant="outline" className="gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Format Compliant
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-yellow-600">
                    <AlertTriangle className="h-3 w-3" />
                    Review Format
                  </Badge>
                )}
              </div>

              <Separator />

              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap bg-muted p-4 rounded-lg text-sm font-mono">
                  {selectedDocument?.content}
                </pre>
              </div>

              {selectedDocument?.formatCompliance?.checks && (
                <div className="space-y-2">
                  <h4 className="font-medium">Format Compliance Checks</h4>
                  <div className="space-y-1">
                    {selectedDocument.formatCompliance.checks.map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        {check.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span>{check.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button className="gap-1" data-testid="button-download-document">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
