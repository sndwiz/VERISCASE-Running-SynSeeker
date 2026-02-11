import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Paperclip, Mail, Phone, Plane, Globe, Receipt,
  Camera, FileText, Trash2, Download, Link2, X
} from "lucide-react";

interface SupportingDoc {
  id: string;
  timeEntryId: string;
  matterId: string;
  docType: string;
  fileName: string;
  filePath?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  linkedEmailId?: string | null;
  notes?: string | null;
  uploadedBy?: string | null;
  createdAt: string;
}

interface AnalyzedEmail {
  id: string;
  subject: string;
  sender: string;
  direction: string;
  urgencyScore?: number;
  createdAt: string;
}

const DOC_TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  phone_bill: { label: "Phone Bill", icon: Phone, color: "text-blue-500" },
  travel: { label: "Travel", icon: Plane, color: "text-purple-500" },
  web_search: { label: "Web Search", icon: Globe, color: "text-cyan-500" },
  email: { label: "Email", icon: Mail, color: "text-amber-500" },
  receipt: { label: "Receipt", icon: Receipt, color: "text-green-500" },
  screenshot: { label: "Screenshot", icon: Camera, color: "text-pink-500" },
  other: { label: "Other", icon: FileText, color: "text-muted-foreground" },
};

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function TimeEntryDocsPanel({ timeEntryId, matterId }: { timeEntryId: string; matterId: string }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDocType, setUploadDocType] = useState("other");
  const [uploadNotes, setUploadNotes] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEmailLinkOpen, setIsEmailLinkOpen] = useState(false);

  const { data: docs = [], isLoading: docsLoading } = useQuery<SupportingDoc[]>({
    queryKey: ["/api/time-entries", timeEntryId, "docs"],
    queryFn: async () => {
      const res = await fetch(`/api/time-entries/${timeEntryId}/docs`);
      return res.json();
    },
  });

  const { data: matterEmails = [] } = useQuery<AnalyzedEmail[]>({
    queryKey: ["/api/matters", matterId, "emails-for-linking"],
    queryFn: async () => {
      const res = await fetch(`/api/matters/${matterId}/emails-for-linking`);
      return res.json();
    },
    enabled: isEmailLinkOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append("files", f));
      formData.append("docType", uploadDocType);
      if (uploadNotes) formData.append("notes", uploadNotes);
      const res = await fetch(`/api/time-entries/${timeEntryId}/docs/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries", timeEntryId, "docs"] });
      setIsUploadOpen(false);
      setUploadNotes("");
      toast({ title: "Documents uploaded" });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const linkEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      const res = await fetch(`/api/time-entries/${timeEntryId}/docs/link-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId }),
      });
      if (!res.ok) throw new Error("Link failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries", timeEntryId, "docs"] });
      setIsEmailLinkOpen(false);
      toast({ title: "Email linked" });
    },
    onError: () => {
      toast({ title: "Failed to link email", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/time-entries/docs/${docId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries", timeEntryId, "docs"] });
      toast({ title: "Document removed" });
    },
  });

  const handleFileSelect = () => {
    const files = fileInputRef.current?.files;
    if (files && files.length > 0) {
      uploadMutation.mutate(files);
    }
  };

  const linkedEmailIds = new Set(docs.filter(d => d.linkedEmailId).map(d => d.linkedEmailId));
  const availableEmails = matterEmails.filter(e => !linkedEmailIds.has(e.id));

  return (
    <div className="space-y-2 pt-2 border-t mt-2" data-testid={`docs-panel-${timeEntryId}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Paperclip className="h-3 w-3" />
          Supporting Documents ({docs.length})
        </span>
        <div className="flex items-center gap-1">
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" data-testid={`button-upload-doc-${timeEntryId}`}>
                <Upload className="h-3 w-3 mr-1" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Supporting Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={uploadDocType} onValueChange={setUploadDocType}>
                    <SelectTrigger data-testid="select-doc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone_bill">Phone Bill</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="web_search">Web Search</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="screenshot">Screenshot</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Add context about this document..."
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    data-testid="input-doc-notes"
                  />
                </div>
                <div className="space-y-2">
                  <Label>File</Label>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    data-testid="input-file-upload"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isEmailLinkOpen} onOpenChange={setIsEmailLinkOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" data-testid={`button-link-email-${timeEntryId}`}>
                    <Link2 className="h-3 w-3 mr-1" />
                    Link Email
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Link an analyzed email to this time entry</TooltipContent>
            </Tooltip>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Link Analyzed Email</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {availableEmails.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No analyzed emails found for this matter. Analyze emails first in Email Intelligence.
                  </p>
                ) : (
                  availableEmails.map(email => (
                    <div
                      key={email.id}
                      className="flex items-center justify-between gap-2 p-3 border rounded-md hover-elevate cursor-pointer"
                      onClick={() => linkEmailMutation.mutate(email.id)}
                      data-testid={`email-option-${email.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{email.subject || "(No Subject)"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {email.sender} &middot; {new Date(email.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{email.direction}</Badge>
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {docsLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : docs.length > 0 ? (
        <div className="space-y-1">
          {docs.map(doc => {
            const config = DOC_TYPE_CONFIG[doc.docType] || DOC_TYPE_CONFIG.other;
            const Icon = config.icon;
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-2 p-2 rounded-md border text-sm"
                data-testid={`doc-item-${doc.id}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">{config.label}</Badge>
                      {doc.fileSize ? <span>{formatFileSize(doc.fileSize)}</span> : null}
                      {doc.notes ? <span className="truncate max-w-[150px]">{doc.notes}</span> : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {doc.filePath && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/api/time-entries/docs/${doc.id}/download`, "_blank")}
                          data-testid={`button-download-${doc.id}`}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(doc.id)}
                        data-testid={`button-remove-doc-${doc.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
