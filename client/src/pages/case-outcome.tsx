import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Trophy, XCircle, Handshake, Scale, BookOpen,
  Plus, Trash2, Loader2, Send, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const RESOLUTIONS = [
  { value: "won", label: "Won", icon: Trophy, color: "text-green-500" },
  { value: "lost", label: "Lost", icon: XCircle, color: "text-red-500" },
  { value: "settled", label: "Settled", icon: Handshake, color: "text-yellow-500" },
  { value: "dismissed", label: "Dismissed", icon: Scale, color: "text-muted-foreground" },
  { value: "withdrawn", label: "Withdrawn", icon: XCircle, color: "text-muted-foreground" },
  { value: "ongoing", label: "Ongoing", icon: BookOpen, color: "text-blue-500" },
];

interface ListItem { argument?: string; reason?: string; notes?: string; effectiveness?: number; tactic?: string; counter?: string; effective?: boolean; lesson?: string; category?: string; tendency?: string; impact?: string; }

function DynamicList({ label, items, onChange, fields }: {
  label: string;
  items: ListItem[];
  onChange: (items: ListItem[]) => void;
  fields: { key: string; label: string; type?: string }[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button variant="ghost" size="sm" onClick={() => onChange([...items, {}])} data-testid={`button-add-${label.toLowerCase().replace(/\s/g, "-")}`}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add
        </Button>
      </div>
      {items.map((item, i) => (
        <Card key={i} className="p-3 space-y-2">
          {fields.map(f => (
            <div key={f.key}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              {f.type === "textarea" ? (
                <Textarea
                  value={(item as any)[f.key] || ""}
                  onChange={e => { const u = [...items]; (u[i] as any)[f.key] = e.target.value; onChange(u); }}
                  className="min-h-[60px] text-sm"
                  data-testid={`textarea-${f.key}-${i}`}
                />
              ) : (
                <Input
                  value={(item as any)[f.key] || ""}
                  onChange={e => { const u = [...items]; (u[i] as any)[f.key] = e.target.value; onChange(u); }}
                  className="text-sm"
                  data-testid={`input-${f.key}-${i}`}
                />
              )}
            </div>
          ))}
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => onChange(items.filter((_, j) => j !== i))} data-testid={`button-remove-${i}`}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Remove
          </Button>
        </Card>
      ))}
    </div>
  );
}

export default function CaseOutcomePage() {
  const [, params] = useRoute("/matters/:matterId/outcome");
  const matterId = params?.matterId;
  const { toast } = useToast();

  const [resolution, setResolution] = useState("settled");
  const [resolutionDate, setResolutionDate] = useState("");
  const [summary, setSummary] = useState("");
  const [winningArguments, setWinningArguments] = useState<ListItem[]>([]);
  const [losingArguments, setLosingArguments] = useState<ListItem[]>([]);
  const [oppositionTactics, setOppositionTactics] = useState<ListItem[]>([]);
  const [judgeNotes, setJudgeNotes] = useState("");
  const [judgeTendencies, setJudgeTendencies] = useState<ListItem[]>([]);
  const [lessonsLearned, setLessonsLearned] = useState<ListItem[]>([]);
  const [settlementAmount, setSettlementAmount] = useState("");
  const [awardedAmount, setAwardedAmount] = useState("");

  const { data: outcome, isLoading } = useQuery({
    queryKey: ["/api/matters", matterId, "outcome"],
    queryFn: () => fetch(`/api/matters/${matterId}/outcome`, { credentials: "include" }).then(r => r.json()),
    enabled: !!matterId,
  });

  useEffect(() => {
    if (outcome && outcome.id) {
      setResolution(outcome.resolution);
      setResolutionDate(outcome.resolutionDate || "");
      setSummary(outcome.summary);
      setWinningArguments(outcome.winningArguments || []);
      setLosingArguments(outcome.losingArguments || []);
      setOppositionTactics(outcome.oppositionTactics || []);
      setJudgeNotes(outcome.judgeNotes || "");
      setJudgeTendencies(outcome.judgeTendencies || []);
      setLessonsLearned(outcome.lessonsLearned || []);
      setSettlementAmount(outcome.settlementAmount?.toString() || "");
      setAwardedAmount(outcome.awardedAmount?.toString() || "");
    }
  }, [outcome]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (outcome?.id) {
        return apiRequest("PATCH", `/api/matters/${matterId}/outcome/${outcome.id}`, data);
      }
      return apiRequest("POST", `/api/matters/${matterId}/outcome`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "outcome"] });
      toast({ title: "Case outcome saved" });
    },
    onError: (err: any) => toast({ title: "Failed to save", description: err.message, variant: "destructive" }),
  });

  const submitToKbMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/matters/${matterId}/outcome/${outcome.id}/submit-to-kb`),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "outcome"] });
      toast({ title: `Submitted ${data.entriesCreated} entries to Knowledge Base for review` });
    },
    onError: (err: any) => toast({ title: "Failed to submit", description: err.message, variant: "destructive" }),
  });

  function handleSave() {
    saveMutation.mutate({
      resolution,
      resolutionDate: resolutionDate || undefined,
      summary,
      winningArguments,
      losingArguments,
      oppositionTactics,
      judgeNotes,
      judgeTendencies,
      lessonsLearned,
      settlementAmount: settlementAmount ? parseFloat(settlementAmount) : undefined,
      awardedAmount: awardedAmount ? parseFloat(awardedAmount) : undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 md:p-4 border-b flex-wrap">
        <Link href={`/matters/${matterId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <Scale className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold" data-testid="text-outcome-title">Case Outcome</h1>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {outcome?.id && !outcome.submittedToKb && (
            <Button
              variant="outline"
              onClick={() => submitToKbMutation.mutate()}
              disabled={submitToKbMutation.isPending}
              data-testid="button-submit-kb"
            >
              {submitToKbMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              <span className="hidden sm:inline">Submit to Knowledge Base</span>
            </Button>
          )}
          {outcome?.submittedToKb && (
            <Badge variant="secondary"><Check className="h-3 w-3 mr-1" />Submitted to KB</Badge>
          )}
          <Button onClick={handleSave} disabled={!summary || saveMutation.isPending} data-testid="button-save-outcome">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save Outcome
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="p-5 space-y-4">
            <h2 className="font-semibold" data-testid="text-resolution-section">Resolution</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger data-testid="select-resolution"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RESOLUTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resolution Date</Label>
                <Input type="date" value={resolutionDate} onChange={e => setResolutionDate(e.target.value)} data-testid="input-resolution-date" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Settlement Amount</Label>
                <Input type="number" value={settlementAmount} onChange={e => setSettlementAmount(e.target.value)} placeholder="0.00" data-testid="input-settlement" />
              </div>
              <div className="space-y-2">
                <Label>Awarded Amount</Label>
                <Input type="number" value={awardedAmount} onChange={e => setAwardedAmount(e.target.value)} placeholder="0.00" data-testid="input-awarded" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Describe the case outcome, key events, and resolution..." className="min-h-[100px]" data-testid="textarea-summary" />
            </div>
          </Card>

          <Card className="p-5">
            <DynamicList
              label="Winning Arguments"
              items={winningArguments}
              onChange={setWinningArguments}
              fields={[
                { key: "argument", label: "Argument" },
                { key: "notes", label: "Notes", type: "textarea" },
              ]}
            />
          </Card>

          <Card className="p-5">
            <DynamicList
              label="Losing Arguments"
              items={losingArguments}
              onChange={setLosingArguments}
              fields={[
                { key: "argument", label: "Argument" },
                { key: "reason", label: "Why it failed", type: "textarea" },
              ]}
            />
          </Card>

          <Card className="p-5">
            <DynamicList
              label="Opposition Tactics"
              items={oppositionTactics}
              onChange={setOppositionTactics}
              fields={[
                { key: "tactic", label: "Tactic" },
                { key: "counter", label: "Counter / Response", type: "textarea" },
              ]}
            />
          </Card>

          <Card className="p-5 space-y-4">
            <h2 className="font-semibold">Judge Notes</h2>
            <Textarea value={judgeNotes} onChange={e => setJudgeNotes(e.target.value)} placeholder="Judge observations, rulings of interest, behavioral notes..." className="min-h-[80px]" data-testid="textarea-judge-notes" />
            <DynamicList
              label="Judge Tendencies"
              items={judgeTendencies}
              onChange={setJudgeTendencies}
              fields={[
                { key: "tendency", label: "Tendency" },
                { key: "impact", label: "Impact on case" },
              ]}
            />
          </Card>

          <Card className="p-5">
            <DynamicList
              label="Lessons Learned"
              items={lessonsLearned}
              onChange={setLessonsLearned}
              fields={[
                { key: "lesson", label: "Lesson" },
                { key: "category", label: "Category (e.g., discovery, trial prep)" },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
