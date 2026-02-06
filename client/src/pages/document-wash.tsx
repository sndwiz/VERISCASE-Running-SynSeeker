import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, FileText, AlertTriangle, CheckCircle2, Loader2,
  Eye, EyeOff, Trash2, Clock, RefreshCw,
} from "lucide-react";
import type { WashPolicy, WashPiiReport } from "@shared/schema";

interface WashJobSummary {
  id: string;
  title: string;
  policy: string;
  reversible: boolean;
  status: string;
  entityCount: number;
  createdAt: string;
}

interface WashJobFull {
  id: string;
  title: string;
  originalText: string;
  washedText: string | null;
  policy: WashPolicy;
  reversible: boolean;
  status: string;
  entityCount: number;
  piiReport: WashPiiReport | null;
  createdAt: string;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  person: "Person",
  email: "Email",
  phone: "Phone",
  address: "Address",
  ssn: "SSN",
  date: "Date",
  case_number: "Case Number",
  financial: "Financial",
  organization: "Organization",
  government_id: "Government ID",
  medical: "Medical",
  other: "Other",
};

const ENTITY_TYPE_COLORS: Record<string, string> = {
  person: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  email: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  phone: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  address: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  ssn: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  date: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  case_number: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  financial: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  organization: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  government_id: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  medical: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

function DiffView({ original, washed }: { original: string; washed: string }) {
  const origLines = original.split("\n");
  const washLines = washed.split("\n");
  const maxLen = Math.max(origLines.length, washLines.length);

  return (
    <div className="grid grid-cols-2 gap-2 font-mono text-xs" data-testid="diff-view">
      <div>
        <div className="text-muted-foreground font-semibold mb-1 text-sm font-sans">Original</div>
        <div className="bg-red-50 dark:bg-red-950/20 rounded-md p-3 overflow-auto max-h-96 border border-red-200 dark:border-red-900/30">
          {origLines.map((line, i) => {
            const changed = i < washLines.length && line !== washLines[i];
            return (
              <div
                key={i}
                className={`py-0.5 px-1 whitespace-pre-wrap break-words ${changed ? "bg-red-100 dark:bg-red-900/30" : ""}`}
              >
                {line || "\u00A0"}
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <div className="text-muted-foreground font-semibold mb-1 text-sm font-sans">Washed</div>
        <div className="bg-green-50 dark:bg-green-950/20 rounded-md p-3 overflow-auto max-h-96 border border-green-200 dark:border-green-900/30">
          {washLines.map((line, i) => {
            const changed = i < origLines.length && line !== origLines[i];
            return (
              <div
                key={i}
                className={`py-0.5 px-1 whitespace-pre-wrap break-words ${changed ? "bg-green-100 dark:bg-green-900/30" : ""}`}
              >
                {line || "\u00A0"}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PiiReportView({ report }: { report: WashPiiReport }) {
  return (
    <div className="space-y-4" data-testid="pii-report">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-total-entities">{report.totalEntities}</div>
            <div className="text-xs text-muted-foreground">Total Entities</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-high-risk">{report.highRiskCount}</div>
            <div className="text-xs text-muted-foreground">High Risk</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-entity-types">{Object.keys(report.byType).length}</div>
            <div className="text-xs text-muted-foreground">Entity Types</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold" data-testid="text-detectors">{Object.keys(report.byDetector).length}</div>
            <div className="text-xs text-muted-foreground">Detectors Used</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Entities by Type</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(report.byType).map(([type, count]) => (
            <Badge key={type} variant="secondary" className={ENTITY_TYPE_COLORS[type] || ""}>
              {ENTITY_TYPE_LABELS[type] || type}: {count}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Entity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Original</th>
                  <th className="text-left p-2">Replacement</th>
                  <th className="text-left p-2">Confidence</th>
                  <th className="text-left p-2">Detector</th>
                </tr>
              </thead>
              <tbody>
                {report.entities.map((entity, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="p-2">
                      <Badge variant="secondary" className={`text-[10px] ${ENTITY_TYPE_COLORS[entity.type] || ""}`}>
                        {ENTITY_TYPE_LABELS[entity.type] || entity.type}
                      </Badge>
                    </td>
                    <td className="p-2 font-mono">{entity.original}</td>
                    <td className="p-2 font-mono text-green-700 dark:text-green-400">{entity.replacement}</td>
                    <td className="p-2">{Math.round(entity.confidence * 100)}%</td>
                    <td className="p-2 capitalize">{entity.detector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DocumentWashPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [inputText, setInputText] = useState("");
  const [policy, setPolicy] = useState<WashPolicy>("strict");
  const [reversible, setReversible] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("input");

  const { data: jobs = [], isLoading: loadingJobs } = useQuery<WashJobSummary[]>({
    queryKey: ["/api/wash/jobs"],
    refetchInterval: 5000,
  });

  const { data: selectedJob, isLoading: loadingJob } = useQuery<WashJobFull>({
    queryKey: ["/api/wash/jobs", selectedJobId],
    enabled: !!selectedJobId,
    refetchInterval: (query) => {
      const data = query.state.data as WashJobFull | undefined;
      if (data?.status === "processing" || data?.status === "pending") return 2000;
      return false;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/wash/jobs", {
        title: title || "Untitled Wash",
        originalText: inputText,
        policy,
        reversible,
      });
      return res.json();
    },
    onSuccess: (data: WashJobFull) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wash/jobs"] });
      setSelectedJobId(data.id);
      setActiveTab("results");
      setInputText("");
      setTitle("");
      toast({ title: "Wash started", description: "De-identification is in progress..." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start document wash", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/wash/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wash/jobs"] });
      if (selectedJobId) setSelectedJobId(null);
      toast({ title: "Deleted", description: "Wash job removed" });
    },
  });

  const isProcessing = selectedJob?.status === "processing" || selectedJob?.status === "pending";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          <h1 className="text-lg font-semibold" data-testid="text-wash-title">Document Wash</h1>
        </div>
        <p className="text-xs text-muted-foreground">De-identify documents while preserving meaning and tone</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-56 border-r flex-shrink-0 overflow-y-auto p-2 hidden md:block">
          <div className="text-xs font-semibold text-muted-foreground mb-2 px-1">History</div>
          {loadingJobs ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-xs text-muted-foreground p-2">No wash jobs yet</p>
          ) : (
            <div className="space-y-1">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-2 rounded-md cursor-pointer text-xs hover-elevate ${
                    selectedJobId === job.id ? "bg-accent" : ""
                  }`}
                  onClick={() => {
                    setSelectedJobId(job.id);
                    setActiveTab("results");
                  }}
                  data-testid={`wash-job-${job.id}`}
                >
                  <div className="font-medium truncate">{job.title}</div>
                  <div className="flex items-center justify-between gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {job.policy}
                    </Badge>
                    {job.status === "completed" ? (
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                    ) : job.status === "processing" || job.status === "pending" ? (
                      <Loader2 className="h-3 w-3 animate-spin text-yellow-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                    )}
                  </div>
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="input" data-testid="tab-input">
                <FileText className="h-4 w-4 mr-1" />
                Input
              </TabsTrigger>
              <TabsTrigger value="results" data-testid="tab-results">
                <Eye className="h-4 w-4 mr-1" />
                Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Document Text</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    placeholder="Document title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    data-testid="input-wash-title"
                  />
                  <Textarea
                    placeholder="Paste your document text here..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="min-h-[200px] font-mono text-xs resize-y"
                    data-testid="input-wash-text"
                  />
                  <div className="text-xs text-muted-foreground text-right">
                    {inputText.length.toLocaleString()} characters
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Wash Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Policy</Label>
                      <Select value={policy} onValueChange={(v) => setPolicy(v as WashPolicy)}>
                        <SelectTrigger data-testid="select-policy">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="strict">Strict - All PII types</SelectItem>
                          <SelectItem value="medium">Medium - Direct identifiers</SelectItem>
                          <SelectItem value="minimal">Minimal - Most sensitive only</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        {policy === "strict" && "Detects names, emails, phones, addresses, SSNs, dates, case numbers, financials, organizations, IDs, and medical info."}
                        {policy === "medium" && "Detects names, emails, phones, addresses, SSNs, case numbers, government IDs, and medical info."}
                        {policy === "minimal" && "Detects only names, SSNs, government IDs, and medical information."}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Mode</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <Switch
                          checked={reversible}
                          onCheckedChange={setReversible}
                          data-testid="switch-reversible"
                        />
                        <div>
                          <div className="text-xs font-medium flex items-center gap-1">
                            {reversible ? (
                              <><Eye className="h-3 w-3" /> Reversible</>
                            ) : (
                              <><EyeOff className="h-3 w-3" /> Irreversible</>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {reversible ? "Original values stored in PII report" : "Original values hidden from report"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={() => createMutation.mutate()}
                disabled={!inputText.trim() || createMutation.isPending}
                className="w-full"
                data-testid="button-run-wash"
              >
                {createMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting Wash...</>
                ) : (
                  <><Shield className="h-4 w-4 mr-2" /> Run Document Wash</>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="results" className="space-y-4">
              {!selectedJobId ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Select a wash job from the history or create a new one</p>
                  </CardContent>
                </Card>
              ) : loadingJob ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : selectedJob ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <h2 className="font-semibold" data-testid="text-job-title">{selectedJob.title}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{selectedJob.policy}</Badge>
                        <Badge variant={selectedJob.reversible ? "outline" : "secondary"}>
                          {selectedJob.reversible ? "Reversible" : "Irreversible"}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={
                            selectedJob.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : selectedJob.status === "failed"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          }
                          data-testid="badge-job-status"
                        >
                          {selectedJob.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isProcessing && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/wash/jobs", selectedJobId] })}
                          data-testid="button-refresh-job"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          deleteMutation.mutate(selectedJob.id);
                          setSelectedJobId(null);
                        }}
                        data-testid="button-delete-job"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {isProcessing && (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-teal-600" />
                        <p className="text-sm font-medium">De-identification in progress...</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          AI is scanning for personally identifiable information
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {selectedJob.status === "completed" && selectedJob.washedText && (
                    <>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Side-by-Side Comparison</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <DiffView original={selectedJob.originalText} washed={selectedJob.washedText} />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Washed Output</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            value={selectedJob.washedText}
                            readOnly
                            className="min-h-[150px] font-mono text-xs"
                            data-testid="output-washed-text"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => {
                              navigator.clipboard.writeText(selectedJob.washedText || "");
                              toast({ title: "Copied", description: "Washed text copied to clipboard" });
                            }}
                            data-testid="button-copy-washed"
                          >
                            Copy to Clipboard
                          </Button>
                        </CardContent>
                      </Card>

                      {selectedJob.piiReport && (
                        <PiiReportView report={selectedJob.piiReport} />
                      )}
                    </>
                  )}

                  {selectedJob.status === "failed" && (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-3" />
                        <p className="text-sm font-medium">Wash failed</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          The de-identification process encountered an error. Please try again.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
