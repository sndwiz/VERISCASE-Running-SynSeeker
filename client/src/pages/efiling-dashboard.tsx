import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Matter } from "@/types/matters";
import {
  FileText,
  Upload,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Zap,
  Scale,
  Shield,
  Target,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CaseFiling {
  id: string;
  matterId: string;
  originalFileName: string;
  docType: string;
  docSubtype: string | null;
  docCategory: string | null;
  classificationConfidence: number;
  filedDate: string | null;
  servedDate: string | null;
  hearingDate: string | null;
  sourceType: string;
  classifiedBy: string;
  status: string;
  createdAt: string;
}

interface CaseDeadline {
  id: string;
  matterId: string;
  title: string;
  dueDate: string;
  anchorEvent: string | null;
  anchorDate: string | null;
  ruleSource: string | null;
  criticality: string;
  status: string;
  requiredAction: string | null;
  resultDocType: string | null;
  assignedTo: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  notes: string | null;
}

interface DraftDocument {
  id: string;
  matterId: string;
  title: string;
  templateType: string;
  content: string;
  status: string;
  linkedFilingId: string | null;
  linkedDeadlineId: string | null;
  linkedActionId: string | null;
  createdAt: string;
}

interface CaseAction {
  id: string;
  matterId: string;
  title: string;
  description: string | null;
  actionType: string;
  requiredDocType: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  daysRemaining: number | null;
  assignedTo: string | null;
  auditTrail: any[];
}

interface DashboardSummary {
  casePhase: string;
  totalFilings: number;
  totalDeadlines: number;
  totalActions: number;
  totalDrafts: number;
  overdueCount: number;
  upcomingDeadlines: CaseDeadline[];
  overdueDeadlines: CaseDeadline[];
  pendingActions: CaseAction[];
  recentFilings: CaseFiling[];
  recentDrafts: DraftDocument[];
  filingsByType: Record<string, number>;
  jurisdiction: { id: string; name: string; state: string } | null;
  warnings: string[];
}

function getDaysRemaining(dueDate: string | null): number {
  if (!dueDate) return 999;
  const due = new Date(dueDate);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical": return "destructive";
    case "urgent": return "destructive";
    case "high": return "default";
    case "medium": return "secondary";
    case "low": return "outline";
    default: return "secondary";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "draft": return "secondary";
    case "review": return "default";
    case "final": return "default";
    case "file": return "default";
    case "served": return "outline";
    case "confirmed": return "outline";
    case "pending": return "secondary";
    case "completed": return "outline";
    case "overdue": return "destructive";
    default: return "secondary";
  }
}

function getCriticalityIcon(criticality: string) {
  if (criticality === "hard") return <AlertTriangle className="w-4 h-4 text-destructive" />;
  return <Clock className="w-4 h-4 text-muted-foreground" />;
}

export default function EFilingDashboard() {
  const [selectedMatterId, setSelectedMatterId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: dashboard, isLoading: dashLoading } = useQuery<DashboardSummary>({
    queryKey: ["/api/efiling", "matters", selectedMatterId, "dashboard"],
    enabled: !!selectedMatterId,
  });

  const { data: filings = [] } = useQuery<CaseFiling[]>({
    queryKey: ["/api/efiling", "matters", selectedMatterId, "filings"],
    enabled: !!selectedMatterId && activeTab === "filings",
  });

  const { data: deadlines = [] } = useQuery<CaseDeadline[]>({
    queryKey: ["/api/efiling", "matters", selectedMatterId, "deadlines"],
    enabled: !!selectedMatterId && activeTab === "deadlines",
  });

  const { data: actions = [] } = useQuery<CaseAction[]>({
    queryKey: ["/api/efiling", "matters", selectedMatterId, "actions"],
    enabled: !!selectedMatterId && activeTab === "actions",
  });

  const { data: drafts = [] } = useQuery<DraftDocument[]>({
    queryKey: ["/api/efiling", "matters", selectedMatterId, "drafts"],
    enabled: !!selectedMatterId && activeTab === "drafts",
  });

  const overrideDeadlineMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; dueDate?: string; status?: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/efiling/deadlines/${id}/override`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/efiling"] });
      toast({ title: "Deadline Updated" });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/efiling/drafts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/efiling"] });
      toast({ title: "Draft Deleted" });
    },
  });

  const [overrideDeadlineId, setOverrideDeadlineId] = useState<string | null>(null);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);

  const ingestMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/efiling/matters/${selectedMatterId}/ingest`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: (data) => {
      const parts = [
        `Classified as ${data.classification.docType} (${Math.round(data.classification.confidence * 100)}%)`,
        `${data.deadlinesCreated} deadline(s)`,
        `${data.actionsCreated} action(s)`,
        `${data.draftsCreated} draft(s)`,
      ];
      toast({
        title: "Document Ingested",
        description: parts.join(" | "),
      });
      if (data.warnings?.length > 0) {
        toast({
          title: "Warnings",
          description: data.warnings.join("; "),
          variant: "destructive",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/efiling"] });
    },
    onError: (error: any) => {
      toast({ title: "Ingestion Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/efiling/actions/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/efiling"] });
      toast({ title: "Action Updated" });
    },
  });

  const seedRulesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/efiling/seed-rules");
    },
    onSuccess: () => {
      toast({ title: "Rules Seeded", description: "Default deadline rules and jurisdictions loaded." });
    },
  });

  const handleFileUpload = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const onFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && selectedMatterId) {
        ingestMutation.mutate(file);
      }
      if (e.target) e.target.value = "";
    },
    [selectedMatterId, ingestMutation]
  );

  const STATUS_PIPELINE = ["draft", "review", "final", "file", "served", "confirmed"];

  return (
    <div className="p-4 space-y-4 h-full overflow-auto" data-testid="efiling-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">E-Filing Automation Brain</h1>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedMatterId} onValueChange={setSelectedMatterId}>
            <SelectTrigger className="w-[280px]" data-testid="select-matter">
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

          {selectedMatterId && (
            <>
              <Button
                onClick={handleFileUpload}
                disabled={ingestMutation.isPending}
                data-testid="button-upload-filing"
              >
                {ingestMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span className="ml-1">Ingest Document</span>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={onFileSelected}
                data-testid="input-file-upload"
              />
            </>
          )}

          <Button variant="outline" onClick={() => seedRulesMutation.mutate()} data-testid="button-seed-rules">
            <Scale className="w-4 h-4" />
            <span className="ml-1">Load Rules</span>
          </Button>
        </div>
      </div>

      {!selectedMatterId && (
        <Card>
          <CardContent className="p-12 text-center">
            <Scale className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Select a Matter</h2>
            <p className="text-muted-foreground">
              Choose a matter to view its e-filing automation dashboard, deadlines, and next actions.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedMatterId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-navigation">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="filings" data-testid="tab-filings">Filings</TabsTrigger>
            <TabsTrigger value="deadlines" data-testid="tab-deadlines">Deadlines</TabsTrigger>
            <TabsTrigger value="actions" data-testid="tab-actions">Actions</TabsTrigger>
            <TabsTrigger value="drafts" data-testid="tab-drafts">Drafts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {dashLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : dashboard ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-primary" />
                        <span className="text-sm text-muted-foreground">Case Phase</span>
                      </div>
                      <p className="text-lg font-semibold capitalize" data-testid="text-case-phase">
                        {dashboard.casePhase}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-muted-foreground">Filings</span>
                      </div>
                      <p className="text-lg font-semibold" data-testid="text-total-filings">
                        {dashboard.totalFilings}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-muted-foreground">Deadlines</span>
                      </div>
                      <p className="text-lg font-semibold" data-testid="text-total-deadlines">
                        {dashboard.totalDeadlines}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                        <span className="text-sm text-muted-foreground">Overdue</span>
                      </div>
                      <p className="text-lg font-semibold text-destructive" data-testid="text-overdue-count">
                        {dashboard.overdueCount}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {dashboard.warnings && dashboard.warnings.length > 0 && (
                  <Card className="border-yellow-500/50">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2">
                        <Shield className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-medium text-sm">Attention Required</p>
                          {dashboard.warnings.map((w, i) => (
                            <p key={i} className="text-sm text-muted-foreground" data-testid={`text-warning-${i}`}>{w}</p>
                          ))}
                        </div>
                      </div>
                      {dashboard.jurisdiction && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">
                            Jurisdiction: {dashboard.jurisdiction.name} ({dashboard.jurisdiction.state})
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {dashboard.overdueDeadlines.length > 0 && (
                  <Card className="border-destructive">
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      <CardTitle className="text-destructive">Overdue Deadlines</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {dashboard.overdueDeadlines.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-md bg-destructive/10"
                            data-testid={`overdue-deadline-${d.id}`}
                          >
                            <div>
                              <p className="font-medium">{d.title}</p>
                              <p className="text-sm text-muted-foreground">
                                Due: {d.dueDate} | {d.ruleSource}
                              </p>
                            </div>
                            <Badge variant="destructive">
                              {Math.abs(getDaysRemaining(d.dueDate))} days overdue
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                      <Calendar className="w-5 h-5 text-yellow-500" />
                      <CardTitle>Upcoming Deadlines</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dashboard.upcomingDeadlines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                      ) : (
                        <div className="space-y-2">
                          {dashboard.upcomingDeadlines.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-md border"
                              data-testid={`upcoming-deadline-${d.id}`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {getCriticalityIcon(d.criticality)}
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{d.title}</p>
                                  <p className="text-xs text-muted-foreground">{d.ruleSource}</p>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-sm font-medium">{d.dueDate}</p>
                                <p className="text-xs text-muted-foreground">
                                  {getDaysRemaining(d.dueDate)} days
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                      <ArrowRight className="w-5 h-5 text-primary" />
                      <CardTitle>Next Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dashboard.pendingActions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No pending actions</p>
                      ) : (
                        <div className="space-y-2">
                          {dashboard.pendingActions.slice(0, 5).map((a) => (
                            <div
                              key={a.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-md border"
                              data-testid={`pending-action-${a.id}`}
                            >
                              <div className="min-w-0">
                                <p className="font-medium truncate">{a.title}</p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Badge variant={getPriorityColor(a.priority) as any}>{a.priority}</Badge>
                                  <Badge variant={getStatusColor(a.status) as any}>{a.status}</Badge>
                                </div>
                              </div>
                              {a.dueDate && (
                                <p className="text-sm text-muted-foreground flex-shrink-0">{a.dueDate}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {dashboard.recentFilings.length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <CardTitle>Recent Filings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Document</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Filed</TableHead>
                            <TableHead>Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dashboard.recentFilings.map((f) => (
                            <TableRow key={f.id} data-testid={`filing-row-${f.id}`}>
                              <TableCell className="font-medium">{f.originalFileName}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{f.docType}</Badge>
                                {f.docSubtype && (
                                  <span className="text-xs text-muted-foreground ml-1">({f.docSubtype})</span>
                                )}
                              </TableCell>
                              <TableCell>{f.filedDate || "N/A"}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{f.sourceType}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {Object.keys(dashboard.filingsByType).length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center gap-2 pb-2">
                      <BarChart3 className="w-5 h-5 text-muted-foreground" />
                      <CardTitle>Filings by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(dashboard.filingsByType).map(([type, count]) => (
                          <Badge key={type} variant="outline" className="text-sm">
                            {type}: {count}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No data yet. Upload filings to get started.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="filings" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle>Case Filings</CardTitle>
                <Badge variant="outline">{filings.length} total</Badge>
              </CardHeader>
              <CardContent>
                {filings.length === 0 ? (
                  <p className="text-center text-muted-foreground p-4">
                    No filings ingested yet. Upload a document to classify and track it.
                  </p>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Filed</TableHead>
                          <TableHead>Served</TableHead>
                          <TableHead>Confidence</TableHead>
                          <TableHead>Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filings.map((f) => (
                          <TableRow key={f.id} data-testid={`filing-detail-${f.id}`}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {f.originalFileName}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{f.docType}</Badge>
                              {f.docSubtype && (
                                <div className="text-xs text-muted-foreground mt-1">{f.docSubtype}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{f.docCategory}</Badge>
                            </TableCell>
                            <TableCell>{f.filedDate || "-"}</TableCell>
                            <TableCell>{f.servedDate || "-"}</TableCell>
                            <TableCell>
                              <span className={f.classificationConfidence >= 0.7 ? "text-green-500" : "text-yellow-500"}>
                                {Math.round((f.classificationConfidence || 0) * 100)}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{f.classifiedBy}</Badge>
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

          <TabsContent value="deadlines" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle>Case Deadlines</CardTitle>
                <Badge variant="outline">{deadlines.length} total</Badge>
              </CardHeader>
              <CardContent>
                {deadlines.length === 0 ? (
                  <p className="text-center text-muted-foreground p-4">
                    No deadlines computed yet. Ingest filings with dates to trigger deadline computation.
                  </p>
                ) : (
                  <div className="overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Deadline</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Days</TableHead>
                          <TableHead>Rule</TableHead>
                          <TableHead>Anchor</TableHead>
                          <TableHead>Criticality</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deadlines.map((d) => {
                          const days = getDaysRemaining(d.dueDate);
                          const isOverriding = overrideDeadlineId === d.id;
                          return (
                            <>
                              <TableRow
                                key={d.id}
                                className={days <= 0 && d.status === "pending" ? "bg-destructive/5" : ""}
                                data-testid={`deadline-row-${d.id}`}
                              >
                                <TableCell className="font-medium">
                                  {d.title}
                                  {d.confirmedAt && (
                                    <CheckCircle2 className="w-3 h-3 text-green-500 inline ml-1" />
                                  )}
                                </TableCell>
                                <TableCell className="font-mono">{d.dueDate}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={days <= 0 ? "destructive" : days <= 7 ? "default" : "secondary"}
                                  >
                                    {days <= 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{d.ruleSource || "-"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">
                                  {d.anchorEvent || "-"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    {getCriticalityIcon(d.criticality)}
                                    <span className="text-sm">{d.criticality}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={getStatusColor(d.status) as any}>{d.status}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        if (isOverriding) {
                                          setOverrideDeadlineId(null);
                                        } else {
                                          setOverrideDeadlineId(d.id);
                                          setOverrideDate(d.dueDate);
                                          setOverrideNotes(d.notes || "");
                                        }
                                      }}
                                      data-testid={`button-override-${d.id}`}
                                    >
                                      Override
                                    </Button>
                                    {!d.confirmedAt && d.status === "pending" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => overrideDeadlineMutation.mutate({ id: d.id, status: "confirmed" })}
                                        data-testid={`button-confirm-${d.id}`}
                                      >
                                        <CheckCircle2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                              {isOverriding && (
                                <TableRow key={`override-${d.id}`}>
                                  <TableCell colSpan={8} className="bg-muted/30 p-3">
                                    <div className="flex items-end gap-3 flex-wrap">
                                      <div>
                                        <label className="text-xs text-muted-foreground block mb-1">New Due Date</label>
                                        <input
                                          type="date"
                                          value={overrideDate}
                                          onChange={(e) => setOverrideDate(e.target.value)}
                                          className="border rounded-md px-2 py-1 text-sm bg-background"
                                          data-testid={`input-override-date-${d.id}`}
                                        />
                                      </div>
                                      <div className="flex-1 min-w-[200px]">
                                        <label className="text-xs text-muted-foreground block mb-1">Notes</label>
                                        <input
                                          type="text"
                                          value={overrideNotes}
                                          onChange={(e) => setOverrideNotes(e.target.value)}
                                          placeholder="Reason for override..."
                                          className="border rounded-md px-2 py-1 text-sm w-full bg-background"
                                          data-testid={`input-override-notes-${d.id}`}
                                        />
                                      </div>
                                      <Button
                                        size="sm"
                                        onClick={() => {
                                          overrideDeadlineMutation.mutate({
                                            id: d.id,
                                            dueDate: overrideDate,
                                            notes: overrideNotes,
                                          });
                                          setOverrideDeadlineId(null);
                                        }}
                                        disabled={overrideDeadlineMutation.isPending}
                                        data-testid={`button-save-override-${d.id}`}
                                      >
                                        Save Override
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOverrideDeadlineId(null)}
                                        data-testid={`button-cancel-override-${d.id}`}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle>Case Actions Pipeline</CardTitle>
                <Badge variant="outline">{actions.length} total</Badge>
              </CardHeader>
              <CardContent>
                {actions.length === 0 ? (
                  <p className="text-center text-muted-foreground p-4">
                    No actions generated yet. Ingest filings to trigger automatic action creation.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {actions.map((a) => (
                      <div
                        key={a.id}
                        className="p-3 rounded-md border space-y-2"
                        data-testid={`action-card-${a.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                            <h3 className="font-medium truncate">{a.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant={getPriorityColor(a.priority) as any}>{a.priority}</Badge>
                            {a.dueDate && (
                              <span className="text-sm text-muted-foreground">{a.dueDate}</span>
                            )}
                            {a.daysRemaining !== null && a.daysRemaining !== undefined && (
                              <Badge
                                variant={a.daysRemaining <= 0 ? "destructive" : a.daysRemaining <= 7 ? "default" : "secondary"}
                              >
                                {a.daysRemaining <= 0 ? `${Math.abs(a.daysRemaining)}d overdue` : `${a.daysRemaining}d`}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {a.description && (
                          <p className="text-sm text-muted-foreground whitespace-pre-line">{a.description}</p>
                        )}

                        <div className="flex items-center gap-1 flex-wrap">
                          {STATUS_PIPELINE.map((s) => (
                            <Button
                              key={s}
                              variant={a.status === s ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateActionMutation.mutate({ id: a.id, status: s })}
                              disabled={updateActionMutation.isPending}
                              data-testid={`action-status-${a.id}-${s}`}
                            >
                              {s === a.status && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {s}
                            </Button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Type: {a.actionType}</span>
                          {a.requiredDocType && <span>| Doc: {a.requiredDocType}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drafts" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle>Draft Documents</CardTitle>
                <Badge variant="outline">{drafts.length} total</Badge>
              </CardHeader>
              <CardContent>
                {drafts.length === 0 ? (
                  <p className="text-center text-muted-foreground p-4">
                    No draft documents yet. Drafts are auto-generated when documents are ingested and actions created.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {drafts.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 rounded-md border space-y-2"
                        data-testid={`draft-card-${d.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                            <h3 className="font-medium truncate">{d.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge variant="secondary">{d.templateType}</Badge>
                            <Badge variant={d.status === "draft" ? "outline" : "default"}>
                              {d.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedDraftId(expandedDraftId === d.id ? null : d.id)}
                              data-testid={`button-expand-draft-${d.id}`}
                            >
                              {expandedDraftId === d.id ? "Collapse" : "View"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDraftMutation.mutate(d.id)}
                              data-testid={`button-delete-draft-${d.id}`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>

                        {expandedDraftId === d.id && (
                          <div className="bg-muted/50 rounded-md p-3 mt-2">
                            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed" data-testid={`draft-content-${d.id}`}>
                              {d.content}
                            </pre>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Created: {new Date(d.createdAt).toLocaleDateString()}</span>
                          {d.linkedFilingId && <span>| Filing linked</span>}
                          {d.linkedDeadlineId && <span>| Deadline linked</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
