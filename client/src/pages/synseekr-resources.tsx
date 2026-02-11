import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { ModelPicker, BatmodeBadge } from "@/components/model-picker";
import {
  Cpu,
  HardDrive,
  Activity,
  Wifi,
  WifiOff,
  Server,
  Brain,
  Gauge,
  Thermometer,
  MemoryStick,
  RefreshCw,
  ArrowRight,
  Cloud,
  Lock,
  Zap,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Key,
  Plug,
  Trash2,
  TestTube2,
  Shield,
} from "lucide-react";

interface DashboardData {
  policy: { mode: string; selectedModelId: string; modeLabel: string };
  isBatmode: boolean;
  selectedModel: string;
  synseekrConfigured: boolean;
  synseekrEnabled: boolean;
  synseekrHealth: {
    status: string;
    latencyMs: number;
    version?: string;
    services?: Record<string, string>;
    timestamp: string;
  } | null;
  systemMetrics: {
    cpu_percent?: number;
    memory_percent?: number;
    memory_used_gb?: number;
    memory_total_gb?: number;
    disk_percent?: number;
    disk_used_gb?: number;
    disk_total_gb?: number;
    uptime_hours?: number;
    load_average?: number[];
    process_count?: number;
  } | null;
  gpuStatus: {
    gpus?: Array<{
      index?: number;
      name?: string;
      memory_used_mb?: number;
      memory_total_mb?: number;
      memory_percent?: number;
      temperature_c?: number;
      utilization_percent?: number;
      power_draw_w?: number;
      power_limit_w?: number;
    }>;
    scheduler?: {
      queue_length?: number;
      active_tasks?: number;
      completed_tasks?: number;
    };
  } | null;
  modelCounts: {
    total: number;
    synseekr: number;
    local: number;
    cloud: number;
  };
  aiOps: {
    totalCalls: number;
    totalCostUsd: number;
    last24hCalls: number;
    last24hCostUsd: number;
    avgLatencyMs: number;
    successRate: number;
  };
  timestamp: string;
}

interface ProviderConnection {
  id: string;
  name: string;
  provider: string;
  connected: boolean;
  managed: "replit" | "user";
  description: string;
  envKey: string;
  maskedKey?: string;
  hasReplitFallback?: boolean;
}

function ProviderConnectionCard({
  conn,
  onSaveKey,
  onRemoveKey,
  onTestConnection,
  isSaving,
  isTesting,
  testResult,
  isAdmin,
}: {
  conn: ProviderConnection;
  onSaveKey: (providerId: string, key: string) => void;
  onRemoveKey: (providerId: string) => void;
  onTestConnection: (providerId: string) => void;
  isSaving: boolean;
  isTesting: boolean;
  testResult?: { success: boolean; latencyMs?: number; error?: string } | null;
  isAdmin: boolean;
}) {
  const [keyInput, setKeyInput] = useState("");
  const [editing, setEditing] = useState(false);

  const isUsingReplitKey = conn.managed === "replit";

  const providerColors: Record<string, string> = {
    anthropic: "text-orange-600 dark:text-orange-400",
    gemini: "text-blue-600 dark:text-blue-400",
    openai: "text-green-600 dark:text-green-400",
    deepseek: "text-purple-600 dark:text-purple-400",
  };

  return (
    <Card data-testid={`card-connection-${conn.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-muted p-2">
              <Plug className={`h-5 w-5 ${providerColors[conn.id] || "text-foreground"}`} />
            </div>
            <div>
              <p className="font-medium text-sm" data-testid={`text-provider-name-${conn.id}`}>
                {conn.name}
              </p>
              <p className="text-xs text-muted-foreground">{conn.description}</p>
            </div>
          </div>
          <Badge
            variant={conn.connected ? "default" : "outline"}
            data-testid={`badge-status-${conn.id}`}
          >
            {conn.connected ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Not Connected
              </>
            )}
          </Badge>
        </div>

        {conn.connected && isUsingReplitKey && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Using auto-configured key — add your own to use on any server</span>
          </div>
        )}

        {conn.connected && !isUsingReplitKey && conn.hasReplitFallback && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Using your key — auto-configured fallback available</span>
          </div>
        )}

        {conn.connected && conn.maskedKey && isAdmin && (
          <div className="flex items-center gap-2 text-xs">
            <Key className="h-3 w-3 text-muted-foreground" />
            <code className="bg-muted px-2 py-0.5 rounded text-xs" data-testid={`text-masked-key-${conn.id}`}>
              {conn.maskedKey}
            </code>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          {conn.connected && isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTestConnection(conn.id)}
              disabled={isTesting}
              data-testid={`button-test-${conn.id}`}
            >
              {isTesting ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <TestTube2 className="h-3.5 w-3.5 mr-1" />
              )}
              Test Connection
            </Button>
          )}

          {!editing && !conn.connected && isAdmin && (
            <Button
              size="sm"
              variant="default"
              onClick={() => setEditing(true)}
              data-testid={`button-add-key-${conn.id}`}
            >
              <Key className="h-3.5 w-3.5 mr-1" />
              Add API Key
            </Button>
          )}

          {conn.connected && !editing && isAdmin && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                data-testid={`button-update-key-${conn.id}`}
              >
                <Key className="h-3.5 w-3.5 mr-1" />
                Update Key
              </Button>
              {!isUsingReplitKey && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemoveKey(conn.id)}
                  data-testid={`button-remove-key-${conn.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Disconnect
                </Button>
              )}
            </>
          )}
        </div>

        {editing && isAdmin && (
          <div className="flex items-center gap-2">
            <Input
              type="password"
              placeholder={`Paste your ${conn.name} API key...`}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="text-xs"
              data-testid={`input-key-${conn.id}`}
            />
            <Button
              size="sm"
              onClick={() => {
                onSaveKey(conn.id, keyInput);
                setKeyInput("");
                setEditing(false);
              }}
              disabled={isSaving || keyInput.length < 10}
              data-testid={`button-save-key-${conn.id}`}
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setEditing(false); setKeyInput(""); }}
              data-testid={`button-cancel-key-${conn.id}`}
            >
              Cancel
            </Button>
          </div>
        )}

        {testResult && (
          <div className={`text-xs flex items-center gap-1 ${testResult.success ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>
            {testResult.success ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Connection successful{testResult.latencyMs ? ` (${testResult.latencyMs}ms)` : ""}
              </>
            ) : (
              <>
                <AlertTriangle className="h-3 w-3" />
                {testResult.error || "Connection failed"}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "online"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : "bg-yellow-500";
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${color}`}
      data-testid="indicator-status-dot"
    />
  );
}

export default function SynSeekrResourcesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latencyMs?: number; error?: string }>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["/api/synseekr-resources/dashboard"],
    refetchInterval: 15000,
  });

  const { data: connectionsData } = useQuery<{ connections: ProviderConnection[]; isAdmin: boolean }>({
    queryKey: ["/api/ai-connections"],
  });

  const toggleModeMutation = useMutation({
    mutationFn: async (newMode: string) => {
      const res = await apiRequest("POST", "/api/ai/policy/mode", { mode: newMode });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/synseekr-resources/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/policy/state"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/models"] });
    },
  });

  const saveKeyMutation = useMutation({
    mutationFn: async ({ providerId, apiKey }: { providerId: string; apiKey: string }) => {
      const res = await apiRequest("POST", `/api/ai-connections/${providerId}/key`, { apiKey });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/synseekr-resources/dashboard"] });
      toast({ title: "API key saved", description: `${variables.providerId} connection configured successfully.` });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save key", description: err.message, variant: "destructive" });
    },
  });

  const removeKeyMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const res = await apiRequest("DELETE", `/api/ai-connections/${providerId}/key`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-connections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/synseekr-resources/dashboard"] });
      toast({ title: "Disconnected", description: "API key removed." });
    },
  });

  const handleTestConnection = async (providerId: string) => {
    setTestingProvider(providerId);
    setTestResults((prev) => ({ ...prev, [providerId]: undefined as any }));
    try {
      const res = await apiRequest("POST", `/api/ai-connections/${providerId}/test`);
      const result = await res.json();
      setTestResults((prev) => ({ ...prev, [providerId]: result }));
    } catch {
      setTestResults((prev) => ({ ...prev, [providerId]: { success: false, error: "Test request failed" } }));
    } finally {
      setTestingProvider(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading-resources">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <AlertTriangle className="h-6 w-6 mr-2" />
        <span>Failed to load resource data</span>
      </div>
    );
  }

  const isBatmode = data.isBatmode;
  const health = data.synseekrHealth;
  const metrics = data.systemMetrics;
  const gpu = data.gpuStatus;

  return (
    <div className="flex flex-col h-full" data-testid="page-synseekr-resources">
      <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">
            AI Resources
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor AI infrastructure, switch between private and cloud models
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/synseekr-resources/dashboard"] })}
            data-testid="button-refresh-dashboard"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Link href="/model-advisor">
            <Button size="sm" variant="outline" data-testid="button-open-model-advisor">
              <Brain className="h-4 w-4 mr-1" />
              Model Advisor
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
          <Card data-testid="card-mode-switcher">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {isBatmode ? (
                    <div className="rounded-md bg-green-500/10 p-2">
                      <Lock className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  ) : (
                    <div className="rounded-md bg-blue-500/10 p-2">
                      <Cloud className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium" data-testid="text-current-mode">
                      {isBatmode ? "SynSeekr Private" : "Full Integrated"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isBatmode
                        ? "Using local SynSeekr models only — no data leaves your server"
                        : "Cloud AI models active (Claude, GPT, Gemini) + local models"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <ModelPicker />
                  <div className="flex items-center gap-2">
                    <Button
                      variant={!isBatmode ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleModeMutation.mutate("online")}
                      disabled={toggleModeMutation.isPending || !isBatmode}
                      data-testid="button-mode-integrated"
                    >
                      <Cloud className="h-4 w-4 mr-1" />
                      Full Integrated
                    </Button>
                    <Button
                      variant={isBatmode ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleModeMutation.mutate("batmode")}
                      disabled={toggleModeMutation.isPending || isBatmode}
                      data-testid="button-mode-private"
                    >
                      <Lock className="h-4 w-4 mr-1" />
                      SynSeekr Private
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <Server className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-models">
                    {data.modelCounts.total}
                  </p>
                  <p className="text-xs text-muted-foreground">Available Models</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <Cpu className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-local-models">
                    {data.modelCounts.local}
                  </p>
                  <p className="text-xs text-muted-foreground">Local / Private</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <Cloud className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-cloud-models">
                    {data.modelCounts.cloud}
                  </p>
                  <p className="text-xs text-muted-foreground">Cloud Models</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <Activity className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-ai-calls">
                    {data.aiOps.last24hCalls}
                  </p>
                  <p className="text-xs text-muted-foreground">AI Calls (24h)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="resources" className="w-full">
            <TabsList data-testid="tabs-resources">
              <TabsTrigger value="resources" data-testid="tab-resources">
                <Cpu className="h-3.5 w-3.5 mr-1" />
                Server Resources
              </TabsTrigger>
              <TabsTrigger value="ai-ops" data-testid="tab-ai-ops">
                <Zap className="h-3.5 w-3.5 mr-1" />
                AI Operations
              </TabsTrigger>
              <TabsTrigger value="models" data-testid="tab-models-overview">
                <Brain className="h-3.5 w-3.5 mr-1" />
                Model Selection
              </TabsTrigger>
              <TabsTrigger value="connections" data-testid="tab-connections">
                <Key className="h-3.5 w-3.5 mr-1" />
                API Connections
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resources" className="mt-4 space-y-4">
              {!data.synseekrConfigured ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">SynSeekr Server Not Configured</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your SynSeekr server in Settings to see resource monitoring.
                      SynSeekr runs your private AI models locally.
                    </p>
                    <Link href="/settings">
                      <Button variant="outline" data-testid="button-goto-settings">
                        Go to Settings
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : !isBatmode ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Cloud className="h-12 w-12 mx-auto text-blue-500 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Full Integrated Mode Active</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Resource monitoring shows your SynSeekr server's GPU and CPU when in
                      SynSeekr Private mode. Switch modes above to see live metrics.
                    </p>
                    {health && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <StatusDot status={health.status} />
                        <span>SynSeekr server is {health.status}</span>
                        {health.latencyMs > 0 && (
                          <span className="text-muted-foreground">({health.latencyMs}ms)</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                        <Server className="h-4 w-4" />
                        SynSeekr Server Status
                        {health && (
                          <Badge
                            variant={health.status === "online" ? "default" : "destructive"}
                            className="ml-auto"
                            data-testid="badge-server-status"
                          >
                            <StatusDot status={health.status} />
                            <span className="ml-1 capitalize">{health.status}</span>
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {health && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs">Latency</p>
                            <p className="font-medium" data-testid="text-latency">
                              {health.latencyMs}ms
                            </p>
                          </div>
                          {health.version && (
                            <div>
                              <p className="text-muted-foreground text-xs">Version</p>
                              <p className="font-medium">{health.version}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground text-xs">Last Check</p>
                            <p className="font-medium">
                              {new Date(health.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          {health.services && (
                            <div>
                              <p className="text-muted-foreground text-xs">Services</p>
                              <p className="font-medium">{Object.keys(health.services).length} active</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {metrics ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Cpu className="h-4 w-4" />
                            CPU
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-end justify-between gap-2">
                            <p className="text-3xl font-bold" data-testid="text-cpu-percent">
                              {(metrics.cpu_percent ?? 0).toFixed(1)}%
                            </p>
                            {metrics.load_average && (
                              <p className="text-xs text-muted-foreground">
                                Load: {metrics.load_average.map(l => l.toFixed(2)).join(" / ")}
                              </p>
                            )}
                          </div>
                          <Progress
                            value={metrics.cpu_percent ?? 0}
                            className="h-2"
                            data-testid="progress-cpu"
                          />
                          {metrics.process_count !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              {metrics.process_count} processes
                            </p>
                          )}
                          {metrics.uptime_hours !== undefined && (
                            <p className="text-xs text-muted-foreground">
                              Uptime: {metrics.uptime_hours.toFixed(1)}h
                            </p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <MemoryStick className="h-4 w-4" />
                            RAM
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-end justify-between gap-2">
                            <p className="text-3xl font-bold" data-testid="text-memory-percent">
                              {(metrics.memory_percent ?? 0).toFixed(1)}%
                            </p>
                            {metrics.memory_used_gb !== undefined && metrics.memory_total_gb !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                {metrics.memory_used_gb.toFixed(1)} / {metrics.memory_total_gb.toFixed(1)} GB
                              </p>
                            )}
                          </div>
                          <Progress
                            value={metrics.memory_percent ?? 0}
                            className="h-2"
                            data-testid="progress-memory"
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            Disk
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-end justify-between gap-2">
                            <p className="text-3xl font-bold" data-testid="text-disk-percent">
                              {(metrics.disk_percent ?? 0).toFixed(1)}%
                            </p>
                            {metrics.disk_used_gb !== undefined && metrics.disk_total_gb !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                {metrics.disk_used_gb.toFixed(1)} / {metrics.disk_total_gb.toFixed(1)} GB
                              </p>
                            )}
                          </div>
                          <Progress
                            value={metrics.disk_percent ?? 0}
                            className="h-2"
                            data-testid="progress-disk"
                          />
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        <Cpu className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">Waiting for system metrics from SynSeekr server...</p>
                      </CardContent>
                    </Card>
                  )}

                  {gpu && gpu.gpus && gpu.gpus.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Gauge className="h-4 w-4" />
                        GPU / VRAM
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {gpu.gpus.map((g, idx) => (
                          <Card key={idx} data-testid={`card-gpu-${idx}`}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                                <Gauge className="h-4 w-4" />
                                {g.name || `GPU ${g.index ?? idx}`}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                                  <span className="text-muted-foreground">GPU Utilization</span>
                                  <span className="font-medium" data-testid={`text-gpu-util-${idx}`}>
                                    {(g.utilization_percent ?? 0).toFixed(0)}%
                                  </span>
                                </div>
                                <Progress
                                  value={g.utilization_percent ?? 0}
                                  className="h-2"
                                  data-testid={`progress-gpu-util-${idx}`}
                                />
                              </div>

                              <div>
                                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                                  <span className="text-muted-foreground">VRAM</span>
                                  <span className="font-medium" data-testid={`text-vram-${idx}`}>
                                    {g.memory_used_mb !== undefined && g.memory_total_mb !== undefined
                                      ? `${formatBytes(g.memory_used_mb)} / ${formatBytes(g.memory_total_mb)}`
                                      : `${(g.memory_percent ?? 0).toFixed(0)}%`}
                                  </span>
                                </div>
                                <Progress
                                  value={g.memory_percent ?? 0}
                                  className="h-2"
                                  data-testid={`progress-vram-${idx}`}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm">
                                {g.temperature_c !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <Thermometer className="h-3 w-3 text-muted-foreground" />
                                    <span
                                      className={g.temperature_c > 80 ? "text-red-500 font-medium" : ""}
                                      data-testid={`text-gpu-temp-${idx}`}
                                    >
                                      {g.temperature_c}°C
                                    </span>
                                  </div>
                                )}
                                {g.power_draw_w !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <Zap className="h-3 w-3 text-muted-foreground" />
                                    <span data-testid={`text-gpu-power-${idx}`}>
                                      {g.power_draw_w.toFixed(0)}W
                                      {g.power_limit_w ? ` / ${g.power_limit_w.toFixed(0)}W` : ""}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {gpu.scheduler && (
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-6 text-sm flex-wrap">
                              <div>
                                <p className="text-xs text-muted-foreground">Queue</p>
                                <p className="font-medium" data-testid="text-queue-length">
                                  {gpu.scheduler.queue_length ?? 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Active Tasks</p>
                                <p className="font-medium" data-testid="text-active-tasks">
                                  {gpu.scheduler.active_tasks ?? 0}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Completed</p>
                                <p className="font-medium" data-testid="text-completed-tasks">
                                  {gpu.scheduler.completed_tasks ?? 0}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : isBatmode ? (
                    <Card>
                      <CardContent className="p-6 text-center text-muted-foreground">
                        <Gauge className="h-8 w-8 mx-auto mb-2" />
                        <p className="text-sm">No GPU data available. Ensure SynSeekr server exposes GPU metrics.</p>
                      </CardContent>
                    </Card>
                  ) : null}
                </>
              )}
            </TabsContent>

            <TabsContent value="ai-ops" className="mt-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <Activity className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-ops-total">
                        {data.aiOps.totalCalls}
                      </p>
                      <p className="text-xs text-muted-foreground">Total AI Calls</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <DollarSign className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-ops-cost">
                        ${data.aiOps.totalCostUsd.toFixed(4)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <Clock className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold" data-testid="text-ops-latency">
                        {data.aiOps.avgLatencyMs}ms
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Latency</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Last 24 Hours</p>
                      <p className="text-xs text-muted-foreground">
                        {data.aiOps.last24hCalls} calls — ${data.aiOps.last24hCostUsd.toFixed(4)} cost
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium" data-testid="text-success-rate">
                        {data.aiOps.successRate.toFixed(1)}% success
                      </span>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {isBatmode
                        ? "Private mode — all inference runs on SynSeekr (no external API cost)"
                        : "Integrated mode — costs from external API calls (Claude, GPT, Gemini)"}
                    </p>
                    {isBatmode && (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Zero API Cost
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="models" className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">Current Model</p>
                      <p className="text-lg font-bold" data-testid="text-selected-model">
                        {data.selectedModel}
                      </p>
                    </div>
                    <Badge
                      variant={isBatmode ? "default" : "outline"}
                      className="gap-1"
                      data-testid="badge-mode-label"
                    >
                      {isBatmode ? (
                        <>
                          <Lock className="h-3 w-3" />
                          SynSeekr Private
                        </>
                      ) : (
                        <>
                          <Wifi className="h-3 w-3" />
                          Full Integrated
                        </>
                      )}
                    </Badge>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4 text-green-600 dark:text-green-400" />
                        SynSeekr Private Models ({data.modelCounts.synseekr})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Run on your hardware. No data leaves your network.
                        Free to use, limited by GPU/VRAM capacity.
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                        <li>Qwen 2.5 7B — General chat, RAG, code</li>
                        <li>BGE-M3 — Embeddings, search, reranking</li>
                        <li>Whisper — Audio transcription</li>
                        <li>GLiNER — Entity extraction</li>
                        <li>Presidio — PII detection</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        Cloud Models ({data.modelCounts.cloud})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Frontier-quality models from Anthropic, OpenAI, Google.
                        Requires API keys. Per-token cost applies.
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 pl-4">
                        <li>Claude Sonnet, Opus, Haiku — Anthropic</li>
                        <li>GPT-5.2, GPT-4o — OpenAI</li>
                        <li>Gemini 2.5 Flash/Pro, Gemini 3 — Google</li>
                        <li>DeepSeek Chat — DeepSeek</li>
                      </ul>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      Use the Model Advisor to compare models, get task-specific recommendations,
                      and track upgrade opportunities.
                    </p>
                    <Link href="/model-advisor">
                      <Button variant="outline" size="sm" data-testid="button-advisor-link">
                        <Brain className="h-4 w-4 mr-1" />
                        Open Model Advisor
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="connections" className="mt-4 space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-muted p-2">
                      <Key className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">API Connections</p>
                      <p className="text-xs text-muted-foreground">
                        Connect your own API keys for all AI providers. Your keys are used first,
                        with auto-configured keys as fallback when available. Portable across any server.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connectionsData?.connections?.map((conn) => (
                  <ProviderConnectionCard
                    key={conn.id}
                    conn={conn}
                    onSaveKey={(providerId, key) => saveKeyMutation.mutate({ providerId, apiKey: key })}
                    onRemoveKey={(providerId) => removeKeyMutation.mutate(providerId)}
                    onTestConnection={handleTestConnection}
                    isSaving={saveKeyMutation.isPending}
                    isTesting={testingProvider === conn.id}
                    testResult={testResults[conn.id]}
                    isAdmin={connectionsData?.isAdmin ?? false}
                  />
                ))}
              </div>

              {(!connectionsData?.connections || connectionsData.connections.length === 0) && (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Loading connections...</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        API keys are stored securely on the server. Keys are never exposed to the browser
                        — only masked previews are shown. When in SynSeekr Private mode, no external API
                        calls are made regardless of which keys are configured.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center">
            Last updated: {new Date(data.timestamp).toLocaleTimeString()}
            {" — "}Auto-refreshes every 15 seconds
          </p>
        </div>
      </div>
    </div>
  );
}
