import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Sparkles,
  ArrowRight,
  Search,
  LayoutGrid,
  ClipboardList,
  CalendarRange,
  FolderSearch,
  UserPlus,
  DollarSign,
  Scale,
  FileCheck,
  Shield,
  FileText,
  Users,
  BookOpen,
  Gavel,
  Loader2,
  Zap,
  ChevronDown,
  ChevronUp,
  Bot,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VibeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  automationCount: number;
  automationSummary: string[];
}

const templateIcons: Record<string, any> = {
  "clipboard-list": ClipboardList,
  "calendar-range": CalendarRange,
  "folder-search": FolderSearch,
  "user-plus": UserPlus,
  "dollar-sign": DollarSign,
  "scale": Scale,
  "file-check": FileCheck,
  "shield": Shield,
  "file-text": FileText,
  "users": Users,
  "book-open": BookOpen,
  "gavel": Gavel,
  "layout-grid": LayoutGrid,
};

const actionTypeIcons: Record<string, any> = {
  send_notification: Bell,
  change_priority: AlertTriangle,
  ai_categorize: Bot,
  ai_summarize: Bot,
  ai_extract: Bot,
  ai_write: Bot,
  log_compliance: CheckCircle2,
  request_approval: CheckCircle2,
  due_date_approaching: Clock,
  due_date_passed: AlertTriangle,
};

const quickSuggestions = [
  "Case intake tracker with conflict checks and auto-assignment",
  "Deposition prep board with AI transcript analysis",
  "E-discovery pipeline with deadline alerts",
  "Motion practice tracker with approval gates",
  "Client billing board with overdue escalation",
  "Trial preparation checklist with witness coordination",
];

const categoryLabels: Record<string, string> = {
  legal: "Legal Practice",
  business: "Business",
  operations: "Operations",
  finance: "Finance",
};

const categoryOrder = ["legal", "business", "operations", "finance"];

export default function VibeAutomatorPage() {
  const [prompt, setPrompt] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading: templatesLoading } = useQuery<VibeTemplate[]>({
    queryKey: ["/api/vibe/templates"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { prompt?: string; templateId?: string }) => {
      const res = await apiRequest("POST", "/api/vibe/generate", data);
      return res.json();
    },
    onSuccess: (data: { boardId: string; name: string; automationsCreated: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({
        title: `"${data.name}" created`,
        description: `Board ready with ${data.automationsCreated} automation${data.automationsCreated === 1 ? "" : "s"} wired up`,
      });
      setLocation(`/boards/${data.boardId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handlePromptSubmit = () => {
    if (!prompt.trim()) return;
    generateMutation.mutate({ prompt: prompt.trim() });
  };

  const handleTemplateClick = (templateId: string) => {
    generateMutation.mutate({ templateId });
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const toggleExpanded = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTemplate(expandedTemplate === id ? null : id);
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      !searchFilter ||
      t.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.description.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedTemplates = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      templates: filteredTemplates.filter((t) => t.category === cat),
    }))
    .filter((g) => g.templates.length > 0);

  const isGenerating = generateMutation.isPending;

  return (
    <div className="flex flex-col h-full">
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary">
                <Zap className="h-8 w-8 text-primary-foreground animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold" data-testid="text-generating-title">Building your board...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configuring columns, groups, tasks, and wiring up automations
              </p>
            </div>
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Zap className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold" data-testid="text-vibe-heading">
                Vibe Automator
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Describe what you need and get a fully configured board with live automations wired up
            </p>
          </div>

          <div className="relative mb-6">
            <div className="rounded-md border-2 border-primary/30 focus-within:border-primary transition-colors">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you need... (e.g., 'A discovery tracker that alerts me when deadlines approach and uses AI to categorize incoming documents')"
                className="min-h-[120px] border-0 resize-none text-base focus-visible:ring-0 focus-visible:ring-offset-0"
                data-testid="input-vibe-prompt"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handlePromptSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2 px-3 pb-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Ctrl+Enter to generate
                </p>
                <Button
                  onClick={handlePromptSubmit}
                  disabled={!prompt.trim() || isGenerating}
                  className="gap-2"
                  data-testid="button-generate-vibe"
                >
                  <Zap className="h-4 w-4" />
                  Build Board + Automations
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {quickSuggestions.map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSuggestion(suggestion)}
                className="gap-1 text-xs"
                data-testid={`button-suggestion-${suggestion.slice(0, 20).toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Sparkles className="h-3 w-3 text-muted-foreground" />
                {suggestion}
              </Button>
            ))}
          </div>

          <div className="border-t pt-8">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div>
                <h2 className="text-xl font-semibold" data-testid="text-templates-heading">
                  Pre-Built Automations
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Each template creates a board with real automations ready to fire
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search..."
                    className="pl-9 w-48"
                    data-testid="input-search-templates"
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    data-testid="button-filter-all"
                  >
                    All
                  </Button>
                  {categoryOrder.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      data-testid={`button-filter-${cat}`}
                    >
                      {categoryLabels[cat]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {templatesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-8">
                {groupedTemplates.map((group) => (
                  <div key={group.category}>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
                      {group.label}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {group.templates.map((template) => {
                        const IconComp = templateIcons[template.icon] || LayoutGrid;
                        const isExpanded = expandedTemplate === template.id;
                        return (
                          <Card
                            key={template.id}
                            className="cursor-pointer hover-elevate transition-all"
                            onClick={() => handleTemplateClick(template.id)}
                            data-testid={`card-template-${template.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div
                                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                                  style={{ backgroundColor: template.color }}
                                >
                                  <IconComp className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium text-sm" data-testid={`text-template-name-${template.id}`}>
                                      {template.name}
                                    </h4>
                                    <Badge variant="secondary" className="text-[10px] gap-1">
                                      <Zap className="h-2.5 w-2.5" />
                                      {template.automationCount}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {template.description}
                                  </p>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 h-6 px-1 text-xs text-muted-foreground gap-1"
                                    onClick={(e) => toggleExpanded(template.id, e)}
                                    data-testid={`button-expand-${template.id}`}
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="h-3 w-3" />
                                        Hide automations
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-3 w-3" />
                                        View automations
                                      </>
                                    )}
                                  </Button>
                                  {isExpanded && (
                                    <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                      {template.automationSummary.map((summary, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center gap-2 text-xs text-muted-foreground"
                                          data-testid={`text-automation-${template.id}-${i}`}
                                        >
                                          <Zap className="h-3 w-3 text-primary shrink-0" />
                                          <span>{summary}</span>
                                        </div>
                                      ))}
                                      <div className="pt-1">
                                        <Button
                                          size="sm"
                                          className="gap-1 w-full"
                                          onClick={() => handleTemplateClick(template.id)}
                                          data-testid={`button-create-${template.id}`}
                                        >
                                          <Zap className="h-3.5 w-3.5" />
                                          Create with automations
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredTemplates.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>No templates match your search</p>
                    <p className="text-sm mt-1">Try a different search term or use the prompt to build a custom automation board</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
