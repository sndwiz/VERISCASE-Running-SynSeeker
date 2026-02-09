import { useState, useRef, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Square, CheckCircle2, Circle, Loader2, AlertCircle, Scale, Copy, ArrowRight } from "lucide-react";
import DOMPurify from "dompurify";

interface ResearchStep {
  id: number;
  title: string;
  status: "pending" | "in-progress" | "complete" | "error";
  content?: string;
}

type ResearchState = "idle" | "planning" | "researching" | "compiling" | "done" | "error";

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

  return (
    <div className="p-6 space-y-6" data-testid="legal-research-page">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Legal Research</h1>
        <p className="text-muted-foreground">Deep AI-powered legal research with multi-step analysis</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3 items-center" data-testid="form-research">
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
            <h2 className="text-lg font-semibold mb-4">{query}</h2>

            <div className="space-y-4">
              {steps.map((step, idx) => (
                <div key={step.id} className="flex items-start gap-3" data-testid={`research-step-${idx}`}>
                  <div className="mt-0.5 flex-shrink-0">
                    {step.status === "complete" && (
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    )}
                    {step.status === "in-progress" && (
                      <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                    )}
                    {step.status === "pending" && (
                      <Circle className="h-6 w-6 text-muted-foreground/40" strokeDasharray="4 2" />
                    )}
                    {step.status === "error" && (
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-relaxed ${
                      step.status === "pending" ? "text-muted-foreground/60" :
                      step.status === "error" ? "text-destructive" :
                      ""
                    }`}>
                      {step.title}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {(isActive || state === "done") && (
              <div className="mt-6 pt-4 border-t space-y-3">
                <p className="text-sm text-muted-foreground">{statusMessage}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {searchCount > 0 && <>{searchCount} searches</>}
                  </span>
                  {isActive && (
                    <div className="flex-1 ml-4 mr-4">
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              (steps.filter(s => s.status === "complete").length / Math.max(steps.length, 1)) * 100,
                              95
                            )}%`,
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
          <div className="flex items-center justify-between">
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
                        <CheckCircle2 className="h-4 w-4 text-primary" />
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
