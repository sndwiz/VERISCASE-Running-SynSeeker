import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, MessageSquare, FileText, Activity, Plus, Copy, Trash2, Send, Eye, Download } from "lucide-react";

interface PortalAccess {
  id: string;
  clientId: string;
  email: string;
  name: string;
  accessToken: string;
  isActive: boolean | null;
  lastAccessedAt: string | null;
  permissions: string[] | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface PortalMessage {
  id: string;
  clientId: string;
  matterId: string | null;
  senderType: string;
  senderName: string;
  senderId: string;
  subject: string | null;
  content: string;
  isRead: boolean | null;
  attachments: any[];
  createdAt: string | null;
}

interface SharedDoc {
  id: string;
  clientId: string;
  matterId: string | null;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  description: string | null;
  sharedBy: string;
  sharedByName: string;
  downloadCount: number | null;
  expiresAt: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

interface ClientRecord {
  id: string;
  name: string;
  email?: string | null;
}

interface PortalStats {
  activePortals: number;
  unreadMessages: number;
  sharedDocuments: number;
  recentMessages: PortalMessage[];
}

const ALL_PERMISSIONS = [
  { key: "view_matters", label: "View Matters" },
  { key: "view_invoices", label: "View Invoices" },
  { key: "messaging", label: "Messaging" },
  { key: "view_documents", label: "View Documents" },
];

function formatDate(d: string | null) {
  if (!d) return "Never";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function StatsCards({ stats, isLoading }: { stats?: PortalStats; isLoading: boolean }) {
  const cards = [
    { title: "Active Client Portals", value: stats?.activePortals ?? 0, icon: Users, color: "text-blue-600 dark:text-blue-400" },
    { title: "Unread Messages", value: stats?.unreadMessages ?? 0, icon: MessageSquare, color: "text-amber-600 dark:text-amber-400" },
    { title: "Shared Documents", value: stats?.sharedDocuments ?? 0, icon: FileText, color: "text-emerald-600 dark:text-emerald-400" },
    { title: "Recent Activity", value: stats?.recentMessages?.length ?? 0, icon: Activity, color: "text-purple-600 dark:text-purple-400" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.title}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold" data-testid={`stat-${c.title.toLowerCase().replace(/\s+/g, "-")}`}>{c.value}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function OverviewTab() {
  const { data: stats, isLoading } = useQuery<PortalStats>({ queryKey: ["/api/client-portal/stats"] });
  return (
    <div className="space-y-6">
      <StatsCards stats={stats} isLoading={isLoading} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Messages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !stats?.recentMessages?.length ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-recent-messages">No recent messages</p>
          ) : (
            <div className="space-y-3">
              {stats.recentMessages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 p-3 rounded-md border" data-testid={`message-item-${msg.id}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={msg.senderType === "firm" ? "bg-primary/10 text-primary" : "bg-secondary"}>{getInitials(msg.senderName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{msg.senderName}</span>
                      <Badge variant={msg.senderType === "firm" ? "default" : "secondary"} className="text-xs">{msg.senderType}</Badge>
                      {!msg.isRead && <Badge variant="outline" className="text-xs">Unread</Badge>}
                    </div>
                    {msg.subject && <p className="text-sm font-medium mt-1">{msg.subject}</p>}
                    <p className="text-sm text-muted-foreground truncate">{msg.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDate(msg.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PortalAccessTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [grantName, setGrantName] = useState("");
  const [grantPerms, setGrantPerms] = useState<string[]>(["view_matters", "view_invoices", "messaging", "view_documents"]);

  const { data: accessRecords = [], isLoading } = useQuery<PortalAccess[]>({ queryKey: ["/api/client-portal/access"] });
  const { data: clientsList = [] } = useQuery<ClientRecord[]>({ queryKey: ["/api/clients"] });

  const grantMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/client-portal/access", {
        clientId: selectedClient,
        email: grantEmail,
        name: grantName,
        permissions: grantPerms,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/access"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/stats"] });
      toast({ title: "Portal access granted" });
      setGrantDialogOpen(false);
      setSelectedClient("");
      setGrantEmail("");
      setGrantName("");
      setGrantPerms(["view_matters", "view_invoices", "messaging", "view_documents"]);
    },
    onError: () => toast({ title: "Failed to grant access", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/client-portal/access/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/access"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/stats"] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/client-portal/access/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/access"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/stats"] });
      toast({ title: "Access revoked" });
    },
  });

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/portal?token=${token}`);
    toast({ title: "Portal link copied to clipboard" });
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    const client = clientsList.find(c => c.id === clientId);
    if (client) {
      setGrantName(client.name);
      if (client.email) setGrantEmail(client.email);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold">Portal Access Management</h3>
        <Button onClick={() => setGrantDialogOpen(true)} data-testid="button-grant-access">
          <Plus className="h-4 w-4 mr-2" />
          Grant Access
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : !accessRecords.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-access-records">No clients have portal access yet</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Accessed</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accessRecords.map((rec) => (
                  <TableRow key={rec.id} data-testid={`row-access-${rec.id}`}>
                    <TableCell className="font-medium">{rec.name}</TableCell>
                    <TableCell className="text-muted-foreground">{rec.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rec.isActive ?? false}
                          onCheckedChange={(checked) => toggleMutation.mutate({ id: rec.id, isActive: checked })}
                          data-testid={`switch-active-${rec.id}`}
                        />
                        <Badge variant={rec.isActive ? "default" : "secondary"}>{rec.isActive ? "Active" : "Inactive"}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(rec.lastAccessedAt)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(rec.permissions || []).map((p: string) => (
                          <Badge key={p} variant="outline" className="text-xs">{p.replace(/_/g, " ")}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => copyLink(rec.accessToken)} data-testid={`button-copy-link-${rec.id}`}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => revokeMutation.mutate(rec.id)} data-testid={`button-revoke-${rec.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Portal Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={handleClientSelect}>
                <SelectTrigger data-testid="select-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clientsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={grantName} onChange={(e) => setGrantName(e.target.value)} placeholder="Contact name" data-testid="input-grant-name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="Email address" type="email" data-testid="input-grant-email" />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-2">
                {ALL_PERMISSIONS.map((p) => (
                  <div key={p.key} className="flex items-center gap-2">
                    <Checkbox
                      checked={grantPerms.includes(p.key)}
                      onCheckedChange={(checked) => {
                        setGrantPerms(checked ? [...grantPerms, p.key] : grantPerms.filter(k => k !== p.key));
                      }}
                      data-testid={`checkbox-perm-${p.key}`}
                    />
                    <Label className="text-sm font-normal">{p.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => grantMutation.mutate()}
              disabled={!selectedClient || !grantEmail || !grantName || grantMutation.isPending}
              data-testid="button-confirm-grant"
            >
              {grantMutation.isPending ? "Granting..." : "Grant Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MessagesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedMatterId, setSelectedMatterId] = useState<string>("");
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");

  const { data: clientsList = [] } = useQuery<ClientRecord[]>({ queryKey: ["/api/clients"] });
  const { data: accessRecords = [] } = useQuery<PortalAccess[]>({ queryKey: ["/api/client-portal/access"] });

  const portalClients = clientsList.filter(c => accessRecords.some(a => a.clientId === c.id));

  const { data: messages = [], isLoading } = useQuery<PortalMessage[]>({
    queryKey: ["/api/client-portal/messages", selectedClientId],
    enabled: !!selectedClientId,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedClientId) params.set("clientId", selectedClientId);
      if (selectedMatterId) params.set("matterId", selectedMatterId);
      const res = await fetch(`/api/client-portal/messages?${params}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/client-portal/messages", {
        clientId: selectedClientId,
        matterId: selectedMatterId || null,
        senderType: "firm",
        senderName: "Firm",
        senderId: "firm-user",
        subject: newSubject || null,
        content: newContent,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/messages", selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/stats"] });
      toast({ title: "Message sent" });
      setNewSubject("");
      setNewContent("");
    },
    onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/client-portal/messages/${id}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/messages", selectedClientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/stats"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedClientId} onValueChange={(v) => { setSelectedClientId(v); setSelectedMatterId(""); }}>
          <SelectTrigger className="w-64" data-testid="select-message-client">
            <SelectValue placeholder="Select a client" />
          </SelectTrigger>
          <SelectContent>
            {portalClients.length ? portalClients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            )) : clientsList.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedClientId ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground" data-testid="text-select-client-messages">Select a client to view messages</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message Thread</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : !messages.length ? (
                <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-messages">No messages yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[...messages].reverse().map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.senderType === "firm" ? "justify-end" : "justify-start"}`} data-testid={`message-bubble-${msg.id}`}>
                      {msg.senderType === "client" && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-secondary">{getInitials(msg.senderName)}</AvatarFallback>
                        </Avatar>
                      )}
                      <div className={`max-w-[70%] rounded-md p-3 ${msg.senderType === "firm" ? "bg-primary/10" : "border"}`}>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-medium">{msg.senderName}</span>
                          <Badge variant={msg.senderType === "firm" ? "default" : "secondary"} className="text-xs">{msg.senderType}</Badge>
                          {!msg.isRead && msg.senderType === "client" && (
                            <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate(msg.id)} className="h-auto py-0.5 px-1 text-xs" data-testid={`button-mark-read-${msg.id}`}>
                              <Eye className="h-3 w-3 mr-1" />Mark Read
                            </Button>
                          )}
                        </div>
                        {msg.subject && <p className="text-sm font-medium">{msg.subject}</p>}
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(msg.createdAt)}</p>
                      </div>
                      {msg.senderType === "firm" && (
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary">{getInitials(msg.senderName)}</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Subject (optional)" data-testid="input-message-subject" />
              <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Type your message..." rows={3} data-testid="input-message-content" />
              <div className="flex justify-end">
                <Button onClick={() => sendMutation.mutate()} disabled={!newContent.trim() || sendMutation.isPending} data-testid="button-send-message">
                  <Send className="h-4 w-4 mr-2" />
                  {sendMutation.isPending ? "Sending..." : "Send"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SharedDocumentsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareClientId, setShareClientId] = useState("");
  const [shareFileName, setShareFileName] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  const [shareFileSize, setShareFileSize] = useState(0);

  const { data: clientsList = [] } = useQuery<ClientRecord[]>({ queryKey: ["/api/clients"] });

  const effectiveClientId = selectedClientId === "all" ? "" : selectedClientId;

  const { data: documents = [], isLoading } = useQuery<SharedDoc[]>({
    queryKey: ["/api/client-portal/documents", effectiveClientId],
    queryFn: async () => {
      const params = effectiveClientId ? `?clientId=${effectiveClientId}` : "";
      const res = await fetch(`/api/client-portal/documents${params}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/client-portal/documents", {
        clientId: shareClientId,
        fileName: shareFileName,
        fileSize: shareFileSize,
        description: shareDescription || null,
        sharedBy: "firm-user",
        sharedByName: "Firm",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/stats"] });
      toast({ title: "Document shared" });
      setShareDialogOpen(false);
      setShareClientId("");
      setShareFileName("");
      setShareDescription("");
      setShareFileSize(0);
    },
    onError: () => toast({ title: "Failed to share document", variant: "destructive" }),
  });

  const unshareMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/client-portal/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/client-portal/stats"] });
      toast({ title: "Document unshared" });
    },
  });

  const getClientName = (id: string) => clientsList.find(c => c.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-64" data-testid="select-docs-client">
            <SelectValue placeholder="All clients" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All clients</SelectItem>
            {clientsList.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setShareDialogOpen(true)} data-testid="button-share-document">
          <Plus className="h-4 w-4 mr-2" />
          Share Document
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : !documents.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-shared-docs">No shared documents</CardContent></Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Shared By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Downloads</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id} data-testid={`row-doc-${doc.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{doc.fileName}</p>
                          {doc.description && <p className="text-xs text-muted-foreground">{doc.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{getClientName(doc.clientId)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell className="text-sm">{doc.sharedByName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(doc.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Download className="h-3 w-3" />
                        {doc.downloadCount ?? 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => unshareMutation.mutate(doc.id)} data-testid={`button-unshare-${doc.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={shareClientId} onValueChange={setShareClientId}>
                <SelectTrigger data-testid="select-share-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clientsList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File Name</Label>
              <Input value={shareFileName} onChange={(e) => setShareFileName(e.target.value)} placeholder="document.pdf" data-testid="input-share-filename" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={shareDescription} onChange={(e) => setShareDescription(e.target.value)} placeholder="Optional description" rows={2} data-testid="input-share-description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => shareMutation.mutate()}
              disabled={!shareClientId || !shareFileName || shareMutation.isPending}
              data-testid="button-confirm-share"
            >
              {shareMutation.isPending ? "Sharing..." : "Share Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ClientPortalPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Client Portal</h1>
        <p className="text-muted-foreground">Manage client access, communications, and shared documents</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList data-testid="tabs-portal">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="access" data-testid="tab-access">Portal Access</TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Shared Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="access" className="mt-4">
          <PortalAccessTab />
        </TabsContent>
        <TabsContent value="messages" className="mt-4">
          <MessagesTab />
        </TabsContent>
        <TabsContent value="documents" className="mt-4">
          <SharedDocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
