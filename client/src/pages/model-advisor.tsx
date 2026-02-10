import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Brain,
  RefreshCw,
  AlertTriangle,
  X,
  Cpu,
  Star,
  TrendingUp,
  ArrowUpRight,
  Activity,
  Loader2,
  CheckCircle2,
  Sparkles,
  Gauge,
  Server,
} from "lucide-react";

interface IntelEntry {
  id: string;
  modelId: string;
  displayName: string;
  provider: string;
  category: string;
  capabilities: string[];
  license: string;
  parameterSize: string;
  quantization: string | null;
  contextWindow: number;
  qualityScores: Record<string, number>;
  tasksRecommended: string[];
  replacesModelId: string | null;
  sourceUrl: string | null;
  notes: string | null;
  updatedAt: string;
}

interface Recommendation {
  id: string;
  taskType: string;
  modelId: string;
  rank: number;
  reason: string;
  performanceNotes: string | null;
  sizeEfficiency: string | null;
  isCurrentBest: boolean;
}

interface Alert {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  description: string;
  relatedModelId: string | null;
  suggestedAction: string | null;
  acknowledged: boolean;
  acknowledgedBy: string | null;
}

interface StatusData {
  lastRefresh: string | null;
  totalEntries: number;
  activeAlerts: number;
  taskTypes: number;
  isSeeded: boolean;
}

const taskTypeLabels: Record<string, string> = {
  general_chat: "General Chat",
  legal_analysis: "Legal Analysis",
  code_generation: "Code Generation",
  embeddings: "Embeddings",
  transcription: "Transcription",
  ner: "Named Entity Recognition",
  pii_detection: "PII Detection",
  reranking: "Reranking",
  document_analysis: "Document Analysis",
  rag_queries: "RAG Queries",
  complex_reasoning: "Complex Reasoning",
  vision: "Vision / OCR",
};

const categoryIcons: Record<string, any> = {
  chat: Brain,
  embeddings: Cpu,
  transcription: Activity,
  ner: Sparkles,
  pii: CheckCircle2,
  reranking: TrendingUp,
};

const severityColors: Record<string, string> = {
  info: "border-blue-500/30 text-blue-600 dark:text-blue-400",
  warning: "border-yellow-500/30 text-yellow-600 dark:text-yellow-400",
  critical: "border-red-500/30 text-red-600 dark:text-red-400",
};

const providerColors: Record<string, string> = {
  alibaba: "text-blue-600 dark:text-blue-400",
  meta: "text-indigo-600 dark:text-indigo-400",
  mistral: "text-orange-600 dark:text-orange-400",
  deepseek: "text-teal-600 dark:text-teal-400",
  google: "text-green-600 dark:text-green-400",
  openai: "text-violet-600 dark:text-violet-400",
  nomic: "text-pink-600 dark:text-pink-400",
  sentence_transformers: "text-cyan-600 dark:text-cyan-400",
};

export default function ModelAdvisorPage() {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: status, isLoading: statusLoading } = useQuery<StatusData>({
    queryKey: ["/api/model-intel/status"],
  });

  const { data: entriesData, isLoading: entriesLoading } = useQuery<{ entries: IntelEntry[] }>({
    queryKey: ["/api/model-intel/entries"],
  });

  const { data: recsData } = useQuery<{ recommendations: Recommendation[] }>({
    queryKey: ["/api/model-intel/recommendations"],
  });

  const { data: taskRecsData } = useQuery<{ taskType: string; recommendations: any[] }>({
    queryKey: [`/api/model-intel/recommendations?task=${selectedTask}`],
    enabled: !!selectedTask,
  });

  const { data: alertsData } = useQuery<{ alerts: Alert[] }>({
    queryKey: ["/api/model-intel/alerts"],
  });

  const { data: tasksData } = useQuery<{ tasks: string[] }>({
    queryKey: ["/api/model-intel/tasks"],
  });

  const refreshMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/model-intel/refresh"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/model-intel/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/model-intel/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/model-intel/recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/model-intel/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/model-intel/tasks"] });
      toast({ title: "Intelligence refreshed" });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/model-intel/alerts/${id}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/model-intel/alerts"] });
      toast({ title: "Alert dismissed" });
    },
  });

  const entries = entriesData?.entries || [];
  const recommendations = recsData?.recommendations || [];
  const alerts = alertsData?.alerts || [];
  const tasks = tasksData?.tasks || [];

  const taskRecs = selectedTask && taskRecsData ? taskRecsData.recommendations : null;

  const isLoading = statusLoading || entriesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="page-model-advisor">
      <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-advisor-title">Model Intelligence Advisor</h1>
          <p className="text-sm text-muted-foreground">Track and compare open-source models for your SynSeekr deployment</p>
        </div>
        <div className="flex items-center gap-2">
          {status?.lastRefresh && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(status.lastRefresh).toLocaleDateString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            data-testid="button-refresh-intel"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <Brain className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-models">{status?.totalEntries || 0}</p>
                  <p className="text-xs text-muted-foreground">Tracked Models</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <Gauge className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-tasks">{status?.taskTypes || 0}</p>
                  <p className="text-xs text-muted-foreground">Task Categories</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <Star className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{recommendations.length}</p>
                  <p className="text-xs text-muted-foreground">Recommendations</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-md bg-muted p-2">
                  <AlertTriangle className={`h-5 w-5 ${alerts.length > 0 ? "text-yellow-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-active-alerts">{alerts.length}</p>
                  <p className="text-xs text-muted-foreground">Active Alerts</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map(alert => (
                <Card key={alert.id} className={severityColors[alert.severity] || ""}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                      {alert.suggestedAction && (
                        <p className="text-xs mt-1">{alert.suggestedAction}</p>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => dismissMutation.mutate(alert.id)}
                      data-testid={`button-dismiss-alert-${alert.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Tabs defaultValue="recommendations" className="w-full">
            <TabsList data-testid="tabs-model-intel">
              <TabsTrigger value="recommendations" data-testid="tab-recommendations">By Task</TabsTrigger>
              <TabsTrigger value="catalog" data-testid="tab-catalog">Model Catalog</TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="mt-4">
              <div className="flex gap-4 flex-col lg:flex-row">
                <div className="w-full lg:w-64 shrink-0">
                  <p className="text-sm font-medium mb-2">Select a task type</p>
                  <div className="flex flex-row lg:flex-col gap-1 flex-wrap">
                    {tasks.map(task => (
                      <Button
                        key={task}
                        variant={selectedTask === task ? "default" : "ghost"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setSelectedTask(task)}
                        data-testid={`button-task-${task}`}
                      >
                        {taskTypeLabels[task] || task}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {selectedTask && taskRecs ? (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">
                        Recommended models for {taskTypeLabels[selectedTask] || selectedTask}
                      </h3>
                      {taskRecs.map((rec: any, i: number) => (
                        <Card key={rec.modelId || i}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                              <div className="flex items-center gap-2">
                                <Badge variant={rec.isCurrentBest ? "default" : "outline"} className="shrink-0">
                                  #{rec.rank}
                                </Badge>
                                <div>
                                  <p className="text-sm font-medium">{rec.displayName || rec.modelId}</p>
                                  <p className="text-xs text-muted-foreground">{rec.provider} / {rec.parameterSize || "—"}</p>
                                </div>
                              </div>
                              {rec.isCurrentBest && (
                                <Badge variant="outline" className="gap-1 border-green-500/30 text-green-600 dark:text-green-400">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Current Best
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{rec.reason}</p>
                            {rec.performanceNotes && (
                              <p className="text-xs text-muted-foreground mt-1">{rec.performanceNotes}</p>
                            )}
                            {rec.sizeEfficiency && (
                              <div className="flex items-center gap-1 mt-1">
                                <Gauge className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{rec.sizeEfficiency}</span>
                              </div>
                            )}
                            {rec.qualityScores && Object.keys(rec.qualityScores).length > 0 && (
                              <div className="flex gap-3 mt-3 flex-wrap">
                                {Object.entries(rec.qualityScores as Record<string, number>).map(([k, v]) => (
                                  <div key={k} className="text-center">
                                    <p className="text-lg font-bold">{v}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{k}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {rec.upgradePath && (
                              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <ArrowUpRight className="h-3 w-3" />
                                Upgrade: {rec.upgradePath}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
                      <TrendingUp className="h-8 w-8" />
                      <p className="text-sm">Select a task type to see model recommendations</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="catalog" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {entries.map(entry => {
                  const CatIcon = categoryIcons[entry.category] || Brain;
                  return (
                    <Card key={entry.id} data-testid={`model-card-${entry.modelId}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                          <CatIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{entry.displayName}</span>
                          <Badge variant="outline" className="ml-auto capitalize">{entry.category}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-medium capitalize ${providerColors[entry.provider] || ""}`}>
                            {entry.provider}
                          </span>
                          <Badge variant="outline" className="text-xs">{entry.parameterSize}</Badge>
                          <Badge variant="outline" className="text-xs">{entry.license}</Badge>
                          {entry.quantization && (
                            <Badge variant="outline" className="text-xs">{entry.quantization}</Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          <Server className="h-3 w-3 inline mr-1" />
                          {(entry.contextWindow / 1024).toFixed(0)}K context
                        </div>

                        <div className="flex gap-1 flex-wrap">
                          {entry.capabilities.map(cap => (
                            <Badge key={cap} variant="secondary" className="text-xs capitalize">{cap}</Badge>
                          ))}
                        </div>

                        {Object.keys(entry.qualityScores).length > 0 && (
                          <>
                            <Separator />
                            <div className="flex gap-3 flex-wrap">
                              {Object.entries(entry.qualityScores).map(([k, v]) => (
                                <div key={k} className="text-center">
                                  <p className="text-sm font-bold">{v}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{k}</p>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {entry.notes && (
                          <p className="text-xs text-muted-foreground">{entry.notes}</p>
                        )}

                        {entry.replacesModelId && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ArrowUpRight className="h-3 w-3" />
                            Upgrades from {entry.replacesModelId}
                          </div>
                        )}

                        {entry.sourceUrl && (
                          <a
                            href={entry.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-block"
                            data-testid={`link-model-source-${entry.modelId}`}
                          >
                            View on HuggingFace
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
