import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import {
  BookOpen, Plus, ArrowLeft, Flag, Lock, Users, FileText,
  Edit3, Trash2, ChevronDown, Shield, Eye, AlertTriangle,
  Search, Filter, Loader2,
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

const ENTRY_TYPES = [
  { value: "observation", label: "Observation", icon: Eye },
  { value: "strategy", label: "Strategy", icon: Shield },
  { value: "client_communication", label: "Client Communication", icon: Users },
  { value: "annotation", label: "Annotation", icon: FileText },
  { value: "flag", label: "Flag / Issue", icon: AlertTriangle },
  { value: "research", label: "Research", icon: Search },
];

const PRIVACY_LEVELS = [
  { value: "case_team", label: "Case Team", description: "Visible to all assigned attorneys", icon: Users },
  { value: "attorney_only", label: "Attorney Only", description: "Only visible to author", icon: Lock },
  { value: "exportable", label: "Exportable", description: "Can be included in court filings", icon: FileText },
];

const EPISTEMIC_STATUSES = [
  { value: "provisional", label: "Provisional", color: "text-yellow-500" },
  { value: "verified", label: "Verified", color: "text-green-500" },
  { value: "contested", label: "Contested", color: "text-red-500" },
];

interface JournalEntry {
  id: string;
  matterId: string;
  authorId: string;
  authorName: string;
  entryType: string;
  title: string;
  content: string;
  privacyLevel: string;
  tags: string[];
  linkedDocIds: string[];
  linkedEntityIds: string[];
  epistemicStatus: string;
  confidenceScore: number;
  flagged: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CaseJournalPage() {
  const [, params] = useRoute("/matters/:matterId/journal");
  const matterId = params?.matterId;
  const { toast } = useToast();
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPrivacy, setFilterPrivacy] = useState<string>("all");

  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formType, setFormType] = useState("observation");
  const [formPrivacy, setFormPrivacy] = useState("case_team");
  const [formEpistemic, setFormEpistemic] = useState("provisional");
  const [formConfidence, setFormConfidence] = useState(0.5);
  const [formFlagged, setFormFlagged] = useState(false);
  const [formTags, setFormTags] = useState("");

  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["/api/matters", matterId, "journal"],
    queryFn: () => fetch(`/api/matters/${matterId}/journal`, { credentials: "include" }).then(r => r.json()),
    enabled: !!matterId,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/matters/${matterId}/journal`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "journal"] });
      toast({ title: "Journal entry created" });
      resetForm();
      setCreateOpen(false);
    },
    onError: (err: any) => toast({ title: "Failed to create entry", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/matters/${matterId}/journal/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "journal"] });
      toast({ title: "Journal entry updated" });
      setEditEntry(null);
      resetForm();
    },
    onError: (err: any) => toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/matters/${matterId}/journal/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", matterId, "journal"] });
      toast({ title: "Entry deleted" });
    },
    onError: (err: any) => toast({ title: "Failed to delete", description: err.message, variant: "destructive" }),
  });

  function resetForm() {
    setFormTitle(""); setFormContent(""); setFormType("observation");
    setFormPrivacy("case_team"); setFormEpistemic("provisional");
    setFormConfidence(0.5); setFormFlagged(false); setFormTags("");
  }

  function openEdit(entry: JournalEntry) {
    setEditEntry(entry);
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setFormType(entry.entryType);
    setFormPrivacy(entry.privacyLevel);
    setFormEpistemic(entry.epistemicStatus);
    setFormConfidence(entry.confidenceScore);
    setFormFlagged(entry.flagged);
    setFormTags((entry.tags || []).join(", "));
  }

  function handleSubmit() {
    const data = {
      entryType: formType,
      title: formTitle,
      content: formContent,
      privacyLevel: formPrivacy,
      epistemicStatus: formEpistemic,
      confidenceScore: formConfidence,
      flagged: formFlagged,
      tags: formTags.split(",").map(t => t.trim()).filter(Boolean),
    };
    if (editEntry) {
      updateMutation.mutate({ id: editEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const filtered = entries.filter(e => {
    if (filterType !== "all" && e.entryType !== filterType) return false;
    if (filterPrivacy !== "all" && e.privacyLevel !== filterPrivacy) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
    }
    return true;
  });

  const EntryIcon = ({ type }: { type: string }) => {
    const config = ENTRY_TYPES.find(t => t.value === type);
    if (!config) return <BookOpen className="h-4 w-4" />;
    const Icon = config.icon;
    return <Icon className="h-4 w-4" />;
  };

  const isFormOpen = createOpen || !!editEntry;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 md:p-4 border-b flex-wrap">
        <Link href={`/matters/${matterId}`}>
          <Button variant="ghost" size="icon" data-testid="button-back-to-matter">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold" data-testid="text-journal-title">Case Journal</h1>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 w-full sm:w-48"
              data-testid="input-journal-search"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-36" data-testid="select-filter-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ENTRY_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPrivacy} onValueChange={setFilterPrivacy}>
            <SelectTrigger className="w-full sm:w-36" data-testid="select-filter-privacy">
              <SelectValue placeholder="Privacy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Privacy</SelectItem>
              {PRIVACY_LEVELS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => { resetForm(); setCreateOpen(true); }} data-testid="button-new-entry">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <BookOpen className="h-10 w-10" />
            <p className="text-sm">No journal entries yet</p>
            <p className="text-xs">Create your first entry to start documenting observations, strategies, and flags.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {filtered.map(entry => {
              const typeConfig = ENTRY_TYPES.find(t => t.value === entry.entryType);
              const privacyConfig = PRIVACY_LEVELS.find(p => p.value === entry.privacyLevel);
              const epistemicConfig = EPISTEMIC_STATUSES.find(s => s.value === entry.epistemicStatus);
              const isOwn = entry.authorId === user?.id;

              return (
                <Card key={entry.id} className="p-3 md:p-4" data-testid={`card-journal-${entry.id}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-muted-foreground">
                      <EntryIcon type={entry.entryType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm" data-testid={`text-entry-title-${entry.id}`}>{entry.title}</span>
                        {entry.flagged && <Flag className="h-3.5 w-3.5 text-red-500" />}
                        <Badge variant="outline" className="text-xs">{typeConfig?.label || entry.entryType}</Badge>
                        <Badge variant="secondary" className="text-xs">
                          {privacyConfig?.icon && <privacyConfig.icon className="h-3 w-3 mr-1" />}
                          {privacyConfig?.label}
                        </Badge>
                        {epistemicConfig && (
                          <span className={`text-xs font-mono ${epistemicConfig.color}`}>
                            {epistemicConfig.label} ({Math.round(entry.confidenceScore * 100)}%)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">{entry.content}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {entry.authorName} &middot; {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                        {(entry.tags || []).length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {(entry.tags as string[]).map((tag, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {isOwn && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-entry-menu-${entry.id}`}>
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(entry)} data-testid={`button-edit-${entry.id}`}>
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(entry.id)}
                            className="text-destructive"
                            data-testid={`button-delete-${entry.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={open => { if (!open) { setCreateOpen(false); setEditEntry(null); resetForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="text-form-title">
              {editEntry ? "Edit Journal Entry" : "New Journal Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Entry title..." data-testid="input-entry-title" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger data-testid="select-entry-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Privacy Level</Label>
                <Select value={formPrivacy} onValueChange={setFormPrivacy}>
                  <SelectTrigger data-testid="select-entry-privacy"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIVACY_LEVELS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                placeholder="Write your observation, strategy, or note..."
                className="min-h-[120px]"
                data-testid="textarea-entry-content"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Epistemic Status</Label>
                <Select value={formEpistemic} onValueChange={setFormEpistemic}>
                  <SelectTrigger data-testid="select-epistemic"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EPISTEMIC_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Confidence ({Math.round(formConfidence * 100)}%)</Label>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={formConfidence}
                  onChange={e => setFormConfidence(parseFloat(e.target.value))}
                  className="w-full mt-2"
                  data-testid="range-confidence"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="discovery, deposition, key-document..." data-testid="input-tags" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="flagged" checked={formFlagged} onCheckedChange={c => setFormFlagged(!!c)} data-testid="checkbox-flagged" />
              <Label htmlFor="flagged" className="text-sm font-normal cursor-pointer">Flag for attention</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditEntry(null); resetForm(); }} data-testid="button-cancel">Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!formTitle || !formContent || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-entry"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editEntry ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
