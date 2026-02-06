import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, AlertCircle, MessageSquare, FileText, Plus, Send, Filter, User } from "lucide-react";
import type { ApprovalRequest, ApprovalStatus, Priority, FileItem, Matter } from "@shared/schema";

const statusColors: Record<ApprovalStatus, string> = {
  pending: "bg-amber-500",
  vetting: "bg-blue-500",
  approved: "bg-green-500",
  confirmed: "bg-emerald-600",
  rejected: "bg-red-500",
};

const statusIcons: Record<ApprovalStatus, any> = {
  pending: Clock,
  vetting: AlertCircle,
  approved: CheckCircle2,
  confirmed: CheckCircle2,
  rejected: XCircle,
};

const priorityColors: Record<Priority, string> = {
  low: "bg-gray-400",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [formData, setFormData] = useState({
    fileId: "",
    matterId: "",
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "medium" as Priority,
  });

  const { data: approvals = [], isLoading } = useQuery<ApprovalRequest[]>({
    queryKey: ["/api/approvals"],
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
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/approvals", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Approval request created" });
    },
    onError: () => {
      toast({ title: "Failed to create approval request", variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ approvalId, content, decision }: { approvalId: string; content: string; decision?: string }) => {
      return apiRequest("POST", `/api/approvals/${approvalId}/comments`, {
        content,
        decision,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/approvals"] });
      setCommentText("");
      toast({ title: "Comment added" });
    },
  });

  const resetForm = () => {
    setFormData({
      fileId: "",
      matterId: "",
      title: "",
      description: "",
      assignedTo: "",
      dueDate: "",
      priority: "medium",
    });
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

  const handleDecision = (approvalId: string, decision: "approved" | "rejected" | "needs-revision") => {
    if (!commentText.trim()) {
      toast({ title: "Please add a comment with your decision", variant: "destructive" });
      return;
    }
    commentMutation.mutate({ approvalId, content: commentText, decision });
  };

  const getMatterName = (matterId: string) => {
    const matter = matters.find(m => m.id === matterId);
    return matter?.name || "Unknown Matter";
  };

  const getFileName = (fileId: string) => {
    const file = allFiles.find(f => f.id === fileId);
    return file?.fileName || "Unknown File";
  };

  const filteredApprovals = filterStatus && filterStatus !== "__all__"
    ? approvals.filter(a => a.status === filterStatus)
    : approvals;

  const pendingCount = approvals.filter(a => a.status === "pending").length;
  const approvedCount = approvals.filter(a => a.status === "approved").length;
  const rejectedCount = approvals.filter(a => a.status === "rejected").length;

  return (
    <div className="p-6 space-y-6" data-testid="approvals-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Approvals</h1>
          <p className="text-muted-foreground">Review and approve documents</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button data-testid="button-new-approval">
                  <Plus className="h-4 w-4 mr-2" />
                  Request Approval
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Create a new document approval request</TooltipContent>
          </Tooltip>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Request Document Approval</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Matter *</Label>
                <Select value={formData.matterId} onValueChange={(v) => setFormData(prev => ({ ...prev, matterId: v, fileId: "" }))}>
                  <SelectTrigger data-testid="select-matter">
                    <SelectValue placeholder="Select a matter" />
                  </SelectTrigger>
                  <SelectContent>
                    {matters.map(matter => (
                      <SelectItem key={matter.id} value={matter.id}>{matter.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document *</Label>
                <Select value={formData.fileId} onValueChange={(v) => setFormData(prev => ({ ...prev, fileId: v }))}>
                  <SelectTrigger data-testid="select-file">
                    <SelectValue placeholder="Select a document" />
                  </SelectTrigger>
                  <SelectContent>
                    {allFiles.filter(f => f.matterId === formData.matterId).map(file => (
                      <SelectItem key={file.id} value={file.id}>{file.fileName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  placeholder="Approval request title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  data-testid="input-title"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="What needs to be reviewed..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="input-description"
                />
              </div>
              <div className="space-y-2">
                <Label>Assigned To *</Label>
                <Input
                  placeholder="Comma-separated names"
                  value={formData.assignedTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
                  data-testid="input-assigned-to"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    data-testid="input-due-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v: Priority) => setFormData(prev => ({ ...prev, priority: v }))}>
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
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
                  Submit Request
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-pointer hover-elevate" onClick={() => setFilterStatus("pending")} data-testid="card-pending">
              <CardHeader className="pb-2">
                <CardDescription>Pending Review</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Clock className="h-6 w-6 text-amber-500" />
                  {pendingCount}
                </CardTitle>
              </CardHeader>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Click to filter by pending approvals</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-pointer hover-elevate" onClick={() => setFilterStatus("approved")} data-testid="card-approved">
              <CardHeader className="pb-2">
                <CardDescription>Approved</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  {approvedCount}
                </CardTitle>
              </CardHeader>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Click to filter by approved requests</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-pointer hover-elevate" onClick={() => setFilterStatus("rejected")} data-testid="card-rejected">
              <CardHeader className="pb-2">
                <CardDescription>Rejected</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <XCircle className="h-6 w-6 text-red-500" />
                  {rejectedCount}
                </CardTitle>
              </CardHeader>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Click to filter by rejected requests</TooltipContent>
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Approval Requests</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]" data-testid="select-filter-status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="needs-revision">Needs Revision</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredApprovals.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No approval requests</h3>
                <p className="text-muted-foreground mb-4">Create your first approval request</p>
                <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-new-approval">
                    <Plus className="h-4 w-4 mr-2" />
                    Request Approval
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create your first approval request</TooltipContent>
              </Tooltip>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApprovals.map((approval) => {
                  const StatusIcon = statusIcons[approval.status];
                  return (
                    <div
                      key={approval.id}
                      onClick={() => setSelectedApproval(approval)}
                      className={`p-4 border rounded-lg cursor-pointer hover-elevate ${selectedApproval?.id === approval.id ? "ring-2 ring-primary" : ""}`}
                      data-testid={`approval-${approval.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{approval.title}</span>
                            <Badge className={`${priorityColors[approval.priority]} text-white text-xs`}>
                              {approval.priority}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground mb-2 truncate">
                            {getMatterName(approval.matterId)}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                        <div className={`p-2 rounded ${statusColors[approval.status]}`}>
                          <StatusIcon className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedApproval ? selectedApproval.title : "Select an Approval Request"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedApproval ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Select a request to view details and add comments</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors[selectedApproval.status]} text-white`}>
                      {selectedApproval.status.replace("-", " ")}
                    </Badge>
                    <Badge variant="outline">{selectedApproval.priority}</Badge>
                  </div>
                  {selectedApproval.description && (
                    <p className="text-sm text-muted-foreground">{selectedApproval.description}</p>
                  )}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Document:</span>{" "}
                    <span className="font-medium">{getFileName(selectedApproval.fileId)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Requested by:</span>{" "}
                    <span className="font-medium">{selectedApproval.requestedByName}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Assigned to:</span>{" "}
                    <span className="font-medium">{selectedApproval.assignedTo.join(", ")}</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Comments ({selectedApproval.comments.length})
                  </h4>
                  {selectedApproval.comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No comments yet</p>
                  ) : (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {selectedApproval.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{comment.userName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{comment.userName}</span>
                              {comment.decision && (
                                <Badge className={`${statusColors[comment.decision as ApprovalStatus] || "bg-orange-500"} text-white text-xs`}>
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
                </div>

                {selectedApproval.status === "pending" && (
                  <div className="border-t pt-4 space-y-3">
                    <Textarea
                      placeholder="Add your review comments..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      data-testid="input-comment"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => commentMutation.mutate({ approvalId: selectedApproval.id, content: commentText })}
                            disabled={!commentText.trim() || commentMutation.isPending}
                            data-testid="button-add-comment"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Comment
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Add a comment without making a decision</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleDecision(selectedApproval.id, "approved")}
                            disabled={!commentText.trim() || commentMutation.isPending}
                            data-testid="button-approve"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Approve this document</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="default"
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={() => handleDecision(selectedApproval.id, "needs-revision")}
                            disabled={!commentText.trim() || commentMutation.isPending}
                            data-testid="button-request-revision"
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Request Revision
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Request changes before approval</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            onClick={() => handleDecision(selectedApproval.id, "rejected")}
                            disabled={!commentText.trim() || commentMutation.isPending}
                            data-testid="button-reject"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reject this document</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
