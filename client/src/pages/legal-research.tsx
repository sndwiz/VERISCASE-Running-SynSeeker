import { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Square, CheckCircle2, Circle, Loader2, AlertCircle, Scale, Copy, ArrowRight, Gavel, FileText } from "lucide-react";
import DOMPurify from "dompurify";

interface ResearchStep {
  id: number;
  title: string;
  status: "pending" | "in-progress" | "complete" | "error";
  content?: string;
}

type ResearchState = "idle" | "planning" | "researching" | "compiling" | "done" | "error";

interface SourceHint {
  label: string;
  type: "statute" | "case" | "rule" | "article";
}

function extractSourceHints(stepTitle: string): SourceHint[] {
  const hints: SourceHint[] = [];
  const lower = stepTitle.toLowerCase();

  if (lower.includes("utah code") || lower.includes("statute") || lower.includes("u.c.a") || lower.includes("title 7")) {
    hints.push({ label: "Utah Code Ann.", type: "statute" });
  }
  if (lower.includes("case law") || lower.includes("precedent") || lower.includes("ruling") || lower.includes("court")) {
    hints.push({ label: "Case Authority", type: "case" });
  }
  if (lower.includes("rule") || lower.includes("urcp") || lower.includes("urap") || lower.includes("procedure")) {
    hints.push({ label: "Procedural Rule", type: "rule" });
  }
  if (lower.includes("article") || lower.includes("analysis") || lower.includes("review") || lower.includes("commentary")) {
    hints.push({ label: "Legal Article", type: "article" });
  }

  if (hints.length === 0) {
    if (lower.includes("law") || lower.includes("legal") || lower.includes("code")) {
      hints.push({ label: "Legal Authority", type: "statute" });
    } else {
      hints.push({ label: "Research Source", type: "article" });
    }
  }

  return hints.slice(0, 2);
}

const SOURCE_STYLES: Record<SourceHint["type"], { badge: string; icon: typeof Scale }> = {
  statute: { badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Scale },
  case: { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Gavel },
  rule: { badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", icon: FileText },
  article: { badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: FileText },
};

const EXAMPLE_QUERIES = [
  "Utah attorney tampering laws",
  "URCP Rule 26 discovery obligations",
  "Utah landlord tenant eviction process",
  "Professional liability for legal malpractice in Utah",
  "Utah child custody modification standards",
];

export default function LegalResearchPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<ResearchState>("idle");
  const [steps, setSteps] = useState<ResearchStep[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [searchCount, setSearchCount] = useState(0);
  const [summary, setSummary] = useState("");
  const [showResults, setShowResults] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const startResearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState("planning");
    setSteps([]);
    setSummary("");
    setSearchCount(0);
    setStatusMessage("Analyzing research query...");
    setShowResults(false);

    try {
      const response = await fetch("/api/legal-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Research failed" }));
        throw new Error(err.error || "Research failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.event) {
              case "status":
                setStatusMessage(data.message || "");
                break;
              case "steps":
                setState("researching");
                setSteps(data.steps.map((s: any) => ({
                  id: s.id,
                  title: s.title,
                  status: s.status,
                })));
                break;
              case "step-update":
                setSteps(prev => prev.map((s, i) =>
                  i === data.stepIndex ? { ...s, status: data.status, detail: data.detail } : s
                ));
                if (data.status === "complete") {
                  setState("researching");
                }
                break;
              case "step-result":
                setSteps(prev => prev.map((s, i) =>
                  i === data.stepIndex ? { ...s, content: data.content } : s
                ));
                break;
              case "progress":
                if (data.message) setStatusMessage(data.message);
                if (data.searchCount) setSearchCount(data.searchCount);
                break;
              case "summary":
                setState("done");
                setSummary(data.content || "");
                setSearchCount(data.totalSearches || searchCount);
                setShowResults(true);
                break;
              case "done":
                setState("done");
                break;
              case "error":
                setState("error");
                setStatusMessage(data.message || "An error occurred");
                break;
            }
          } catch {
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setState("error");
      setStatusMessage(err.message || "Research failed");
      toast({ title: "Research failed", description: err.message, variant: "destructive" });
    }
  }, [toast, searchCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startResearch(query);
  };

  const stopResearch = () => {
    abortRef.current?.abort();
    setState("idle");
    setStatusMessage("");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(summary);
    toast({ title: "Copied to clipboard" });
  };

  const isActive = state !== "idle" && state !== "done" && state !== "error";

  const completedCount = useMemo(() => steps.filter(s => s.status === "complete").length, [steps]);
  const totalSourceCount = useMemo(() => {
    return steps
      .filter(s => s.status === "complete")
      .reduce((sum, s) => sum + extractSourceHints(s.title).length, 0);
  }, [steps]);

  const progressPercent = useMemo(() => {
    if (steps.length === 0) return 0;
    return Math.min((completedCount / steps.length) * 100, 95);
  }, [completedCount, steps.length]);

  return (
    <div className="p-6 space-y-6" data-testid="legal-research-page">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Legal Research</h1>
        <p className="text-muted-foreground">Deep AI-powered legal research with multi-step analysis</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-center" data-testid="form-research">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Utah law, statutes, case law, rules..."
            className="pl-10"
            disabled={isActive}
            data-testid="input-research-query"
          />
        </div>
        {isActive ? (
          <Button type="button" variant="outline" onClick={stopResearch} data-testid="button-stop-research">
            <Square className="h-4 w-4 mr-2" />
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!query.trim()} data-testid="button-start-research">
            <Search className="h-4 w-4 mr-2" />
            Research
          </Button>
        )}
      </form>

      {state === "idle" && steps.length === 0 && !summary && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Try one of these research queries:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((q) => (
              <Badge
                key={q}
                variant="outline"
                className="cursor-pointer text-sm py-1.5 px-3"
                onClick={() => {
                  setQuery(q);
                  startResearch(q);
                }}
                data-testid={`example-query-${q.slice(0, 20).replace(/\s/g, "-")}`}
              >
                <ArrowRight className="h-3 w-3 mr-1.5" />
                {q}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {(isActive || steps.length > 0) && (
        <Card className="bg-card border">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <h2 className="text-lg font-semibold">{query}</h2>
              {state === "done" && (
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 no-default-hover-elevate no-default-active-elevate"
                  data-testid="badge-research-complete"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Complete -- {completedCount} steps, {totalSourceCount} sources
                </Badge>
              )}
            </div>

            <div className="space-y-1">
              {steps.map((step, idx) => {
                const isInProgress = step.status === "in-progress";
                const isComplete = step.status === "complete";
                const isPending = step.status === "pending";
                const isError = step.status === "error";
                const sources = isComplete ? extractSourceHints(step.title) : [];

                return (
                  <div
                    key={step.id}
                    className={`flex flex-wrap items-start gap-3 rounded-md px-3 py-2.5 transition-colors duration-200 ${
                      isInProgress ? "bg-muted/50 animate-research-fade-in" : ""
                    } ${isComplete ? "animate-research-slide-in" : ""}`}
                    data-testid={`research-step-${idx}`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {isComplete && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {isInProgress && (
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      )}
                      {isPending && (
                        <Circle className="h-5 w-5 text-muted-foreground/30" strokeDasharray="3 3" />
                      )}
                      {isError && (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${
                        isPending ? "text-muted-foreground/50" :
                        isError ? "text-destructive" :
                        isInProgress ? "font-semibold" :
                        "font-medium"
                      }`}>
                        {step.title}
                      </p>
                      {isComplete && sources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {sources.map((src, sIdx) => {
                            const style = SOURCE_STYLES[src.type];
                            const Icon = style.icon;
                            return (
                              <span
                                key={sIdx}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md ${style.badge}`}
                                data-testid={`source-hint-${idx}-${sIdx}`}
                              >
                                <Icon className="h-3 w-3" />
                                {src.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {(isActive || state === "done") && (
              <div className="mt-6 pt-4 border-t space-y-3">
                <p className="text-sm text-muted-foreground">{statusMessage}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    {searchCount > 0 && <>{searchCount} searches</>}
                  </span>
                  {isActive && (
                    <div className="flex-1 ml-4 mr-4">
                      <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${progressPercent}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {isActive && (
                    <Button variant="ghost" size="icon" onClick={stopResearch} data-testid="button-stop-inline">
                      <Square className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showResults && summary && (
        <div ref={resultsRef} className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-xl font-semibold">Research Results</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                <Scale className="h-3 w-3 mr-1" />
                {searchCount} searches
              </Badge>
              <Button variant="outline" size="sm" onClick={copyToClipboard} data-testid="button-copy-results">
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(renderMarkdown(summary)),
                }}
              />
            </CardContent>
          </Card>

          {steps.filter(s => s.content).length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-2" data-testid="toggle-step-details">
                <ArrowRight className="h-3 w-3 group-open:rotate-90 transition-transform" />
                View individual step results ({steps.filter(s => s.content).length} steps)
              </summary>
              <div className="mt-3 space-y-3">
                {steps.filter(s => s.content).map((step, idx) => (
                  <Card key={step.id}>
                    <CardContent className="pt-4 pb-3">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Step {idx + 1}: {step.title}
                      </h4>
                      <div
                        className="prose prose-sm dark:prose-invert max-w-none text-sm"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(step.content || "")) }}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl font-bold mt-6 mb-3">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs">$1</code>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>')
    .replace(/^(?!<[hlu]|<li|<p|<br)(.+)$/gim, '<p class="mb-2">$1</p>');
}
