import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Radar,
  Plus,
  ArrowLeft,
  ExternalLink,
  Star,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Info,
  ShieldAlert,
  Building2,
  User,
  Globe,
  MapPin,
  Phone,
  Mail,
  FileText,
  Link2,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SEVERITY_CONFIG: Record<string, { variant: "destructive" | "outline" | "secondary" | "default"; icon: typeof AlertTriangle }> = {
  critical: { variant: "destructive", icon: ShieldAlert },
  warning: { variant: "outline", icon: AlertTriangle },
  info: { variant: "secondary", icon: Info },
  success: { variant: "default", icon: CheckCircle },
};

const ENTITY_ICONS: Record<string, typeof Building2> = {
  company: Building2,
  person: User,
  domain: Globe,
  address: MapPin,
  phone: Phone,
  email: Mail,
  license: FileText,
  case: FileText,
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SynSeekerPage() {
  const [, params] = useRoute("/synseeker/:id");
  const [, setLocation] = useLocation();
  const investigationId = params?.id;

  if (investigationId) {
    return <InvestigationDetail id={investigationId} onBack={() => setLocation("/synseeker")} />;
  }

  return <InvestigationList />;
}

function InvestigationList() {
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{
    data: any[];
    pagination: { total: number };
  }>({
    queryKey: ["/api/investigations"],
  });

  const investigations = data?.data || [];

  return (
    <div className="h-full overflow-auto p-6" data-testid="synseeker-page">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Radar className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-synseeker-title">SynSeeker</h1>
              <p className="text-sm text-muted-foreground">Automated entity investigation engine</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-investigation">
                <Plus className="h-4 w-4 mr-2" />
                New Investigation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Investigation</DialogTitle>
                <DialogDescription>Configure and launch an automated entity investigation.</DialogDescription>
              </DialogHeader>
              <NewInvestigationForm
                onCreated={(id: string) => {
                  setDialogOpen(false);
                  setLocation(`/synseeker/${id}`);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : investigations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Radar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Investigations Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Launch your first investigation to uncover entity connections, compliance gaps, and hidden relationships.
              </p>
              <Button onClick={() => setDialogOpen(true)} data-testid="button-first-investigation">
                <Plus className="h-4 w-4 mr-2" />
                Start First Investigation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {investigations.map((inv: any) => (
              <Card
                key={inv.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setLocation(`/synseeker/${inv.id}`)}
                data-testid={`card-investigation-${inv.id}`}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate" data-testid={`text-target-${inv.id}`}>
                        {inv.targetName}
                      </h3>
                      <StatusBadge status={inv.status} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                      {inv.targetDomain && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" /> {inv.targetDomain}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDate(inv.createdAt)}
                      </span>
                      {inv.scanDuration && (
                        <span>{formatDuration(inv.scanDuration)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <StatPill label="Findings" value={inv.totalFindings} />
                    <StatPill label="Critical" value={inv.criticalFlags} critical />
                    <StatPill label="Entities" value={inv.entityCount} />
                    {inv.aiRiskScore !== null && inv.aiRiskScore !== undefined && (
                      <RiskScoreBadge score={inv.aiRiskScore} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value, critical }: { label: string; value: number; critical?: boolean }) {
  return (
    <div className="text-center min-w-[56px]">
      <div className={`text-lg font-bold ${critical && value > 0 ? "text-destructive" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "destructive" | "outline" | "secondary" | "default"; label: string }> = {
    queued: { variant: "outline", label: "Queued" },
    scanning: { variant: "secondary", label: "Scanning" },
    analyzing: { variant: "secondary", label: "Analyzing" },
    complete: { variant: "default", label: "Complete" },
    failed: { variant: "destructive", label: "Failed" },
    archived: { variant: "outline", label: "Archived" },
  };
  const c = config[status] || config.queued;
  return <Badge variant={c.variant} data-testid={`badge-status-${status}`}>{c.label}</Badge>;
}

function RiskScoreBadge({ score }: { score: number }) {
  let variant: "destructive" | "outline" | "secondary" | "default" = "default";
  if (score >= 70) variant = "destructive";
  else if (score >= 40) variant = "outline";
  else variant = "secondary";

  return (
    <Badge variant={variant} data-testid="badge-risk-score">
      Risk: {score}
    </Badge>
  );
}

function NewInvestigationForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [targetName, setTargetName] = useState("");
  const [targetDomain, setTargetDomain] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [targetState, setTargetState] = useState("UT");
  const [templateId, setTemplateId] = useState("custom");
  const { toast } = useToast();

  const { data: templates } = useQuery<any[]>({
    queryKey: ["/api/investigations/templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/investigations", data);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/investigations"] });
      toast({ title: "Investigation launched", description: `Scanning ${data.targetName}...` });
      onCreated(data.id);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to start investigation", description: err.message, variant: "destructive" });
    },
  });

  const selectedTemplate = templates?.find((t: any) => t.id === templateId);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template">Investigation Template</Label>
        <Select value={templateId} onValueChange={setTemplateId}>
          <SelectTrigger data-testid="select-template">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">Custom Investigation</SelectItem>
            {templates?.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTemplate && (
          <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetName">Target Name *</Label>
        <Input
          id="targetName"
          placeholder="e.g. Acme Medical Holdings LLC"
          value={targetName}
          onChange={(e) => setTargetName(e.target.value)}
          data-testid="input-target-name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetDomain">Domain (optional)</Label>
        <Input
          id="targetDomain"
          placeholder="e.g. acmemedical.com"
          value={targetDomain}
          onChange={(e) => setTargetDomain(e.target.value)}
          data-testid="input-target-domain"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="targetState">State</Label>
          <Input
            id="targetState"
            placeholder="UT"
            value={targetState}
            onChange={(e) => setTargetState(e.target.value.toUpperCase())}
            maxLength={2}
            data-testid="input-target-state"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetAddress">Address (optional)</Label>
          <Input
            id="targetAddress"
            placeholder="123 Main St"
            value={targetAddress}
            onChange={(e) => setTargetAddress(e.target.value)}
            data-testid="input-target-address"
          />
        </div>
      </div>

      <Button
        className="w-full"
        disabled={!targetName.trim() || createMutation.isPending}
        onClick={() =>
          createMutation.mutate({
            targetName: targetName.trim(),
            targetDomain: targetDomain.trim() || undefined,
            targetAddress: targetAddress.trim() || undefined,
            targetState: targetState.trim() || "UT",
            templateId,
            sources: selectedTemplate?.sources,
          })
        }
        data-testid="button-launch-investigation"
      >
        {createMutation.isPending ? "Launching..." : "Launch Investigation"}
      </Button>
    </div>
  );
}

function InvestigationDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("findings");
  const { toast } = useToast();

  const { data: investigation, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/investigations", id],
  });

  const isScanning = investigation?.status === "scanning" || investigation?.status === "analyzing";

  useEffect(() => {
    if (!isScanning) return;

    const eventSource = new EventSource(`/api/investigations/${id}/stream`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.done) {
          refetch();
          eventSource.close();
        } else {
          queryClient.setQueryData(["/api/investigations", id], (old: any) => {
            if (!old) return old;
            return { ...old, ...data };
          });
        }
      } catch {
        // ignore
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
      refetch();
    };

    return () => eventSource.close();
  }, [id, isScanning, refetch]);

  if (isLoading) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!investigation) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Investigation not found.</p>
            <Button variant="outline" className="mt-4" onClick={onBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6" data-testid="investigation-detail">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold truncate" data-testid="text-investigation-name">
                {investigation.targetName}
              </h1>
              <StatusBadge status={investigation.status} />
            </div>
            {investigation.targetDomain && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Globe className="h-3 w-3" /> {investigation.targetDomain}
              </p>
            )}
          </div>
        </div>

        {isScanning && (
          <ScanningView investigation={investigation} />
        )}

        {!isScanning && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <SummaryCard label="Total Findings" value={investigation.totalFindings} />
              <SummaryCard label="Critical Flags" value={investigation.criticalFlags} critical />
              <SummaryCard label="Entities" value={investigation.entityCount} />
              <SummaryCard label="Connections" value={investigation.connectionCount} />
              <SummaryCard
                label="Risk Score"
                value={investigation.aiRiskScore ?? "-"}
                critical={(investigation.aiRiskScore ?? 0) >= 70}
              />
            </div>

            {investigation.aiSummary && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">AI Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-ai-summary">
                    {investigation.aiSummary}
                  </p>
                </CardContent>
              </Card>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList data-testid="tabs-investigation">
                <TabsTrigger value="findings" data-testid="tab-findings">
                  Findings ({investigation.findings?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="entities" data-testid="tab-entities">
                  Entities ({investigation.entities?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="connections" data-testid="tab-connections">
                  Connections ({investigation.connections?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="log" data-testid="tab-log">
                  Scan Log
                </TabsTrigger>
              </TabsList>

              <TabsContent value="findings" className="mt-4">
                <FindingsTab findings={investigation.findings || []} />
              </TabsContent>
              <TabsContent value="entities" className="mt-4">
                <EntitiesTab entities={investigation.entities || []} />
              </TabsContent>
              <TabsContent value="connections" className="mt-4">
                <ConnectionsTab
                  connections={investigation.connections || []}
                  entities={investigation.entities || []}
                />
              </TabsContent>
              <TabsContent value="log" className="mt-4">
                <ScanLogTab scanLog={investigation.scanLog || []} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, critical }: { label: string; value: number | string; critical?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <div className={`text-2xl font-bold ${critical ? "text-destructive" : ""}`} data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function ScanningView({ investigation }: { investigation: any }) {
  const scanLog = (investigation.scanLog || []) as any[];
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scanLog.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Investigation in Progress</CardTitle>
        <CardDescription>
          {investigation.status === "scanning" ? "Scanning data sources..." : "Running AI analysis..."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Progress value={investigation.progress} className="flex-1" data-testid="progress-scan" />
          <span className="text-sm font-medium w-12 text-right">{investigation.progress}%</span>
        </div>

        <div className="bg-muted rounded-md p-3 max-h-64 overflow-y-auto font-mono text-xs space-y-1">
          {scanLog.map((entry: any, i: number) => {
            const color =
              entry.result === "error" ? "text-destructive" :
              entry.result === "warning" ? "text-yellow-600 dark:text-yellow-400" :
              entry.result === "success" ? "text-green-600 dark:text-green-400" :
              "text-muted-foreground";

            return (
              <div key={i} className={`${color}`} data-testid={`log-entry-${i}`}>
                <span className="opacity-50">
                  [{new Date(entry.timestamp).toLocaleTimeString()}]
                </span>{" "}
                <span className="font-semibold">[{entry.source}]</span> {entry.message}
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span>Findings: {investigation.totalFindings || 0}</span>
          <span>Critical: {investigation.criticalFlags || 0}</span>
          <span>Entities: {investigation.entityCount || 0}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function FindingsTab({ findings }: { findings: any[] }) {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const { toast } = useToast();

  const toggleMutation = useMutation({
    mutationFn: async ({ findingId, field, value }: { findingId: string; field: string; value: boolean }) => {
      const res = await apiRequest("PATCH", `/api/investigation-findings/${findingId}`, { [field]: value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investigations"] });
    },
  });

  const filtered = findings.filter((f) => {
    if (severityFilter !== "all" && f.severity !== severityFilter) return false;
    if (!showDismissed && f.dismissed) return false;
    return true;
  });

  const grouped = filtered.reduce((acc: Record<string, any[]>, f) => {
    const source = f.source || "Other";
    if (!acc[source]) acc[source] = [];
    acc[source].push(f);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40" data-testid="select-severity-filter">
            <SelectValue placeholder="Filter severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="success">Success</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDismissed(!showDismissed)}
          className={showDismissed ? "toggle-elevate toggle-elevated" : ""}
          data-testid="button-toggle-dismissed"
        >
          <EyeOff className="h-3 w-3 mr-1" />
          {showDismissed ? "Showing Dismissed" : "Show Dismissed"}
        </Button>
        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} finding{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {Object.entries(grouped).map(([source, items]) => (
        <div key={source}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            {source}
          </h3>
          <div className="space-y-2">
            {items.map((finding: any) => {
              const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info;
              const SeverityIcon = config.icon;

              return (
                <Card
                  key={finding.id}
                  className={finding.dismissed ? "opacity-50" : ""}
                  data-testid={`finding-${finding.id}`}
                >
                  <CardContent className="py-3">
                    <div className="flex items-start gap-3">
                      <SeverityIcon className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{finding.title}</span>
                          <Badge variant={config.variant} className="text-xs">
                            {finding.severity}
                          </Badge>
                          {(finding.tags as string[])?.slice(0, 3).map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                          {finding.body}
                        </p>
                        {finding.url && (
                          <a
                            href={finding.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-foreground underline flex items-center gap-1 mt-1"
                            data-testid={`link-finding-url-${finding.id}`}
                          >
                            <ExternalLink className="h-3 w-3" /> Source
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMutation.mutate({
                              findingId: finding.id,
                              field: "starred",
                              value: !finding.starred,
                            });
                          }}
                          data-testid={`button-star-${finding.id}`}
                        >
                          <Star className={`h-4 w-4 ${finding.starred ? "fill-current text-foreground" : ""}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMutation.mutate({
                              findingId: finding.id,
                              field: "dismissed",
                              value: !finding.dismissed,
                            });
                          }}
                          data-testid={`button-dismiss-${finding.id}`}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No findings match the current filter.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EntitiesTab({ entities }: { entities: any[] }) {
  const typeGroups = entities.reduce((acc: Record<string, any[]>, entity) => {
    const type = entity.type || "unknown";
    if (!acc[type]) acc[type] = [];
    acc[type].push(entity);
    return acc;
  }, {});

  if (entities.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No entities discovered.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(typeGroups).map(([type, items]) => {
        const EntityIcon = ENTITY_ICONS[type] || FileText;

        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <EntityIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {type} ({items.length})
              </h3>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role / Detail</TableHead>
                    {(type === "license" || type === "company") && <TableHead>ID</TableHead>}
                    {type !== "email" && type !== "phone" && <TableHead>Location</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((entity: any) => (
                    <TableRow key={entity.id} data-testid={`entity-${entity.id}`}>
                      <TableCell className="font-medium">{entity.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{entity.role || "-"}</TableCell>
                      {(type === "license" || type === "company") && (
                        <TableCell className="text-sm">{entity.npi || entity.sosId || "-"}</TableCell>
                      )}
                      {type !== "email" && type !== "phone" && (
                        <TableCell className="text-sm text-muted-foreground">
                          {entity.state || entity.address || "-"}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConnectionsTab({ connections, entities }: { connections: any[]; entities: any[] }) {
  const entityMap = new Map(entities.map((e: any) => [e.id, e]));

  if (connections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No connections mapped.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source Entity</TableHead>
            <TableHead>Relationship</TableHead>
            <TableHead>Target Entity</TableHead>
            <TableHead>Strength</TableHead>
            <TableHead>Evidence</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.map((conn: any) => {
            const sourceEntity = entityMap.get(conn.sourceEntityId);
            const targetEntity = entityMap.get(conn.targetEntityId);

            return (
              <TableRow key={conn.id} data-testid={`connection-${conn.id}`}>
                <TableCell className="font-medium text-sm">
                  {sourceEntity?.name || conn.sourceEntityId}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    <Link2 className="h-3 w-3 mr-1" />
                    {conn.relationship?.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium text-sm">
                  {targetEntity?.name || conn.targetEntityId}
                </TableCell>
                <TableCell>
                  <Badge variant={conn.strength === "confirmed" ? "default" : "secondary"} className="text-xs">
                    {conn.strength || "unknown"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                  {conn.evidence || "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ScanLogTab({ scanLog }: { scanLog: any[] }) {
  if (scanLog.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No scan log entries.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-3">
        <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
          {scanLog.map((entry: any, i: number) => {
            const color =
              entry.result === "error" ? "text-destructive" :
              entry.result === "warning" ? "text-yellow-600 dark:text-yellow-400" :
              entry.result === "success" ? "text-green-600 dark:text-green-400" :
              "text-muted-foreground";

            return (
              <div key={i} className={color}>
                <span className="opacity-50">
                  [{new Date(entry.timestamp).toLocaleTimeString()}]
                </span>{" "}
                <span className="font-semibold">[{entry.source}]</span> {entry.message}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
