import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Library, Search, Filter, Plus, Check, X, Trash2,
  Trophy, XCircle, Sword, BookOpen, GraduationCap, Gavel,
  Loader2, ChevronDown,
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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

const CATEGORIES = [
  { value: "winning_arguments", label: "Winning Arguments", icon: Trophy, color: "text-green-500" },
  { value: "losing_arguments", label: "Losing Arguments", icon: XCircle, color: "text-red-500" },
  { value: "judge_profiles", label: "Judge Profiles", icon: Gavel, color: "text-blue-500" },
  { value: "opposition_tactics", label: "Opposition Tactics", icon: Sword, color: "text-orange-500" },
  { value: "lessons_learned", label: "Lessons Learned", icon: GraduationCap, color: "text-purple-500" },
];

const STATUSES = [
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

interface KBEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  practiceArea: string | null;
  sourceMatterId: string | null;
  sourceCaseOutcomeId: string | null;
  successRate: number | null;
  usageCount: number;
  status: string;
  curatedBy: string | null;
  curatedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface KBStats {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  pendingReview: number;
}

export default function KnowledgeBasePage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [formCategory, setFormCategory] = useState("winning_arguments");
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formPracticeArea, setFormPracticeArea] = useState("");

  const { data: entries = [], isLoading } = useQuery<KBEntry[]>({
    queryKey: ["/api/knowledge-base"],
  });

  const { data: stats } = useQuery<KBStats>({
    queryKey: ["/api/knowledge-base/stats"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/knowledge-base", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/stats"] });
      toast({ title: "Entry created" });
      setCreateOpen(false);
      setFormTitle(""); setFormContent(""); setFormTags(""); setFormPracticeArea("");
    },
    onError: (err: any) => toast({ title: "Failed", description: err.message, variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/knowledge-base/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/stats"] });
      toast({ title: "Entry approved" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/knowledge-base/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/stats"] });
      toast({ title: "Entry rejected" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/knowledge-base/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/stats"] });
      toast({ title: "Entry deleted" });
    },
  });

  const filtered = entries.filter(e => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b flex-wrap">
        <Library className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold" data-testid="text-kb-title">Knowledge Base</h1>
        {stats && (
          <Badge variant="secondary">{stats.total} entries</Badge>
        )}
        {stats && stats.pendingReview > 0 && (
          <Badge variant="outline" className="text-yellow-500">{stats.pendingReview} pending review</Badge>
        )}
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search knowledge base..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 w-52"
              data-testid="input-kb-search"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44" data-testid="select-kb-category"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36" data-testid="select-kb-status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-new-kb-entry">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {stats && (
          <div className="grid grid-cols-5 gap-3 mb-6 max-w-4xl mx-auto">
            {CATEGORIES.map(cat => {
              const count = stats.byCategory[cat.value] || 0;
              const Icon = cat.icon;
              return (
                <Card
                  key={cat.value}
                  className={`p-3 cursor-pointer hover-elevate ${filterCategory === cat.value ? "ring-1 ring-primary" : ""}`}
                  onClick={() => setFilterCategory(filterCategory === cat.value ? "all" : cat.value)}
                  data-testid={`card-category-${cat.value}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${cat.color}`} />
                    <span className="text-xs font-medium truncate">{cat.label}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{count}</p>
                </Card>
              );
            })}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Library className="h-10 w-10" />
            <p className="text-sm">No entries found</p>
            <p className="text-xs">Entries are auto-generated from case outcomes or created manually.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl mx-auto">
            {filtered.map(entry => {
              const catConfig = CATEGORIES.find(c => c.value === entry.category);
              const CatIcon = catConfig?.icon || BookOpen;
              return (
                <Card key={entry.id} className="p-4" data-testid={`card-kb-${entry.id}`}>
                  <div className="flex items-start gap-3">
                    <CatIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${catConfig?.color || ""}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm">{entry.title}</span>
                        <Badge variant="outline" className="text-xs">{catConfig?.label}</Badge>
                        <Badge
                          variant={entry.status === "approved" ? "default" : entry.status === "rejected" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {entry.status === "pending_review" ? "Pending Review" : entry.status === "approved" ? "Approved" : "Rejected"}
                        </Badge>
                        {entry.successRate !== null && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {Math.round(entry.successRate * 100)}% effective
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">{entry.content}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</span>
                        {entry.practiceArea && <Badge variant="outline" className="text-xs">{entry.practiceArea}</Badge>}
                        {(entry.tags as string[] || []).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {entry.status === "pending_review" && (
                        <>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => approveMutation.mutate(entry.id)}
                            title="Approve"
                            data-testid={`button-approve-${entry.id}`}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => rejectMutation.mutate(entry.id)}
                            title="Reject"
                            data-testid={`button-reject-${entry.id}`}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        title="Delete"
                        data-testid={`button-delete-kb-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Knowledge Base Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger data-testid="select-new-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Brief title..." data-testid="input-new-title" />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={formContent} onChange={e => setFormContent(e.target.value)} placeholder="Detailed description..." className="min-h-[100px]" data-testid="textarea-new-content" />
            </div>
            <div className="space-y-2">
              <Label>Practice Area</Label>
              <Input value={formPracticeArea} onChange={e => setFormPracticeArea(e.target.value)} placeholder="e.g., Personal Injury, Family Law..." data-testid="input-new-practice-area" />
            </div>
            <div className="space-y-2">
              <Label>Tags (comma-separated)</Label>
              <Input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="discovery, motion practice..." data-testid="input-new-tags" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({
                category: formCategory,
                title: formTitle,
                content: formContent,
                practiceArea: formPracticeArea || undefined,
                tags: formTags.split(",").map(t => t.trim()).filter(Boolean),
              })}
              disabled={!formTitle || !formContent || createMutation.isPending}
              data-testid="button-create-kb"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
