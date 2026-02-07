import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Mail,
  Search,
  Plus,
  Copy,
  Eye,
  Archive,
  Zap,
  LayoutGrid,
  PlayCircle,
  Package,
  FileText,
  Tag,
  Clock,
  User,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Send,
} from "lucide-react";

interface Template {
  id: string;
  type: string;
  scopeType: string;
  scopeId: string | null;
  name: string;
  description: string;
  category: string;
  tagsJson: string[];
  createdByUserId: string;
  version: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateDetail extends Template {
  content: {
    subject?: string;
    body?: string;
    placeholders?: string[];
    steps?: any[];
    trigger?: any;
    conditions?: any[];
    actions?: any[];
    columns?: any[];
    groups?: any[];
  };
  usageCount: number;
}

const typeIcons: Record<string, any> = {
  email: Mail,
  macro: PlayCircle,
  automation: Zap,
  board: LayoutGrid,
  "automation-board": Zap,
  package: Package,
};

const typeLabels: Record<string, string> = {
  email: "Email Templates",
  macro: "Process Macros",
  automation: "Automation Templates",
  board: "Board Templates",
  "automation-board": "Automation Boards",
  package: "Packages",
};

const categories = [
  "all", "intake", "medical", "litigation", "discovery", "deposition",
  "settlement", "damages", "client-comms", "follow-up", "risk", "expert", "general",
];

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState("email");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDetail | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates", activeTab, searchQuery, activeCategory],
    queryFn: async () => {
      const params = new URLSearchParams({ type: activeTab });
      if (searchQuery) params.set("q", searchQuery);
      if (activeCategory !== "all") params.set("category", activeCategory);
      const res = await fetch(`/api/templates?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/templates/seed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Templates seeded", description: "20 legal email templates have been added to your library." });
    },
    onError: () => toast({ title: "Seed failed", variant: "destructive" }),
  });

  const useMutation2 = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/templates/${id}/use`),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      if (data.content?.body) {
        navigator.clipboard.writeText(data.content.body).then(() => {
          toast({ title: "Copied to clipboard", description: "Template body copied. Paste and fill in placeholders." });
        }).catch(() => {
          toast({ title: "Template ready", description: "Use the preview to copy the template content." });
        });
      }
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setSelectedTemplate(null);
      toast({ title: "Template archived" });
    },
  });

  const fetchTemplateDetail = async (id: string) => {
    const res = await fetch(`/api/templates/${id}`);
    if (!res.ok) return;
    const detail: TemplateDetail = await res.json();
    setSelectedTemplate(detail);
    setShowPreviewDialog(true);
  };

  const filteredTemplates = templates;

  return (
    <div className="flex flex-col h-full" data-testid="page-templates">
      <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-templates-title">Template Library</h1>
          <p className="text-sm text-muted-foreground">Reusable email templates, macros, automations, and board templates</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "email" && templates.length === 0 && (
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              data-testid="button-seed-templates"
            >
              {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span className="ml-1">Seed 20 Legal Templates</span>
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-template">
            <Plus className="h-4 w-4" />
            <span className="ml-1">New Template</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList data-testid="tabs-template-type">
            {Object.entries(typeLabels).map(([key, label]) => {
              const Icon = typeIcons[key];
              return (
                <TabsTrigger key={key} value={key} data-testid={`tab-${key}`}>
                  <Icon className="h-4 w-4 mr-1" />
                  {label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-templates"
            />
          </div>
          <ScrollArea className="max-w-full">
            <div className="flex gap-1 flex-wrap">
              {categories.map(cat => (
                <Badge
                  key={cat}
                  variant={activeCategory === cat ? "default" : "outline"}
                  className="cursor-pointer capitalize toggle-elevate"
                  onClick={() => setActiveCategory(cat)}
                  data-testid={`badge-category-${cat}`}
                >
                  {cat === "all" ? "All" : cat.replace("-", " ")}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              {activeTab === "automation-board" ? (
                <>
                  <Zap className="h-10 w-10" />
                  <p className="font-medium text-foreground" data-testid="text-no-automation-boards">Automation Board Templates</p>
                  <p className="text-sm text-center max-w-md" data-testid="text-automation-boards-desc">
                    This section is ready for your custom automation board templates.
                    Add your own workflow board configurations that will auto-generate
                    boards with pre-configured columns, groups, automations, and tasks.
                  </p>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    data-testid="button-add-first-automation-board"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Your First Automation Board Template
                  </Button>
                </>
              ) : (
                <>
                  <FileText className="h-8 w-8" />
                  <p data-testid="text-no-templates">No templates found</p>
                  {activeTab === "email" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => seedMutation.mutate()}
                      disabled={seedMutation.isPending}
                      data-testid="button-seed-templates-empty"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Seed starter templates
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  onView={() => fetchTemplateDetail(tpl.id)}
                  onUse={() => useMutation2.mutate(tpl.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {showPreviewDialog && selectedTemplate && (
        <TemplatePreviewDialog
          template={selectedTemplate}
          open={showPreviewDialog}
          onClose={() => { setShowPreviewDialog(false); setSelectedTemplate(null); }}
          onUse={() => useMutation2.mutate(selectedTemplate.id)}
          onArchive={() => archiveMutation.mutate(selectedTemplate.id)}
        />
      )}

      {showCreateDialog && (
        <CreateTemplateDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          defaultType={activeTab}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, onView, onUse }: { template: Template; onView: () => void; onUse: () => void }) {
  const Icon = typeIcons[template.type] || FileText;
  const tags = Array.isArray(template.tagsJson) ? template.tagsJson : [];

  return (
    <Card className="hover-elevate cursor-pointer" data-testid={`card-template-${template.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="rounded-md bg-muted p-1.5">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-sm truncate">{template.name}</CardTitle>
          </div>
          <Badge variant="outline" className="capitalize text-xs shrink-0">{template.category}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
        {tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
            {tags.length > 3 && <Badge variant="secondary" className="text-xs">+{tags.length - 3}</Badge>}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            v{template.version}
          </span>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onView(); }} data-testid={`button-view-${template.id}`}>
              <Eye className="h-3.5 w-3.5 mr-1" />
              View
            </Button>
            <Button size="sm" onClick={(e) => { e.stopPropagation(); onUse(); }} data-testid={`button-use-${template.id}`}>
              <Send className="h-3.5 w-3.5 mr-1" />
              Use
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TemplatePreviewDialog({ template, open, onClose, onUse, onArchive }: {
  template: TemplateDetail;
  open: boolean;
  onClose: () => void;
  onUse: () => void;
  onArchive: () => void;
}) {
  const content = template.content || {};

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-template-preview">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(() => { const Icon = typeIcons[template.type] || FileText; return <Icon className="h-5 w-5" />; })()}
            {template.name}
          </DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">{template.type}</Badge>
            <Badge variant="outline" className="capitalize">{template.category}</Badge>
            <span className="text-xs text-muted-foreground">v{template.version}</span>
            <span className="text-xs text-muted-foreground">Used {template.usageCount} times</span>
          </div>

          {Array.isArray(template.tagsJson) && template.tagsJson.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {template.tagsJson.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />{tag}
                </Badge>
              ))}
            </div>
          )}

          <Separator />

          {template.type === "email" && content.subject && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <div className="rounded-md border p-3 bg-muted/30 font-mono text-sm" data-testid="text-template-subject">
                  {content.subject}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Body</Label>
                <div className="rounded-md border p-3 bg-muted/30 font-mono text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto" data-testid="text-template-body">
                  {content.body}
                </div>
              </div>
              {content.placeholders && content.placeholders.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Placeholders</Label>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {content.placeholders.map(p => (
                      <Badge key={p} variant="outline" className="font-mono text-xs">{`{{${p}}}`}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {template.type === "macro" && content.steps && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Steps</Label>
              {content.steps.map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md border">
                  <Badge variant="outline" className="text-xs">{i + 1}</Badge>
                  <span className="text-sm">{step.action || step.instruction || JSON.stringify(step)}</span>
                </div>
              ))}
            </div>
          )}

          {template.type === "automation" && content.trigger && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Trigger</Label>
              <div className="rounded-md border p-2 text-sm">{JSON.stringify(content.trigger)}</div>
              {content.actions && content.actions.length > 0 && (
                <>
                  <Label className="text-xs text-muted-foreground">Actions</Label>
                  {content.actions.map((act: any, i: number) => (
                    <div key={i} className="rounded-md border p-2 text-sm">{JSON.stringify(act)}</div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={onArchive} data-testid="button-archive-template">
            <Archive className="h-4 w-4 mr-1" />
            Archive
          </Button>
          <Button variant="outline" onClick={() => {
            const text = template.type === "email" ? `Subject: ${content.subject}\n\n${content.body}` : JSON.stringify(content, null, 2);
            navigator.clipboard.writeText(text);
          }} data-testid="button-copy-template">
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>
          <Button onClick={onUse} data-testid="button-use-template-detail">
            <Send className="h-4 w-4 mr-1" />
            Use Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateTemplateDialog({ open, onClose, defaultType }: { open: boolean; onClose: () => void; defaultType: string }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState(defaultType);
  const [category, setCategory] = useState("general");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const content: any = {};
      if (type === "email") {
        content.subject = subject;
        content.body = body;
        const placeholderMatches = (subject + " " + body).match(/\{\{(\w+)\}\}/g) || [];
        content.placeholders = Array.from(new Set(placeholderMatches.map(m => m.replace(/\{\{|\}\}/g, ""))));
      }

      return apiRequest("POST", "/api/templates", {
        type,
        name,
        description,
        category,
        tagsJson: tags.split(",").map(t => t.trim()).filter(Boolean),
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template created" });
      onClose();
    },
    onError: () => toast({ title: "Failed to create template", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="dialog-create-template">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
          <DialogDescription>Add a new reusable template to your library</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger data-testid="select-template-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="macro">Macro</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="board">Board</SelectItem>
                  <SelectItem value="automation-board">Automation Board</SelectItem>
                  <SelectItem value="package">Package</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-template-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c !== "all").map(c => (
                    <SelectItem key={c} value={c} className="capitalize">{c.replace("-", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Template name" data-testid="input-template-name" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="When to use this template" data-testid="input-template-description" />
          </div>
          <div className="space-y-1.5">
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="litigation, client-comms, medical" data-testid="input-template-tags" />
          </div>

          {type === "email" && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject line with {{PLACEHOLDERS}}" data-testid="input-template-subject" />
              </div>
              <div className="space-y-1.5">
                <Label>Body</Label>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Email body with {{PLACEHOLDERS}}..."
                  className="min-h-[150px] font-mono text-sm"
                  data-testid="input-template-body"
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name || createMutation.isPending}
            data-testid="button-save-template"
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ml-1">Create</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
