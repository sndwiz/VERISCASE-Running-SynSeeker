import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PenTool, Plus, Send, Ban, Eye, Check, X, Clock,
  FileText, Users, CheckCircle2, XCircle, AlertCircle,
  ChevronUp, ChevronDown, Trash2, ArrowRight,
} from "lucide-react";

interface Signer {
  id: string;
  envelopeId: string;
  name: string;
  email: string;
  role: string | null;
  order: number;
  status: string;
  signedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  signatureData: string | null;
  signingToken: string | null;
  createdAt: string;
}

interface Envelope {
  id: string;
  title: string;
  matterId: string | null;
  clientId: string | null;
  documentName: string;
  status: string;
  message: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  signers: Signer[];
  auditTrail?: AuditEntry[];
}

interface AuditEntry {
  id: string;
  envelopeId: string;
  action: string;
  actorName: string;
  actorEmail: string | null;
  ipAddress: string | null;
  details: string | null;
  createdAt: string;
}

interface Stats {
  pending: number;
  completed: number;
  declined: number;
  total: number;
}

interface NewSigner {
  name: string;
  email: string;
  role: string;
}

function getStatusBadge(status: string) {
  const map: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; className?: string; label: string }> = {
    draft: { variant: "secondary", label: "Draft" },
    sent: { variant: "default", className: "bg-blue-600 dark:bg-blue-500", label: "Sent" },
    viewed: { variant: "default", className: "bg-yellow-500 dark:bg-yellow-400 text-black", label: "Viewed" },
    partially_signed: { variant: "default", className: "bg-blue-600 dark:bg-blue-500", label: "Partially Signed" },
    signed: { variant: "default", className: "bg-green-600 dark:bg-green-500", label: "Signed" },
    completed: { variant: "default", className: "bg-green-600 dark:bg-green-500", label: "Completed" },
    declined: { variant: "destructive", label: "Declined" },
    expired: { variant: "destructive", label: "Expired" },
    voided: { variant: "secondary", label: "Voided" },
    pending: { variant: "outline", label: "Pending" },
  };
  const config = map[status] || { variant: "secondary" as const, label: status };
  return (
    <Badge variant={config.variant} className={config.className} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}

function getSignerStatusIcon(status: string) {
  switch (status) {
    case "signed": return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case "declined": return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    case "viewed": return <Eye className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    case "sent": return <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getAuditIcon(action: string) {
  switch (action) {
    case "created": return <FileText className="h-4 w-4" />;
    case "sent": return <Send className="h-4 w-4" />;
    case "viewed": return <Eye className="h-4 w-4" />;
    case "signed": return <Check className="h-4 w-4 text-green-600" />;
    case "declined": return <X className="h-4 w-4 text-red-600" />;
    case "completed": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "voided": return <Ban className="h-4 w-4 text-muted-foreground" />;
    default: return <AlertCircle className="h-4 w-4" />;
  }
}

function SignaturePad({ onSign }: { onSign: (data: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typedName, setTypedName] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);

  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }, [getCoords]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "hsl(var(--foreground))";
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [isDrawing, getCoords]);

  const stopDraw = useCallback(() => setIsDrawing(false), []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  const handleAdopt = useCallback(() => {
    if (mode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      onSign(canvas.toDataURL("image/png"));
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 120;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "transparent";
      ctx.fillRect(0, 0, 400, 120);
      ctx.font = "italic 36px 'Georgia', serif";
      ctx.fillStyle = "hsl(var(--foreground))";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName, 200, 60);
      onSign(canvas.toDataURL("image/png"));
    }
  }, [mode, typedName, onSign]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          variant={mode === "draw" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("draw")}
          data-testid="button-draw-mode"
        >
          <PenTool className="h-4 w-4 mr-1" /> Draw
        </Button>
        <Button
          variant={mode === "type" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("type")}
          data-testid="button-type-mode"
        >
          Type
        </Button>
      </div>

      {mode === "draw" ? (
        <div className="border rounded-md p-1 bg-background">
          <canvas
            ref={canvasRef}
            width={400}
            height={120}
            className="w-full cursor-crosshair touch-none"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
            data-testid="canvas-signature"
          />
        </div>
      ) : (
        <div className="border rounded-md p-4 bg-background">
          <Input
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder="Type your full name"
            data-testid="input-typed-signature"
          />
          {typedName && (
            <div className="mt-3 text-center text-3xl italic font-serif text-foreground" data-testid="text-signature-preview">
              {typedName}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {mode === "draw" && (
          <Button variant="outline" size="sm" onClick={clearCanvas} data-testid="button-clear-signature">
            Clear
          </Button>
        )}
        <Button
          size="sm"
          onClick={handleAdopt}
          disabled={mode === "draw" ? !hasDrawn : !typedName.trim()}
          data-testid="button-adopt-signature"
        >
          <Check className="h-4 w-4 mr-1" /> Adopt & Sign
        </Button>
      </div>
    </div>
  );
}

export default function ESignPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailEnvelopeId, setDetailEnvelopeId] = useState<string | null>(null);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signingSigner, setSigningSigner] = useState<{ envelopeId: string; signerId: string; name: string } | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newMatterId, setNewMatterId] = useState("");
  const [newClientId, setNewClientId] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [newSigners, setNewSigners] = useState<NewSigner[]>([{ name: "", email: "", role: "" }]);

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/esign/stats"],
  });

  const statusFilter = activeTab === "all" ? undefined
    : activeTab === "awaiting" ? "awaiting"
    : activeTab === "declined_expired" ? "declined_expired"
    : activeTab;

  const { data: envelopes = [], isLoading: envelopesLoading } = useQuery<Envelope[]>({
    queryKey: ["/api/esign/envelopes", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/esign/envelopes?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch envelopes");
      return res.json();
    },
  });

  const { data: detailEnvelope, isLoading: detailLoading } = useQuery<Envelope>({
    queryKey: ["/api/esign/envelopes", detailEnvelopeId],
    enabled: !!detailEnvelopeId,
  });

  const { data: matters = [] } = useQuery<{ id: string; name: string; caseNumber?: string }[]>({
    queryKey: ["/api/matters"],
  });

  const { data: clients = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/clients"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/esign/envelopes", {
        title: newTitle,
        documentName: newDocName,
        message: newMessage || null,
        matterId: newMatterId || null,
        clientId: newClientId || null,
        expiresAt: newExpiresAt || null,
        signers: newSigners.filter(s => s.name && s.email),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/esign/envelopes"] });
      qc.invalidateQueries({ queryKey: ["/api/esign/stats"] });
      toast({ title: "Envelope created" });
      setCreateOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Failed to create envelope", variant: "destructive" }),
  });

  const sendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/esign/envelopes/${id}/send`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/esign/envelopes"] });
      qc.invalidateQueries({ queryKey: ["/api/esign/stats"] });
      toast({ title: "Envelope sent to signers" });
    },
    onError: () => toast({ title: "Failed to send envelope", variant: "destructive" }),
  });

  const voidMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/esign/envelopes/${id}/void`);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/esign/envelopes"] });
      qc.invalidateQueries({ queryKey: ["/api/esign/stats"] });
      toast({ title: "Envelope voided" });
    },
    onError: () => toast({ title: "Failed to void envelope", variant: "destructive" }),
  });

  const signMutation = useMutation({
    mutationFn: async ({ envelopeId, signerId, signatureData }: { envelopeId: string; signerId: string; signatureData: string }) => {
      const res = await apiRequest("POST", `/api/esign/envelopes/${envelopeId}/signers/${signerId}/sign`, { signatureData });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/esign/envelopes"] });
      qc.invalidateQueries({ queryKey: ["/api/esign/stats"] });
      setSignDialogOpen(false);
      setSigningSigner(null);
      toast({ title: data.allSigned ? "All signatures collected" : "Signature recorded" });
    },
    onError: () => toast({ title: "Failed to record signature", variant: "destructive" }),
  });

  const declineMutation = useMutation({
    mutationFn: async ({ envelopeId, signerId }: { envelopeId: string; signerId: string }) => {
      const res = await apiRequest("POST", `/api/esign/envelopes/${envelopeId}/signers/${signerId}/decline`, { reason: "Declined via interface" });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/esign/envelopes"] });
      qc.invalidateQueries({ queryKey: ["/api/esign/stats"] });
      toast({ title: "Signer declined" });
    },
    onError: () => toast({ title: "Failed to decline", variant: "destructive" }),
  });

  function resetForm() {
    setNewTitle("");
    setNewDocName("");
    setNewMessage("");
    setNewMatterId("");
    setNewClientId("");
    setNewExpiresAt("");
    setNewSigners([{ name: "", email: "", role: "" }]);
  }

  function addSigner() {
    setNewSigners([...newSigners, { name: "", email: "", role: "" }]);
  }

  function removeSigner(idx: number) {
    setNewSigners(newSigners.filter((_, i) => i !== idx));
  }

  function updateSigner(idx: number, field: keyof NewSigner, value: string) {
    setNewSigners(newSigners.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function moveSigner(idx: number, direction: "up" | "down") {
    const arr = [...newSigners];
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setNewSigners(arr);
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-esign">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <PenTool className="h-6 w-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-page-title">E-Sign</h1>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-envelope">
          <Plus className="h-4 w-4 mr-1" /> New Envelope
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-10 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <p className="text-2xl font-bold" data-testid="stat-pending">{stats?.pending ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold" data-testid="stat-completed">{stats?.completed ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-muted-foreground">Declined</span>
                </div>
                <p className="text-2xl font-bold" data-testid="stat-declined">{stats?.declined ?? 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-bold" data-testid="stat-total">{stats?.total ?? 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-filter">
          <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
          <TabsTrigger value="draft" data-testid="tab-draft">Draft</TabsTrigger>
          <TabsTrigger value="awaiting" data-testid="tab-awaiting">Awaiting Signature</TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
          <TabsTrigger value="declined_expired" data-testid="tab-declined">Declined/Expired</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {envelopesLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : envelopes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground" data-testid="text-empty-state">
              <PenTool className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No envelopes found</p>
              <p className="text-sm mt-1">Create a new envelope to get started with e-signatures.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table data-testid="table-envelopes">
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Signers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envelopes.map((env) => (
                  <TableRow key={env.id} data-testid={`row-envelope-${env.id}`}>
                    <TableCell>
                      <button
                        className="text-left font-medium hover:underline"
                        onClick={() => setDetailEnvelopeId(env.id)}
                        data-testid={`link-envelope-${env.id}`}
                      >
                        {env.title}
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{env.documentName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm" data-testid={`text-signer-count-${env.id}`}>{env.signers?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(env.status || "draft")}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {env.createdAt ? new Date(env.createdAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {env.status === "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => sendMutation.mutate(env.id)}
                            disabled={sendMutation.isPending}
                            data-testid={`button-send-${env.id}`}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" /> Send
                          </Button>
                        )}
                        {env.status && !["completed", "voided", "declined"].includes(env.status) && env.status !== "draft" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => voidMutation.mutate(env.id)}
                            disabled={voidMutation.isPending}
                            data-testid={`button-void-${env.id}`}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" /> Void
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailEnvelopeId(env.id)}
                          data-testid={`button-detail-${env.id}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-envelope">
          <DialogHeader>
            <DialogTitle>Create New Envelope</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="env-title">Title</Label>
                <Input id="env-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Settlement Agreement" data-testid="input-envelope-title" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="env-doc">Document Name</Label>
                <Input id="env-doc" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="e.g. settlement-agreement.pdf" data-testid="input-document-name" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="env-msg">Message (optional)</Label>
              <Textarea id="env-msg" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Please review and sign this document..." data-testid="input-envelope-message" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Matter (optional)</Label>
                <Select value={newMatterId} onValueChange={setNewMatterId}>
                  <SelectTrigger data-testid="select-matter">
                    <SelectValue placeholder="Select matter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {matters.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}{m.caseNumber ? ` (${m.caseNumber})` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client (optional)</Label>
                <Select value={newClientId} onValueChange={setNewClientId}>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="env-exp">Expiration (optional)</Label>
                <Input id="env-exp" type="date" value={newExpiresAt} onChange={(e) => setNewExpiresAt(e.target.value)} data-testid="input-expires-at" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Signers</Label>
                <Button variant="outline" size="sm" onClick={addSigner} data-testid="button-add-signer">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Signer
                </Button>
              </div>
              {newSigners.map((signer, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap" data-testid={`signer-row-${idx}`}>
                  <div className="flex flex-col gap-0.5">
                    <Button
                      variant="ghost" size="icon" className="h-5 w-5"
                      onClick={() => moveSigner(idx, "up")} disabled={idx === 0}
                      data-testid={`button-move-up-${idx}`}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-5 w-5"
                      onClick={() => moveSigner(idx, "down")} disabled={idx === newSigners.length - 1}
                      data-testid={`button-move-down-${idx}`}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Name" value={signer.name}
                    onChange={(e) => updateSigner(idx, "name", e.target.value)}
                    className="flex-1 min-w-[120px]"
                    data-testid={`input-signer-name-${idx}`}
                  />
                  <Input
                    placeholder="Email" value={signer.email}
                    onChange={(e) => updateSigner(idx, "email", e.target.value)}
                    className="flex-1 min-w-[150px]"
                    data-testid={`input-signer-email-${idx}`}
                  />
                  <Input
                    placeholder="Role (e.g. Client)" value={signer.role}
                    onChange={(e) => updateSigner(idx, "role", e.target.value)}
                    className="w-full sm:w-[120px]"
                    data-testid={`input-signer-role-${idx}`}
                  />
                  {newSigners.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeSigner(idx)} data-testid={`button-remove-signer-${idx}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }} data-testid="button-cancel-create">Cancel</Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!newTitle || !newDocName || newSigners.filter(s => s.name && s.email).length === 0 || createMutation.isPending}
              data-testid="button-submit-create"
            >
              {createMutation.isPending ? "Creating..." : "Create Envelope"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailEnvelopeId} onOpenChange={(open) => { if (!open) setDetailEnvelopeId(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" data-testid="dialog-envelope-detail">
          {detailLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detailEnvelope ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle data-testid="text-detail-title">{detailEnvelope.title}</DialogTitle>
                  {getStatusBadge(detailEnvelope.status || "draft")}
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-detail-doc">{detailEnvelope.documentName}</p>
                {detailEnvelope.message && (
                  <p className="text-sm text-muted-foreground mt-1">{detailEnvelope.message}</p>
                )}
              </DialogHeader>
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-6 pb-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Signers ({detailEnvelope.signers?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {detailEnvelope.signers?.map((signer) => (
                        <Card key={signer.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-3">
                                {getSignerStatusIcon(signer.status)}
                                <div>
                                  <p className="font-medium text-sm" data-testid={`text-signer-name-${signer.id}`}>{signer.name}</p>
                                  <p className="text-xs text-muted-foreground">{signer.email}</p>
                                  {signer.role && <Badge variant="outline" className="mt-0.5 text-xs">{signer.role}</Badge>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(signer.status)}
                                {signer.signedAt && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(signer.signedAt).toLocaleString()}
                                  </span>
                                )}
                                {signer.declinedAt && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(signer.declinedAt).toLocaleString()}
                                  </span>
                                )}
                                {signer.status === "sent" && (
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSigningSigner({ envelopeId: detailEnvelope.id, signerId: signer.id, name: signer.name });
                                        setSignDialogOpen(true);
                                      }}
                                      data-testid={`button-sign-${signer.id}`}
                                    >
                                      <PenTool className="h-3.5 w-3.5 mr-1" /> Sign
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => declineMutation.mutate({ envelopeId: detailEnvelope.id, signerId: signer.id })}
                                      disabled={declineMutation.isPending}
                                      data-testid={`button-decline-${signer.id}`}
                                    >
                                      <X className="h-3.5 w-3.5 mr-1" /> Decline
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            {signer.declineReason && (
                              <p className="text-xs text-destructive mt-1">Reason: {signer.declineReason}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {detailEnvelope.auditTrail && detailEnvelope.auditTrail.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3">Audit Trail</h3>
                      <div className="relative pl-6 space-y-0" data-testid="audit-trail">
                        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                        {detailEnvelope.auditTrail.map((entry) => (
                          <div key={entry.id} className="relative flex gap-3 py-2" data-testid={`audit-entry-${entry.id}`}>
                            <div className="absolute -left-6 mt-0.5 flex items-center justify-center w-5 h-5 rounded-full bg-muted border">
                              {getAuditIcon(entry.action)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{entry.actorName}</span>
                                <Badge variant="outline" className="text-xs">{entry.action}</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}
                                </span>
                              </div>
                              {entry.details && (
                                <p className="text-xs text-muted-foreground mt-0.5">{entry.details}</p>
                              )}
                              {entry.ipAddress && (
                                <p className="text-xs text-muted-foreground">IP: {entry.ipAddress}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground">Envelope not found</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={signDialogOpen} onOpenChange={(open) => { if (!open) { setSignDialogOpen(false); setSigningSigner(null); } }}>
        <DialogContent className="max-w-lg" data-testid="dialog-sign">
          <DialogHeader>
            <DialogTitle>Sign Document</DialogTitle>
            {signingSigner && (
              <p className="text-sm text-muted-foreground">Signing as: {signingSigner.name}</p>
            )}
          </DialogHeader>
          <SignaturePad
            onSign={(data) => {
              if (signingSigner) {
                signMutation.mutate({
                  envelopeId: signingSigner.envelopeId,
                  signerId: signingSigner.signerId,
                  signatureData: data,
                });
              }
            }}
          />
          {signMutation.isPending && (
            <p className="text-sm text-muted-foreground text-center">Recording signature...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
