import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MatterInsights from "@/components/matter-insights";
import { Link, useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Edit,
  Copy,
  Share2,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  Users,
  Plus,
  Loader2,
  Scale,
  Bot,
  Sparkles,
  Receipt,
  Search as SearchIcon,
  Shield,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  Phone,
  Mail,
  ExternalLink,
  Gavel,
  MapPin,
  User,
  Upload,
  File,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

interface MatterPhase {
  id: string;
  name: string;
  order: number;
  description: string;
  advanceTrigger?: string;
  status: "not-started" | "in-progress" | "completed";
}

interface TriggerDates {
  filingDate?: string;
  serviceDate?: string;
  schedulingOrderDate?: string;
  discoveryCutoff?: string;
  expertDeadline?: string;
  trialDate?: string;
  mediationDate?: string;
}

interface MatterParty {
  name: string;
  role: string;
  counsel?: string;
}

interface Matter {
  id: string;
  clientId: string;
  name: string;
  caseNumber: string;
  matterType: string;
  status: string;
  description: string;
  practiceArea: string;
  responsiblePartyId?: string;
  assignedAttorneys?: string[];
  assignedParalegals?: string[];
  courtName?: string;
  judgeAssigned?: string;
  opposingCounsel?: string;
  venue?: string;
  parties?: MatterParty[];
  claims?: string[];
  litigationTemplateId?: string;
  currentPhase?: string;
  phases?: MatterPhase[];
  triggerDates?: TriggerDates;
  openedDate: string;
  closedDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: string;
  title?: string;
  barNumber?: string;
  department?: string;
  isActive: boolean;
}

interface MatterDocument {
  id: string;
  matterId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

interface MatterContact {
  id: string;
  matterId: string;
  name: string;
  role: string;
  organization?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface Thread {
  id: string;
  matterId: string;
  subject: string;
  status: string;
  participants: string[];
  createdAt: string;
  updatedAt: string;
}

interface TimelineEvent {
  id: string;
  matterId: string;
  title: string;
  description: string;
  eventType: string;
  eventDate: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "active", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "on_hold", label: "On Hold" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

export default function MatterDetailPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const matterId = params.id;
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [showAddThreadDialog, setShowAddThreadDialog] = useState(false);

  const { data: matter, isLoading: matterLoading } = useQuery<Matter>({
    queryKey: ["/api/matters", matterId],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const { data: contacts = [] } = useQuery<MatterContact[]>({
    queryKey: ["/api/matters", matterId, "contacts"],
    enabled: !!matterId,
  });

  const { data: threads = [] } = useQuery<Thread[]>({
    queryKey: ["/api/matters", matterId, "threads"],
    enabled: !!matterId,
  });

  const { data: timeline = [] } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/matters", matterId, "timeline"],
    enabled: !!matterId,
  });

  const { data: matterDocuments = [] } = useQuery<MatterDocument[]>({
    queryKey: ["/api/matters", matterId, "documents"],
    enabled: !!matterId,
  });

  const updateMatterMutation = useMutation({
    mutationFn: async (data: Partial<Matter>) => {
      const res = await apiRequest("PATCH", `/api/matters/${matterId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId] });
      queryClient.invalidateQueries({ queryKey: ["/api/matters"] });
      toast({ title: "Matter updated" });
    },
  });

  const [contactForm, setContactForm] = useState({
    name: "",
    role: "",
    organization: "",
    email: "",
    phone: "",
    notes: "",
  });

  const [threadForm, setThreadForm] = useState({
    subject: "",
    participants: "",
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: typeof contactForm) => {
      const res = await apiRequest("POST", `/api/matters/${matterId}/contacts`, {
        matterId,
        name: data.name,
        role: data.role,
        organization: data.organization || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        notes: data.notes || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "contacts"] });
      setShowAddContactDialog(false);
      setContactForm({ name: "", role: "", organization: "", email: "", phone: "", notes: "" });
      toast({ title: "Contact added" });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: async (data: typeof threadForm) => {
      const res = await apiRequest("POST", `/api/matters/${matterId}/threads`, {
        matterId,
        subject: data.subject,
        status: "active",
        participants: data.participants.split(",").map(p => p.trim()).filter(Boolean),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "threads"] });
      setShowAddThreadDialog(false);
      setThreadForm({ subject: "", participants: "" });
      toast({ title: "Thread created" });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));
      const res = await fetch(`/api/matters/${matterId}/documents`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "documents"] });
      toast({ title: "Files uploaded", description: "Documents have been added to this matter." });
    },
    onError: () => {
      toast({ title: "Upload failed", description: "Could not upload one or more files.", variant: "destructive" });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      await apiRequest("DELETE", `/api/matters/${matterId}/documents/${docId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "documents"] });
      toast({ title: "Document removed" });
    },
  });

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      uploadDocumentMutation.mutate(droppedFiles);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      uploadDocumentMutation.mutate(selectedFiles);
    }
    e.target.value = "";
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getResponsiblePartyName(): string | null {
    if (matter?.responsiblePartyId) {
      const member = teamMembers.find(tm => tm.id === matter.responsiblePartyId);
      if (member) return `${member.firstName} ${member.lastName}`;
    }
    if (matter?.assignedAttorneys && matter.assignedAttorneys.length > 0) {
      return matter.assignedAttorneys[0];
    }
    return null;
  }

  if (matterLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium">Matter not found</p>
        <Button variant="outline" onClick={() => setLocation("/matters")} data-testid="button-back-not-found">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Matters
        </Button>
      </div>
    );
  }

  const client = clients.find(c => c.id === matter.clientId);

  function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function groupTimelineByDate(events: TimelineEvent[]) {
    const groups: Record<string, TimelineEvent[]> = {};
    events.forEach(e => {
      const dateKey = new Date(e.eventDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return groups;
  }

  return (
    <div className="flex flex-col h-full" data-testid="page-matter-detail">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/matters")} data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold truncate" data-testid="text-matter-title">
                {matter.caseNumber}
              </h1>
              <p className="text-sm text-muted-foreground truncate">{matter.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowEditDialog(true)} data-testid="button-edit-matter">
              <Edit className="h-4 w-4 mr-1" />
              Edit matter
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-4">
          <TabsList className="bg-transparent gap-0 h-auto p-0">
            {[
              { value: "dashboard", label: "Dashboard" },
              { value: "activities", label: "Activities" },
              { value: "communications", label: "Communications" },
              { value: "notes", label: "Notes" },
              { value: "documents", label: "Documents" },
              { value: "tasks", label: "Tasks" },
              { value: "contacts", label: "Contacts" },
              { value: "insights", label: "Insights" },
              { value: "ocr-sessions", label: "OCR Processing" },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-4 py-2.5"
                data-testid={`tab-${tab.value}`}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <TabsContent value="dashboard" className="m-0 p-0">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Financial
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Work in progress</p>
                          <p className="text-2xl font-bold" data-testid="text-wip">$0.00</p>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span>Unbilled $0.00</span>
                            <br />
                            <span>Draft $0.00</span>
                          </div>
                          <Button variant="outline" size="sm" className="mt-2" data-testid="button-quick-bill">
                            Quick bill
                          </Button>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Outstanding balance</p>
                          <p className="text-2xl font-bold" data-testid="text-outstanding">$0.00</p>
                          <Button variant="outline" size="sm" className="mt-4" data-testid="button-view-bills">
                            View bills
                          </Button>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Matter trust funds</p>
                          <p className="text-2xl font-bold" data-testid="text-trust">$0.00</p>
                          <Button variant="outline" size="sm" className="mt-4" data-testid="button-new-request">
                            New request
                          </Button>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Time</span>
                          <span className="text-muted-foreground">&mdash;</span>
                          <Button variant="outline" size="sm" data-testid="button-add-time">Add time</Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Expenses</span>
                          <span className="text-muted-foreground">&mdash;</span>
                          <Button variant="outline" size="sm" data-testid="button-add-expense">Add expense</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                        <DetailRow label="Matter description" value={matter.name} />
                        <DetailRow label="Responsible attorney" value={getResponsiblePartyName()} />
                        <DetailRow label="Practice area" value={matter.practiceArea} />
                        <DetailRow label="Matter type" value={matter.matterType} />
                        <DetailRow label="Case number" value={matter.caseNumber} />
                        <DetailRow label="Court" value={matter.courtName} />
                        <DetailRow label="Judge assigned" value={matter.judgeAssigned} />
                        <DetailRow label="Opposing counsel" value={matter.opposingCounsel} />
                        <DetailRow label="Venue" value={matter.venue} />
                        {matter.claims && matter.claims.length > 0 && (
                          <DetailRow
                            label="Claims"
                            value={
                              <div className="flex flex-wrap gap-1">
                                {matter.claims.map((c, i) => (
                                  <Badge key={i} variant="secondary" className="text-[10px]">{c}</Badge>
                                ))}
                              </div>
                            }
                          />
                        )}
                        <DetailRow
                          label="Status"
                          value={
                            <Select
                              value={matter.status}
                              onValueChange={v => updateMatterMutation.mutate({ status: v })}
                            >
                              <SelectTrigger className="w-[120px]" data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUS_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          }
                        />
                        <DetailRow label="Open date" value={formatDate(matter.openedDate)} />
                        <DetailRow label="Closed date" value={formatDate(matter.closedDate)} />
                        <DetailRow label="Billable" value="Yes, hourly" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
                      <CardTitle className="text-base">Conflict Checks</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" data-testid="button-link-conflict">Link conflict check</Button>
                        <Button variant="outline" size="sm" data-testid="button-run-conflict">Run conflict check</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">No conflict checks associated with this matter.</p>
                    </CardContent>
                  </Card>

                  {matter.description && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{matter.description}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        AI Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-xs text-muted-foreground">Quick ways to get started:</p>
                      <AiActionButton
                        icon={<Calendar className="h-5 w-5 text-primary" />}
                        title="Schedule"
                        description="Extract key dates and events from uploaded documents"
                      />
                      <AiActionButton
                        icon={<Receipt className="h-5 w-5 text-primary" />}
                        title="Track expenses"
                        description="Autofill expense details from an uploaded receipt"
                      />
                      <AiActionButton
                        icon={<FileText className="h-5 w-5 text-primary" />}
                        title="Analyze"
                        description="Summarize or extract insights from uploaded documents"
                      />
                    </CardContent>
                  </Card>

                  {matter.phases && matter.phases.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Gavel className="h-4 w-4" />
                          Litigation Phases
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        {[...matter.phases]
                          .sort((a, b) => a.order - b.order)
                          .map((phase) => {
                            const isCurrent = phase.id === matter.currentPhase;
                            return (
                              <div
                                key={phase.id}
                                className={`flex items-center gap-2 p-1.5 rounded-md text-sm ${
                                  isCurrent ? "bg-primary/10 font-medium" : ""
                                }`}
                                data-testid={`phase-${phase.id}`}
                              >
                                {phase.status === "completed" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                                ) : isCurrent ? (
                                  <div className="h-3.5 w-3.5 rounded-full border-2 border-primary bg-primary/20 shrink-0" />
                                ) : (
                                  <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
                                )}
                                <span className={phase.status === "completed" ? "text-muted-foreground line-through" : ""}>
                                  {phase.name}
                                </span>
                                {isCurrent && (
                                  <Badge variant="secondary" className="ml-auto text-[10px]">Current</Badge>
                                )}
                              </div>
                            );
                          })}
                        {matter.currentPhase && (() => {
                          const current = matter.phases?.find(p => p.id === matter.currentPhase);
                          if (!current) return null;
                          const nextPhase = matter.phases?.find(p => p.order === current.order + 1);
                          return (
                            <div className="mt-3 pt-3 border-t space-y-1.5">
                              <p className="text-xs text-muted-foreground">{current.description}</p>
                              {nextPhase && (
                                <p className="text-xs text-muted-foreground">
                                  Next: <span className="font-medium text-foreground">{nextPhase.name}</span>
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  {matter.triggerDates && Object.values(matter.triggerDates).some(v => v) && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Key Dates
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {[
                          { key: "filingDate", label: "Filing Date" },
                          { key: "serviceDate", label: "Service Date" },
                          { key: "schedulingOrderDate", label: "Scheduling Order" },
                          { key: "discoveryCutoff", label: "Discovery Cutoff" },
                          { key: "expertDeadline", label: "Expert Deadline" },
                          { key: "trialDate", label: "Trial Date" },
                          { key: "mediationDate", label: "Mediation Date" },
                        ].map(({ key, label }) => {
                          const val = matter.triggerDates?.[key as keyof TriggerDates];
                          if (!val) return null;
                          const d = new Date(val + "T00:00:00");
                          const isPast = d < new Date();
                          return (
                            <div key={key} className="flex items-center justify-between text-sm" data-testid={`date-${key}`}>
                              <span className="text-muted-foreground">{label}</span>
                              <span className={isPast ? "text-muted-foreground" : "font-medium"}>
                                {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  {matter.parties && matter.parties.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Parties
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {matter.parties.map((party, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm" data-testid={`party-${idx}`}>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{party.role}</Badge>
                            <span className="truncate">{party.name}</span>
                            {party.counsel && (
                              <span className="text-muted-foreground text-xs truncate ml-auto">({party.counsel})</span>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Team Assignments
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const responsibleParty = matter.responsiblePartyId
                          ? teamMembers.find(tm => tm.id === matter.responsiblePartyId)
                          : null;
                        const assignedAtts = (matter.assignedAttorneys || [])
                          .map(id => teamMembers.find(tm => tm.id === id))
                          .filter(Boolean);
                        const assignedPls = (matter.assignedParalegals || [])
                          .map(id => teamMembers.find(tm => tm.id === id))
                          .filter(Boolean);
                        const hasTeam = responsibleParty || assignedAtts.length > 0 || assignedPls.length > 0;

                        if (!hasTeam) {
                          return <p className="text-sm text-muted-foreground">No team members assigned.</p>;
                        }

                        return (
                          <>
                            {responsibleParty && (
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {responsibleParty.firstName[0]}{responsibleParty.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium" data-testid="text-responsible-party">
                                    {responsibleParty.firstName} {responsibleParty.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">Responsible Attorney</p>
                                </div>
                              </div>
                            )}
                            {assignedAtts.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">Attorneys</p>
                                {assignedAtts.map(atty => atty && (
                                  <div key={atty.id} className="flex items-center gap-3 py-1" data-testid={`text-attorney-${atty.id}`}>
                                    <Avatar className="h-7 w-7">
                                      <AvatarFallback className="text-xs">{atty.firstName[0]}{atty.lastName[0]}</AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm">{atty.firstName} {atty.lastName}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {assignedPls.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">Paralegals</p>
                                {assignedPls.map(pl => pl && (
                                  <div key={pl.id} className="flex items-center gap-3 py-1" data-testid={`text-paralegal-${pl.id}`}>
                                    <Avatar className="h-7 w-7">
                                      <AvatarFallback className="text-xs">{pl.firstName[0]}{pl.lastName[0]}</AvatarFallback>
                                    </Avatar>
                                    <p className="text-sm">{pl.firstName} {pl.lastName}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
                      <CardTitle className="text-base">Contacts</CardTitle>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddContactDialog(true)}
                        data-testid="button-add-contact"
                      >
                        Add
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {client && (
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">{getInitials(client.name)}</AvatarFallback>
                            </Avatar>
                            <Link
                              href={`/clients`}
                              className="text-primary hover:underline font-medium text-sm"
                              data-testid="link-client"
                            >
                              {client.name}
                            </Link>
                          </div>
                          {client.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-11">
                              <Phone className="h-3 w-3" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-11">
                              <Mail className="h-3 w-3" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {client.address && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-11">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span>{client.address}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {contacts.length > 0 && (
                        <>
                          <Separator className="my-3" />
                          <p className="text-xs text-muted-foreground mb-2">Related contacts ({contacts.length})</p>
                          <div className="space-y-3">
                            {contacts.map(contact => (
                              <div key={contact.id} className="flex items-start gap-3" data-testid={`contact-${contact.id}`}>
                                <Avatar className="h-7 w-7">
                                  <AvatarFallback className="text-xs">{getInitials(contact.name)}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">{contact.name}</p>
                                  <p className="text-xs text-muted-foreground">{contact.role}</p>
                                  {contact.email && (
                                    <p className="text-xs text-muted-foreground">{contact.email}</p>
                                  )}
                                  {contact.phone && (
                                    <p className="text-xs text-muted-foreground">{contact.phone}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between gap-4">
                      <CardTitle className="text-base">Timeline</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {timeline.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Beginning of timeline</p>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(groupTimelineByDate(timeline)).map(([date, events]) => (
                            <div key={date}>
                              <p className="text-xs font-semibold text-muted-foreground mb-2">{date}</p>
                              <div className="space-y-2">
                                {events.map(event => (
                                  <div key={event.id} className="flex items-start gap-2" data-testid={`timeline-${event.id}`}>
                                    <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                      <FileText className="h-3 w-3 text-muted-foreground" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm">{event.title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(event.eventDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t">
                        <Button variant="outline" size="sm" data-testid="button-export-timeline">
                          Export
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="activities" className="m-0">
            <div className="p-6">
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium mb-1">No time or expense entries found.</p>
                <p className="text-sm mb-4">Bill for every minute by tracking all of your time and expenses.</p>
                <div className="flex items-center justify-center gap-3">
                  <Button data-testid="button-new-time-entry">New time entry</Button>
                  <Button data-testid="button-new-expense">New expense</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="communications" className="m-0">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Discussion Threads</h3>
                <Button size="sm" onClick={() => setShowAddThreadDialog(true)} data-testid="button-add-thread">
                  <Plus className="h-4 w-4 mr-1" />
                  New Thread
                </Button>
              </div>
              {threads.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No communication threads yet</p>
                  <p className="text-sm">Start a thread to collaborate on this matter</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {threads.map(thread => (
                    <Card key={thread.id} className="hover-elevate cursor-pointer" data-testid={`thread-${thread.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium">{thread.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {thread.participants.length} participants
                              {" \u00b7 "}
                              {new Date(thread.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant={thread.status === "active" ? "default" : "secondary"}>
                            {thread.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notes" className="m-0">
            <div className="p-6">
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No notes yet</p>
                <p className="text-sm">Add notes to keep track of important details about this matter</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="m-0">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-semibold">Documents</h3>
                <label>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file-upload"
                  />
                  <Button variant="outline" size="sm" asChild>
                    <span className="cursor-pointer" data-testid="button-upload-document">
                      <Upload className="h-4 w-4 mr-1" />
                      Upload Files
                    </span>
                  </Button>
                </label>
              </div>

              <div
                className="border-2 border-dashed rounded-md p-8 text-center transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
                onDrop={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); handleFileDrop(e); }}
                data-testid="dropzone-documents"
              >
                {uploadDocumentMutation.isPending ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Drag and drop files here</p>
                    <p className="text-xs text-muted-foreground">or click Upload Files above</p>
                  </div>
                )}
              </div>

              {matterDocuments.length > 0 ? (
                <div className="space-y-2">
                  {matterDocuments.map(doc => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border"
                      data-testid={`document-row-${doc.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <File className="h-5 w-5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-doc-name-${doc.id}`}>{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(doc.fileSize)} &middot; {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDocumentMutation.mutate(doc.id)}
                        data-testid={`button-delete-doc-${doc.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">No documents uploaded yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="m-0">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h3 className="font-semibold">Tasks</h3>
              </div>

              <div
                className="border-2 border-dashed rounded-md p-8 text-center transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("border-primary", "bg-primary/5"); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("border-primary", "bg-primary/5"); }}
                onDrop={(e) => { e.currentTarget.classList.remove("border-primary", "bg-primary/5"); handleFileDrop(e); }}
                data-testid="dropzone-tasks"
              >
                {uploadDocumentMutation.isPending ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop files here to attach to this matter</p>
                    <p className="text-xs text-muted-foreground">Files will appear in the Documents tab</p>
                  </div>
                )}
              </div>

              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No tasks assigned</p>
                <p className="text-sm">Create tasks to track work on this matter</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contacts" className="m-0">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">All Contacts</h3>
                <Button size="sm" onClick={() => setShowAddContactDialog(true)} data-testid="button-add-contact-tab">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              </div>

              {client && (
                <Card data-testid="contact-client-card">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback>{getInitials(client.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{client.name}</p>
                        <p className="text-sm text-muted-foreground">Client</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm">
                          {client.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                          {client.address && (
                            <div className="flex items-center gap-2 col-span-2">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span>{client.address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No additional contacts</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map(contact => (
                    <Card key={contact.id} data-testid={`contact-card-${contact.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Avatar>
                            <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{contact.name}</p>
                            <p className="text-sm text-muted-foreground capitalize">{contact.role}</p>
                            {contact.organization && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Building2 className="h-3 w-3" />
                                {contact.organization}
                              </p>
                            )}
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-2 text-sm">
                              {contact.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{contact.email}</span>
                                </div>
                              )}
                              {contact.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span>{contact.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="m-0 p-0">
            <MatterInsights matterId={matter.id} />
          </TabsContent>

          <TabsContent value="ocr-sessions" className="m-0 p-0">
            <OCRSessionsPanel matterId={matter.id} />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Matter</DialogTitle>
            <DialogDescription>Update matter details.</DialogDescription>
          </DialogHeader>
          <EditMatterForm
            matter={matter}
            clients={clients}
            teamMembers={teamMembers}
            onSave={(data) => {
              updateMatterMutation.mutate(data);
              setShowEditDialog(false);
            }}
            isPending={updateMatterMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>Add a contact related to this matter.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={contactForm.name}
                  onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                  data-testid="input-contact-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={contactForm.role}
                  onValueChange={v => setContactForm(p => ({ ...p, role: v }))}
                >
                  <SelectTrigger data-testid="select-contact-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plaintiff">Plaintiff</SelectItem>
                    <SelectItem value="defendant">Defendant</SelectItem>
                    <SelectItem value="witness">Witness</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                    <SelectItem value="opposing-counsel">Opposing Counsel</SelectItem>
                    <SelectItem value="judge">Judge</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Input
                value={contactForm.organization}
                onChange={e => setContactForm(p => ({ ...p, organization: e.target.value }))}
                data-testid="input-contact-org"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={contactForm.email}
                  onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                  data-testid="input-contact-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={contactForm.phone}
                  onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))}
                  data-testid="input-contact-phone"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createContactMutation.mutate(contactForm)}
              disabled={!contactForm.name || !contactForm.role || createContactMutation.isPending}
              data-testid="button-submit-contact"
            >
              {createContactMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddThreadDialog} onOpenChange={setShowAddThreadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Thread</DialogTitle>
            <DialogDescription>Create a discussion thread for this matter.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={threadForm.subject}
                onChange={e => setThreadForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="Thread subject..."
                data-testid="input-thread-subject"
              />
            </div>
            <div className="space-y-2">
              <Label>Participants (comma-separated)</Label>
              <Input
                value={threadForm.participants}
                onChange={e => setThreadForm(p => ({ ...p, participants: e.target.value }))}
                placeholder="John, Jane, Mike"
                data-testid="input-thread-participants"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createThreadMutation.mutate(threadForm)}
              disabled={!threadForm.subject || createThreadMutation.isPending}
              data-testid="button-submit-thread"
            >
              {createThreadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-sm font-medium text-muted-foreground w-[140px] shrink-0">{label}</span>
      <span className="text-sm">{value || <span className="text-muted-foreground">&mdash;</span>}</span>
    </div>
  );
}

function AiActionButton({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border hover-elevate cursor-pointer" data-testid={`ai-action-${title.toLowerCase()}`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function EditMatterForm({ matter, clients, teamMembers, onSave, isPending }: {
  matter: Matter;
  clients: Client[];
  teamMembers: TeamMember[];
  onSave: (data: Partial<Matter>) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: matter.name,
    caseNumber: matter.caseNumber,
    matterType: matter.matterType,
    practiceArea: matter.practiceArea,
    description: matter.description,
    status: matter.status,
    responsiblePartyId: matter.responsiblePartyId || "",
    courtName: matter.courtName || "",
    judgeAssigned: matter.judgeAssigned || "",
    opposingCounsel: matter.opposingCounsel || "",
  });

  const PRACTICE_AREAS = [
    "Civil Litigation", "Criminal Defense", "Family Law", "Corporate Law",
    "Real Estate", "Intellectual Property", "Employment Law", "Immigration",
    "Personal Injury", "Estate Planning", "Bankruptcy", "Tax Law", "Other",
  ];

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Responsible Attorney</Label>
          <Select value={form.responsiblePartyId} onValueChange={v => setForm(p => ({ ...p, responsiblePartyId: v }))}>
            <SelectTrigger data-testid="select-edit-responsible-party">
              <SelectValue placeholder="Select team member" />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.firstName} {member.lastName} ({member.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Matter Name</Label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              data-testid="input-edit-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Case Number</Label>
            <Input
              value={form.caseNumber}
              onChange={e => setForm(p => ({ ...p, caseNumber: e.target.value }))}
              data-testid="input-edit-case-number"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Practice Area</Label>
            <Select value={form.practiceArea} onValueChange={v => setForm(p => ({ ...p, practiceArea: v }))}>
              <SelectTrigger data-testid="select-edit-practice-area">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRACTICE_AREAS.map(area => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Matter Type</Label>
            <Input
              value={form.matterType}
              onChange={e => setForm(p => ({ ...p, matterType: e.target.value }))}
              data-testid="input-edit-type"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Court Name</Label>
            <Input
              value={form.courtName}
              onChange={e => setForm(p => ({ ...p, courtName: e.target.value }))}
              data-testid="input-edit-court"
            />
          </div>
          <div className="space-y-2">
            <Label>Judge Assigned</Label>
            <Input
              value={form.judgeAssigned}
              onChange={e => setForm(p => ({ ...p, judgeAssigned: e.target.value }))}
              data-testid="input-edit-judge"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Opposing Counsel</Label>
          <Input
            value={form.opposingCounsel}
            onChange={e => setForm(p => ({ ...p, opposingCounsel: e.target.value }))}
            data-testid="input-edit-opposing"
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            data-testid="input-edit-description"
          />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => onSave({
            ...form,
            responsiblePartyId: form.responsiblePartyId || undefined,
          })}
          disabled={isPending}
          data-testid="button-save-edit"
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </>
  );
}

interface OCRSession {
  id: string;
  matterId: string;
  assetId: string;
  filename: string;
  method: string;
  provider: string;
  status: string;
  confidence: number | null;
  processingTimeMs: number | null;
  pageCount: number | null;
  textLength: number | null;
  chunkCount: number | null;
  anchorCount: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

function OCRSessionsPanel({ matterId }: { matterId: string }) {
  const { data: sessions = [], isLoading } = useQuery<OCRSession[]>({
    queryKey: [`/api/matters/${matterId}/ocr-sessions`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">No OCR sessions yet</p>
        <p className="text-sm">Upload documents in the Insights tab to begin processing.</p>
      </div>
    );
  }

  const completedCount = sessions.filter(s => s.status === "completed").length;
  const avgConfidence = sessions.filter(s => s.confidence !== null).reduce((sum, s) => sum + (s.confidence || 0), 0) / (sessions.filter(s => s.confidence !== null).length || 1);
  const totalPages = sessions.reduce((sum, s) => sum + (s.pageCount || 0), 0);

  return (
    <div className="p-6 space-y-6" data-testid="ocr-sessions-panel">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Sessions</p>
            <p className="text-2xl font-bold" data-testid="text-ocr-total">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-ocr-completed">{completedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Avg Confidence</p>
            <p className="text-2xl font-bold" data-testid="text-ocr-confidence">{Math.round(avgConfidence * 100)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pages Processed</p>
            <p className="text-2xl font-bold" data-testid="text-ocr-pages">{totalPages}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Processing History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {sessions.map(session => (
              <div key={session.id} className="p-4 flex items-start gap-4" data-testid={`ocr-session-${session.id}`}>
                <div className="flex-shrink-0 mt-1">
                  {session.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : session.status === "failed" ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{session.filename}</p>
                    <Badge variant={session.method === "ocr" ? "default" : "secondary"}>
                      {session.method === "ocr" ? "OCR" : "Text Extract"}
                    </Badge>
                    <Badge variant="outline">{session.provider}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                    {session.confidence !== null && (
                      <span>Confidence: {Math.round(session.confidence * 100)}%</span>
                    )}
                    {session.processingTimeMs !== null && (
                      <span>{(session.processingTimeMs / 1000).toFixed(1)}s</span>
                    )}
                    {session.pageCount !== null && (
                      <span>{session.pageCount} page{session.pageCount !== 1 ? "s" : ""}</span>
                    )}
                    {session.textLength !== null && (
                      <span>{session.textLength.toLocaleString()} chars</span>
                    )}
                    {session.chunkCount !== null && (
                      <span>{session.chunkCount} chunks</span>
                    )}
                    <span>{new Date(session.startedAt).toLocaleString()}</span>
                  </div>
                  {session.errorMessage && (
                    <p className="text-sm text-red-500 mt-1">{session.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
