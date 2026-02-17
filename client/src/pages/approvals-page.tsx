import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, Clock, AlertCircle, MessageSquare,
  FileText, Plus, Send, Filter, Eye, Pencil, RotateCcw,
  FileSearch, Mail, FilePlus, AlertTriangle, Folder, ChevronDown, ChevronRight,
  Stamp
} from "lucide-react";
import type {
  ApprovalRequest, ApprovalStatus, ApprovalType, ApprovalInitial,
  Priority, FileItem, Matter
} from "@shared/schema";

const typeConfig: Record<ApprovalType, { label: string; icon: any; color: string }> = {
  ocr_scan: { label: "OCR Scan", icon: FileSearch, color: "bg-purple-500" },
  case_update: { label: "Case Update", icon: AlertTriangle, color: "bg-amber-500" },
  document_draft: { label: "Document Draft", icon: FilePlus, color: "bg-blue-500" },
  email_incoming: { label: "Email / Motion", icon: Mail, color: "bg-teal-500" },
  template_generated: { label: "Template", icon: FileText, color: "bg-indigo-500" },
  general: { label: "General", icon: Folder, color: "bg-gray-500" },
};

const statusConfig: Record<ApprovalStatus, { label: string; icon: any; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-amber-500" },
  vetting: { label: "Vetting", icon: Eye, color: "bg-blue-500" },
  approved: { label: "Approved", icon: CheckCircle2, color: "bg-green-500" },
  confirmed: { label: "Confirmed", icon: Stamp, color: "bg-emerald-600" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-500" },
  "needs-revision": { label: "Needs Revision", icon: RotateCcw, color: "bg-orange-500" },
};

const priorityColors: Record<Priority, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const INITIAL_FIELDS = [
  { id: "content_reviewed", label: "Content reviewed" },
  { id: "facts_verified", label: "Facts verified" },
  { id: "legal_accuracy", label: "Legal accuracy" },
  { id: "formatting_ok", label: "Formatting acceptable" },
];

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [revisionNotes, setRevisionNotes] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [formData, setFormData] = useState({
    fileId: "",
    matterId: "",
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium" as Priority,
    type: "general" as ApprovalType,
  });

  const { data: approvals = [], isLoading } = useQuery<ApprovalRequest[]>({
    queryKey: ["/api/approvals"],
    refetchInterval: 15000,
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: allFiles = [] } = useQuery<FileItem[]>({
    queryKey: ["/api/files"],
    queryFn: async () => {
      const res = await fetch("/api/matters");
      const mattersData = await res.json();
      const filesPromises = mattersData.map((m: Matter) =>
        fetch(`/api/matters/${m.id}/files`).then(r => r.json())
      );
      const filesArrays = await Promise.all(filesPromises);
      return filesArrays.flat();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/approvals", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Approval request created" });
    },
    onError: () => toast({ title: "Failed to create request", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/approvals/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ approvalId, content, decision }: { approvalId: string; content: string; decision?: string }) =>
      apiRequest("POST", `/api/approvals/${approvalId}/comments`, { content, decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setCommentText("");
      setRevisionNotes("");
    },
  });

  const initialMutation = useMutation({
    mutationFn: async ({ id, field }: { id: string; field: string }) =>
      apiRequest("POST", `/api/approvals/${id}/initials`, { field }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
    },
  });

  const resetForm = () => {
    setFormData({ fileId: "", matterId: "", title: "", description: "", assignedTo: "", dueDate: "", priority: "medium", type: "general" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      assignedTo: formData.assignedTo.split(",").map(a => a.trim()).filter(Boolean),
      dueDate: formData.dueDate || undefined,
      requestedBy: "current-user",
      requestedByName: "Current User",
    });
  };

  const handleQuickApprove = useCallback((approval: ApprovalRequest) => {
    commentMutation.mutate({
      approvalId: approval.id,
      content: "Approved after review.",
      decision: "approved",
    });
    toast({ title: "Approved" });
  }, [commentMutation, toast]);

  const handleSendBack = useCallback((approvalId: string) => {
    if (!revisionNotes.trim()) {
      toast({ title: "Please provide revision notes", variant: "destructive" });
      return;
    }
    updateMutation.mutate({ id: approvalId, data: { revisionNotes, status: "needs-revision" } });
    commentMutation.mutate({
      approvalId,
      content: revisionNotes,
      decision: "needs-revision",
    });
    toast({ title: "Sent back for revision" });
    setRevisionNotes("");
  }, [revisionNotes, updateMutation, commentMutation, toast]);

  const handleReject = useCallback((approvalId: string) => {
    if (!commentText.trim()) {
      toast({ title: "Please add a reason for rejection", variant: "destructive" });
      return;
    }
    commentMutation.mutate({ approvalId, content: commentText, decision: "rejected" });
    toast({ title: "Rejected" });
    setCommentText("");
  }, [commentText, commentMutation, toast]);

  const handleSaveEdits = useCallback((approvalId: string) => {
    updateMutation.mutate({ id: approvalId, data: { description: editDescription } as any });
    commentMutation.mutate({ approvalId, content: "Description updated during review.", decision: "vetting" });
    setEditMode(false);
    toast({ title: "Edits saved" });
  }, [editDescription, updateMutation, commentMutation, toast]);

  const hasInitialed = (approval: ApprovalRequest, field: string) =>
    (approval.initials || []).some(i => i.field === field);

  const allInitialed = (approval: ApprovalRequest) =>
    INITIAL_FIELDS.every(f => hasInitialed(approval, f.id));

  const getMatterName = (matterId: string) => {
    const matter = matters.find(m => m.id === matterId);
    return matter?.name || "Unknown Matter";
  };

  const getFileName = (fileId: string) => {
    const file = allFiles.find(f => f.id === fileId);
    return file?.fileName || "Unknown File";
  };

  const filteredApprovals = approvals.filter(a => {
    if (filterStatus && filterStatus !== "__all__") {
      if (filterStatus === "pending") {
        if (a.status !== "pending" && a.status !== "vetting") return false;
      } else if (filterStatus === "approved") {
        if (a.status !== "approved" && a.status !== "confirmed") return false;
      } else {
        if (a.status !== filterStatus) return false;
      }
    }
    if (filterType && filterType !== "__all__" && a.type !== filterType) return false;
    return true;
  });

  const pendingCount = approvals.filter(a => a.status === "pending" || a.status === "vetting").length;
  const needsRevisionCount = approvals.filter(a => a.status === "needs-revision").length;
  const approvedCount = approvals.filter(a => a.status === "approved" || a.status === "confirmed").length;
  const rejectedCount = approvals.filter(a => a.status === "rejected").length;

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditMode(false);
    } else {
      setExpandedId(id);
      setEditMode(false);
      setCommentText("");
      setRevisionNotes("");
      const a = approvals.find(ap => ap.id === id);
      if (a) setEditDescription(a.description);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl mx-auto" data-testid="approvals-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">Lawyer Review Queue</h1>
          <p className="text-sm text-muted-foreground">Quick review, initial, approve or send back</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button data-testid="button-new-approval">
                  <Plus className="h-4 w-4 mr-2" />
                  New Request
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Create a new approval request</TooltipContent>
          </Tooltip>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Approval Request</DialogTitle>
              <DialogDescription>Submit an item for lawyer review and approval.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v: ApprovalType) => setFormData(prev => ({ ...prev, type: v }))}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(typeConfig) as [ApprovalType, typeof typeConfig[ApprovalType]][]).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Matter *</Label>
                <Select value={formData.matterId} onValueChange={(v) => setFormData(prev => ({ ...prev, matterId: v, fileId: "" }))}>
                  <SelectTrigger data-testid="select-matter"><SelectValue placeholder="Select a matter" /></SelectTrigger>
                  <SelectContent>
                    {matters.map(matter => (<SelectItem key={matter.id} value={matter.id}>{matter.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document *</Label>
                <Select value={formData.fileId} onValueChange={(v) => setFormData(prev => ({ ...prev, fileId: v }))}>
                  <SelectTrigger data-testid="select-file"><SelectValue placeholder="Select a document" /></SelectTrigger>
                  <SelectContent>
                    {allFiles.filter(f => f.matterId === formData.matterId).map(file => (
                      <SelectItem key={file.id} value={file.id}>{file.fileName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input placeholder="Approval request title" value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} data-testid="input-title" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="What needs to be reviewed..." value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} data-testid="input-description" />
              </div>
              <div className="space-y-2">
                <Label>Assigned To *</Label>
                <Input placeholder="Comma-separated names" value={formData.assignedTo} onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))} data-testid="input-assigned-to" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={formData.dueDate} onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))} data-testid="input-due-date" />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v: Priority) => setFormData(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!formData.fileId || !formData.matterId || !formData.title || !formData.assignedTo || createMutation.isPending} data-testid="button-submit-approval">
                  Submit
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover-elevate" onClick={() => setFilterStatus("pending")} data-testid="card-pending">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-xs">Pending</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              {pendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setFilterStatus("needs-revision")} data-testid="card-revision">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-xs">Needs Revision</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              {needsRevisionCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setFilterStatus("approved")} data-testid="card-approved">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-xs">Approved</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {approvedCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="cursor-pointer hover-elevate" onClick={() => setFilterStatus("rejected")} data-testid="card-rejected">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-xs">Rejected</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              {rejectedCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full md:w-[140px]" data-testid="select-filter-status"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="vetting">Vetting</SelectItem>
              <SelectItem value="needs-revision">Needs Revision</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-[150px]" data-testid="select-filter-type"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Types</SelectItem>
            {(Object.entries(typeConfig) as [ApprovalType, typeof typeConfig[ApprovalType]][]).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterStatus || filterType) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterStatus(""); setFilterType(""); }} data-testid="button-clear-filters">
            Clear
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading approvals...</div>
        ) : filteredApprovals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No approval requests</h3>
              <p className="text-muted-foreground mb-4">Nothing to review right now</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-new-approval">
                    <Plus className="h-4 w-4 mr-2" />New Request
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create your first approval request</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        ) : (
          filteredApprovals.map((approval) => {
            const isExpanded = expandedId === approval.id;
            const typeCfg = typeConfig[approval.type] || typeConfig.general;
            const statusCfg = statusConfig[approval.status] || statusConfig.pending;
            const TypeIcon = typeCfg.icon;
            const StatusIcon = statusCfg.icon;
            const isPending = approval.status === "pending" || approval.status === "vetting";

            return (
              <Card key={approval.id} data-testid={`approval-${approval.id}`}>
                <div
                  className="flex items-center gap-3 p-3 cursor-pointer hover-elevate"
                  onClick={() => toggleExpand(approval.id)}
                  data-testid={`approval-row-${approval.id}`}
                >
                  <div className="flex items-center gap-2 shrink-0">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div className={`p-1.5 rounded-md ${typeCfg.color}`}>
                      <TypeIcon className="h-3.5 w-3.5 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{approval.title}</span>
                      <Badge className={`${priorityColors[approval.priority]} text-white text-xs`}>
                        {approval.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{typeCfg.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>{getMatterName(approval.matterId)}</span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {getFileName(approval.fileId)}
                      </span>
                      {approval.dueDate && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due {new Date(approval.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1">
                      {INITIAL_FIELDS.map(f => (
                        <div
                          key={f.id}
                          className={`h-2 w-2 rounded-full ${hasInitialed(approval, f.id) ? "bg-green-500" : "bg-muted-foreground/30"}`}
                          title={`${f.label}: ${hasInitialed(approval, f.id) ? "Done" : "Pending"}`}
                        />
                      ))}
                    </div>
                    <Badge className={`${statusCfg.color} text-white text-xs`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {isPending && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-green-600 text-xs"
                            disabled={commentMutation.isPending}
                            onClick={() => handleQuickApprove(approval)}
                            data-testid={`button-quick-approve-${approval.id}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Quick approve</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t">
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-sm font-medium mb-2">Review Checklist</h4>
                            <div className="space-y-2">
                              {INITIAL_FIELDS.map(f => {
                                const done = hasInitialed(approval, f.id);
                                return (
                                  <div key={f.id} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={done}
                                      disabled={done || initialMutation.isPending || !isPending}
                                      onCheckedChange={() => {
                                        if (!done && isPending) {
                                          initialMutation.mutate({ id: approval.id, field: f.id });
                                        }
                                      }}
                                      data-testid={`checkbox-${f.id}-${approval.id}`}
                                    />
                                    <label className={`text-sm ${done ? "text-muted-foreground line-through" : ""}`}>{f.label}</label>
                                    {done && (
                                      <span className="text-xs text-muted-foreground ml-auto">
                                        {(approval.initials || []).find(i => i.field === f.id)?.userName}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {allInitialed(approval) && isPending && (
                              <p className="text-xs text-green-600 mt-2 font-medium">All items checked — ready for approval</p>
                            )}
                          </div>

                          <Separator />

                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium">Description</h4>
                              {isPending && !editMode && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" onClick={() => { setEditMode(true); setEditDescription(approval.description); }} data-testid={`button-edit-${approval.id}`}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit description</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {editMode ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  className="text-sm"
                                  data-testid={`textarea-edit-${approval.id}`}
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleSaveEdits(approval.id)} disabled={updateMutation.isPending} data-testid={`button-save-edits-${approval.id}`}>
                                    Save
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {approval.description || "No description provided."}
                              </p>
                            )}
                          </div>

                          <div className="text-xs space-y-1 text-muted-foreground">
                            <p><span className="font-medium text-foreground">Requested by:</span> {approval.requestedByName}</p>
                            <p><span className="font-medium text-foreground">Assigned to:</span> {approval.assignedTo.join(", ")}</p>
                            <p><span className="font-medium text-foreground">Created:</span> {new Date(approval.createdAt).toLocaleString()}</p>
                          </div>

                          {approval.revisionNotes && (
                            <div className="p-3 border rounded-md bg-orange-50 dark:bg-orange-950/30">
                              <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-1">Revision Notes</p>
                              <p className="text-sm">{approval.revisionNotes}</p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Comments ({approval.comments.length})
                          </h4>
                          {approval.comments.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No comments yet</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {approval.comments.map((comment) => (
                                <div key={comment.id} className="flex gap-2" data-testid={`comment-${comment.id}`}>
                                  <Avatar className="h-6 w-6 shrink-0">
                                    <AvatarFallback className="text-xs">{comment.userName.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-medium text-xs">{comment.userName}</span>
                                      {comment.decision && (
                                        <Badge className={`${(statusConfig[comment.decision as ApprovalStatus] || statusConfig.pending).color} text-white text-xs`}>
                                          {comment.decision}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm">{comment.content}</p>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(comment.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {isPending && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <Textarea
                                  placeholder="Add a comment or note..."
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  className="text-sm"
                                  data-testid={`input-comment-${approval.id}`}
                                />
                                <div className="flex flex-wrap gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          if (!commentText.trim()) return;
                                          commentMutation.mutate({ approvalId: approval.id, content: commentText });
                                          toast({ title: "Comment added" });
                                        }}
                                        disabled={!commentText.trim() || commentMutation.isPending}
                                        data-testid={`button-comment-${approval.id}`}
                                      >
                                        <Send className="h-3.5 w-3.5 mr-1" />
                                        Comment
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Add comment without decision</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        className="bg-green-600"
                                        onClick={() => handleQuickApprove(approval)}
                                        disabled={commentMutation.isPending}
                                        data-testid={`button-approve-${approval.id}`}
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                        Approve
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Approve this item</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleReject(approval.id)}
                                        disabled={!commentText.trim() || commentMutation.isPending}
                                        data-testid={`button-reject-${approval.id}`}
                                      >
                                        <XCircle className="h-3.5 w-3.5 mr-1" />
                                        Reject
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reject — requires a comment</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                <h4 className="text-sm font-medium flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                  <RotateCcw className="h-4 w-4" />
                                  Send Back for Revision
                                </h4>
                                <Textarea
                                  placeholder="Describe what needs to be changed..."
                                  value={revisionNotes}
                                  onChange={(e) => setRevisionNotes(e.target.value)}
                                  className="text-sm"
                                  data-testid={`input-revision-${approval.id}`}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-orange-300 dark:border-orange-700"
                                  onClick={() => handleSendBack(approval.id)}
                                  disabled={!revisionNotes.trim() || commentMutation.isPending}
                                  data-testid={`button-send-back-${approval.id}`}
                                >
                                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                  Send Back
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
