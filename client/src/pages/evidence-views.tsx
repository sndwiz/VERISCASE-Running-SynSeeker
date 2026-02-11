import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  ArrowLeft, Layers, Plus, Users, Briefcase, Calendar,
  DollarSign, HelpCircle, AlertTriangle, Trash2, Edit3,
  Loader2, Eye, ChevronDown, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const VIEW_TYPES = [
  { value: "by_actor", label: "By Actor", description: "Who appears in which documents", icon: Users },
  { value: "by_role", label: "By Role", description: "Functional roles (billing control, gatekeeping)", icon: Briefcase },
  { value: "by_event", label: "By Event", description: "Temporal/procedural organization", icon: Calendar },
  { value: "by_money_flow", label: "By Money Flow", description: "Financial transaction tracking", icon: DollarSign },
  { value: "by_absence", label: "By Absence", description: "What should exist but doesn't", icon: HelpCircle },
  { value: "by_conflict", label: "By Conflict", description: "Factual contradictions between documents", icon: AlertTriangle },
];

const EPISTEMIC_STATUSES = [
  { value: "descriptive", label: "Descriptive" },
  { value: "interpretive", label: "Interpretive" },
  { value: "contested", label: "Contested" },
];

interface ViewEntry {
  id: string;
  label: string;
  documentIds: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

interface EvidenceViewData {
  id: string;
  matterId: string;
  viewType: string;
  label: string;
  description: string;
  entries: ViewEntry[];
  metadata: Record<string, any>;
  epistemicStatus: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function EvidenceViewsPage() {
  const [, params] = useRoute("/matters/:matterId/evidence-views");
  const matterId = params?.matterId;
  const { toast } = useToast();

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<EvidenceViewData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [formViewType, setFormViewType] = useState("by_actor");
  const [formLabel, setFormLabel] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEpistemic, setFormEpistemic] = useState("descriptive");

  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [entryLabel, setEntryLabel] = useState("");
  const [entryNotes, setEntryNotes] = useState("");

  const { data: views = [], isLoading } = useQuery<EvidenceViewData[]>({
    queryKey: ["/api/matters", matterId, "evidence-views"],
    queryFn: () => fetch(`/api/matters/${matterId}/evidence-views`, { credentials: "include" }).then(r => r.json()),
    enabled: !!matterId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/matters/${matterId}/evidence-views`, data),
    onSuccess: async (res: any) => {
      const view = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "evidence-views"] });
      toast({ title: "Evidence view created" });
      setCreateOpen(false);
      setFormLabel(""); setFormDescription("");
      setSelectedView(view);
      setSelectedType(view.viewType);
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/matters/${matterId}/evidence-views/${id}`, data),
    onSuccess: async (res: any) => {
      const updated = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "evidence-views"] });
      setSelectedView(updated);
      toast({ title: "View updated" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/matters/${matterId}/evidence-views/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "evidence-views"] });
      toast({ title: "View deleted" });
      setSelectedView(null);
    },
  });

  function handleAddEntry() {
    if (!selectedView || !entryLabel) return;
    const newEntry: ViewEntry = {
      id: crypto.randomUUID(),
      label: entryLabel,
      documentIds: [],
      notes: entryNotes || undefined,
    };
    updateMutation.mutate({
      id: selectedView.id,
      data: { entries: [...(selectedView.entries || []), newEntry] },
    });
    setAddEntryOpen(false);
    setEntryLabel(""); setEntryNotes("");
  }

  function handleRemoveEntry(entryId: string) {
    if (!selectedView) return;
    updateMutation.mutate({
      id: selectedView.id,
      data: { entries: (selectedView.entries || []).filter(e => e.id !== entryId) },
    });
  }

  const viewsByType = VIEW_TYPES.map(vt => ({
    ...vt,
    views: views.filter(v => v.viewType === vt.value),
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b flex-wrap">
        <Link href={`/matters/${matterId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <Layers className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold" data-testid="text-ev-title">Evidence Views</h1>
        <Badge variant="secondary">{views.length} views</Badge>
        <div className="ml-auto">
          <Button onClick={() => setCreateOpen(true)} data-testid="button-new-view">
            <Plus className="h-4 w-4 mr-2" />
            New View
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 border-r overflow-y-auto p-3 space-y-4 flex-shrink-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            viewsByType.map(vt => {
              const Icon = vt.icon;
              const isExpanded = selectedType === vt.value;
              return (
                <div key={vt.value}>
                  <button
                    className="flex items-center gap-2 w-full text-left p-2 rounded-md hover-elevate"
                    onClick={() => setSelectedType(isExpanded ? null : vt.value)}
                    data-testid={`button-view-type-${vt.value}`}
                  >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium flex-1">{vt.label}</span>
                    <Badge variant="secondary" className="text-xs">{vt.views.length}</Badge>
                  </button>
                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      <p className="text-xs text-muted-foreground mb-2">{vt.description}</p>
                      {vt.views.map(v => (
                        <button
                          key={v.id}
                          className={`flex items-center gap-2 w-full text-left p-2 rounded-md text-sm ${selectedView?.id === v.id ? "bg-accent" : "hover-elevate"}`}
                          onClick={() => setSelectedView(v)}
                          data-testid={`button-view-${v.id}`}
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{v.label}</span>
                        </button>
                      ))}
                      {vt.views.length === 0 && (
                        <p className="text-xs text-muted-foreground italic px-2">No views yet</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {selectedView ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-semibold" data-testid="text-view-label">{selectedView.label}</h2>
                  <p className="text-sm text-muted-foreground">{selectedView.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {VIEW_TYPES.find(vt => vt.value === selectedView.viewType)?.label}
                  </Badge>
                  <Badge variant={selectedView.epistemicStatus === "descriptive" ? "secondary" : selectedView.epistemicStatus === "contested" ? "destructive" : "outline"}>
                    {selectedView.epistemicStatus}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => setAddEntryOpen(true)} data-testid="button-add-entry">
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Entry
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => deleteMutation.mutate(selectedView.id)}
                    data-testid="button-delete-view"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {(selectedView.entries || []).length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No entries in this view yet.</p>
                  <p className="text-xs mt-1">Add entries to index documents, actors, or events within this perspective.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {(selectedView.entries as ViewEntry[]).map((entry) => (
                    <Card key={entry.id} className="p-3" data-testid={`card-entry-${entry.id}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <span className="text-sm font-medium">{entry.label}</span>
                          {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
                          {entry.documentIds.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {entry.documentIds.map((docId, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{docId}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleRemoveEntry(entry.id)}
                          data-testid={`button-remove-entry-${entry.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Layers className="h-10 w-10" />
              <p className="text-sm">Select a view type to get started</p>
              <p className="text-xs max-w-md text-center">
                Evidence Views provide navigational perspectives over your documents without duplicating or interpreting them.
                Views are descriptive and neutral -- they index, they don't assert.
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Evidence View</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>View Type</Label>
              <Select value={formViewType} onValueChange={setFormViewType}>
                <SelectTrigger data-testid="select-view-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIEW_TYPES.map(vt => <SelectItem key={vt.value} value={vt.value}>{vt.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{VIEW_TYPES.find(vt => vt.value === formViewType)?.description}</p>
            </div>
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={formLabel} onChange={e => setFormLabel(e.target.value)} placeholder="e.g., Key Witnesses, Billing Chain..." data-testid="input-view-label" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="What does this view track?" className="min-h-[60px]" data-testid="textarea-view-desc" />
            </div>
            <div className="space-y-2">
              <Label>Epistemic Status</Label>
              <Select value={formEpistemic} onValueChange={setFormEpistemic}>
                <SelectTrigger data-testid="select-epistemic"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EPISTEMIC_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({
                viewType: formViewType,
                label: formLabel,
                description: formDescription,
                epistemicStatus: formEpistemic,
              })}
              disabled={!formLabel || createMutation.isPending}
              data-testid="button-create-view"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={entryLabel} onChange={e => setEntryLabel(e.target.value)} placeholder="e.g., Mark Allen, January 2024 Billing..." data-testid="input-entry-label" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={entryNotes} onChange={e => setEntryNotes(e.target.value)} placeholder="Additional context..." className="min-h-[60px]" data-testid="textarea-entry-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEntryOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEntry} disabled={!entryLabel} data-testid="button-add-entry-save">Add Entry</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
