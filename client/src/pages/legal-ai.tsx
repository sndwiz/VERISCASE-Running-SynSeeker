import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Bot,
  Library,
  FileEdit,
  Search,
  ArrowRight,
  Flag,
  FilePlus,
  PanelLeftClose,
  Clock,
  FileText,
  FileSearch,
  Scale,
  Table2,
  Swords,
  Globe,
  GitCompare,
  Compass,
  FileDiff,
  CalendarClock,
  FileStack,
  Gavel,
  Mic,
  Filter,
  Eye,
  Wand2,
  CheckCircle,
  XCircle,
  Edit,
  FileCheck,
} from "lucide-react";
import type { Matter, DocumentTemplate, GeneratedDocument } from "@shared/schema";

type SidebarTab = "veribot" | "library" | "draft";

const WORKFLOW_CATEGORIES = ["Research", "Transactional", "Document Analysis", "Litigation", "International", "Video Analysis"] as const;

type WorkflowCategory = typeof WORKFLOW_CATEGORIES[number];

interface LegalWorkflow {
  id: string;
  title: string;
  description: string;
  icon: typeof Bot;
  tags: WorkflowCategory[];
}

const LEGAL_WORKFLOWS: LegalWorkflow[] = [
  {
    id: "research-question",
    title: "Ask a Research Question",
    description: "Find answers in case law, legislation, and secondary sources",
    icon: Search,
    tags: ["Research"],
  },
  {
    id: "analyze-contract",
    title: "Analyze a Contract",
    description: "Review clauses, definitions, risks, and client-hostile language",
    icon: FileSearch,
    tags: ["Transactional", "Document Analysis"],
  },
  {
    id: "analyze-complaint",
    title: "Analyze a Complaint",
    description: "Extract claims & facts, build timelines and propose defenses",
    icon: Scale,
    tags: ["Litigation", "Document Analysis"],
  },
  {
    id: "document-review-tables",
    title: "Document Review with Tables",
    description: "Produce table reports summarizing documents and collections",
    icon: Table2,
    tags: ["Document Analysis", "Transactional"],
  },
  {
    id: "build-argument",
    title: "Build an Argument",
    description: "Build an argument that supports your goals",
    icon: Swords,
    tags: ["Research", "Litigation"],
  },
  {
    id: "compare-jurisdictions",
    title: "Compare Jurisdictions",
    description: "Compare laws and regulations across many jurisdictions at once",
    icon: Globe,
    tags: ["Research", "International"],
  },
  {
    id: "redline-analysis",
    title: "Redline Analysis",
    description: "Identify contract changes to assess their impact and develop negotiation strategy",
    icon: GitCompare,
    tags: ["Transactional", "Document Analysis"],
  },
  {
    id: "explore-proposition",
    title: "Explore a Legal Proposition",
    description: "Find sources to support or oppose a proposition",
    icon: Compass,
    tags: ["Research", "Litigation"],
  },
  {
    id: "compare-documents",
    title: "Compare Documents",
    description: "Build a table summarising key differences in two documents",
    icon: FileDiff,
    tags: ["Document Analysis"],
  },
  {
    id: "create-timeline",
    title: "Create a Timeline",
    description: "Extract a chronology of events from your documents",
    icon: CalendarClock,
    tags: ["Document Analysis"],
  },
  {
    id: "summarize-documents",
    title: "Summarize Documents",
    description: "Rapidly generate summaries of your documents",
    icon: FileStack,
    tags: ["Document Analysis"],
  },
  {
    id: "analyze-pleadings",
    title: "Analyze Pleadings",
    description: "Perform analysis on statements of claim and defenses",
    icon: Gavel,
    tags: ["Litigation", "Document Analysis"],
  },
  {
    id: "analyze-deposition",
    title: "Analyze a Deposition",
    description: "Extract facts, identify follow-up questions and objections, and build timelines from depositions",
    icon: FileText,
    tags: ["Litigation", "Document Analysis"],
  },
  {
    id: "analyze-judicial-proceedings",
    title: "Analyze Judicial Proceedings",
    description: "Add a video or audio view, transcribe its content to text, and analyze it.",
    icon: Mic,
    tags: ["Video Analysis"],
  },
];

const WORKFLOW_SYSTEM_PROMPTS: Record<string, string> = {
  "research-question": "You are a legal research assistant. Help the user find answers in case law, legislation, and secondary sources. Provide citations and analyze the strength of authorities found.",
  "analyze-contract": "You are a contract analysis specialist. Review the contract text provided. Identify key clauses, definitions, risks, client-hostile language, and suggest revisions.",
  "analyze-complaint": "You are a litigation analyst. Extract claims and facts from the complaint, build a timeline of events, identify potential defenses, and assess the strength of each claim.",
  "document-review-tables": "You are a document review specialist. Produce structured table reports summarizing the key information from documents and collections provided.",
  "build-argument": "You are a legal argumentation specialist. Help construct a persuasive legal argument with supporting authorities, anticipate counter-arguments, and suggest rhetorical strategies.",
  "compare-jurisdictions": "You are a comparative law specialist. Compare laws, regulations, and case law across the specified jurisdictions. Highlight key differences and practical implications.",
  "redline-analysis": "You are a redline analysis specialist. Compare two document versions, identify all changes, assess their legal significance, and flag any concerning modifications.",
  "explore-proposition": "You are a legal reasoning specialist. Analyze the legal proposition provided, identify supporting and opposing authorities, and assess its viability.",
  "compare-documents": "You are a document comparison specialist. Compare the provided documents, identify similarities and differences, and assess their relative strengths.",
  "create-timeline": "You are a timeline construction specialist. Build a comprehensive chronological timeline from the facts provided, identify gaps, and highlight key dates.",
  "summarize-documents": "You are a document summarization specialist. Provide concise, accurate summaries of the documents provided, highlighting key points and action items.",
  "analyze-pleadings": "You are a pleadings analyst. Review the pleading for procedural compliance, substantive arguments, potential weaknesses, and suggested improvements.",
  "analyze-deposition": "You are a deposition analysis specialist. Review the deposition transcript, identify key admissions, inconsistencies, impeachment opportunities, and notable exchanges.",
  "analyze-judicial-proceedings": "You are a judicial proceedings analyst. Transcribe and analyze the audio/video content, identify key rulings, arguments, and procedural developments.",
};

const DRAFT_STATUS_CONFIG: Record<string, { label: string; icon: typeof FileText }> = {
  draft: { label: "Draft", icon: FileText },
  "ai-generated": { label: "AI Generated", icon: Wand2 },
  "pending-review": { label: "Pending Review", icon: Clock },
  "under-review": { label: "Under Review", icon: Eye },
  approved: { label: "Approved", icon: CheckCircle },
  rejected: { label: "Rejected", icon: XCircle },
  "revision-requested": { label: "Revision Requested", icon: Edit },
  finalized: { label: "Finalized", icon: FileCheck },
};

const TAG_COLORS: Record<WorkflowCategory, string> = {
  "Research": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Transactional": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Document Analysis": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "Litigation": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "International": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  "Video Analysis": "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

interface Conversation {
  id: number;
  title: string;
  matterId?: string;
}

export default function LegalAIPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<SidebarTab>("veribot");
  const [selectedMatterId, setSelectedMatterId] = useState<string>("__none__");
  const [promptText, setPromptText] = useState("");
  const [jurisdiction, setJurisdiction] = useState("us-utah");
  const [workflowFilter, setWorkflowFilter] = useState<string>("all");
  const [workflowSearch, setWorkflowSearch] = useState("");
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryFilter, setLibraryFilter] = useState("all");
  const [draftSearch, setDraftSearch] = useState("");

  const { data: matters = [], isLoading: mattersLoading } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<DocumentTemplate[]>({
    queryKey: ["/api/documents/templates"],
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery<GeneratedDocument[]>({
    queryKey: ["/api/documents/documents"],
  });

  const { data: recentConversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const launchWorkflowMutation = useMutation({
    mutationFn: async (data: { title: string; systemPrompt: string; matterId?: string; initialMessage?: string }) => {
      const res = await apiRequest("POST", "/api/conversations", {
        title: data.title,
        model: "claude-sonnet-4-5",
        matterId: data.matterId && data.matterId !== "__none__" ? data.matterId : undefined,
        systemPrompt: data.systemPrompt,
      });
      const conversation = await res.json();

      if (data.initialMessage) {
        await apiRequest("POST", `/api/conversations/${conversation.id}/messages`, {
          content: data.initialMessage,
        });
      }

      return conversation;
    },
    onSuccess: (conversation: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation(`/ai-chat?conversation=${conversation.id}`);
    },
    onError: () => {
      toast({ title: "Failed to launch workflow", variant: "destructive" });
    },
  });

  const handleWorkflowClick = (workflow: LegalWorkflow) => {
    const systemPrompt = WORKFLOW_SYSTEM_PROMPTS[workflow.id] || "";
    const initialMessage = promptText.trim()
      ? promptText
      : `I'd like to ${workflow.title.toLowerCase()}. Please help me get started.`;
    launchWorkflowMutation.mutate({
      title: workflow.title,
      systemPrompt,
      matterId: selectedMatterId,
      initialMessage,
    });
  };

  const handlePromptSubmit = () => {
    if (!promptText.trim()) return;
    launchWorkflowMutation.mutate({
      title: promptText.substring(0, 60) + (promptText.length > 60 ? "..." : ""),
      systemPrompt: `Jurisdiction context: ${jurisdiction}. The user is working in VERICASE legal practice management system.`,
      matterId: selectedMatterId,
      initialMessage: promptText,
    });
  };

  const filteredWorkflows = LEGAL_WORKFLOWS.filter((w) => {
    const matchesFilter = workflowFilter === "all" || w.tags.includes(workflowFilter as WorkflowCategory);
    const matchesSearch =
      workflowSearch === "" ||
      w.title.toLowerCase().includes(workflowSearch.toLowerCase()) ||
      w.description.toLowerCase().includes(workflowSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredTemplates = templates.filter((t) => {
    const matchesFilter = libraryFilter === "all" || t.category === libraryFilter;
    const matchesSearch =
      librarySearch === "" ||
      t.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
      t.description.toLowerCase().includes(librarySearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredDocuments = documents.filter((d) => {
    return (
      draftSearch === "" ||
      d.title.toLowerCase().includes(draftSearch.toLowerCase())
    );
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
      case "finalized":
        return "default" as const;
      case "rejected":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <div className="flex h-full" data-testid="legal-ai-workspace">
      <div className="w-60 shrink-0 flex flex-col bg-sidebar border-r" data-testid="legal-ai-sidebar">
        <div className="p-3 space-y-1">
          <Button
            variant={activeTab === "veribot" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab("veribot")}
            data-testid="button-tab-verbo"
          >
            <Bot className="h-4 w-4" />
            Verbo
          </Button>
          <Button
            variant={activeTab === "library" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab("library")}
            data-testid="button-tab-library"
          >
            <Library className="h-4 w-4" />
            Library
          </Button>
          <Button
            variant={activeTab === "draft" ? "secondary" : "ghost"}
            className="w-full justify-start gap-2"
            onClick={() => setActiveTab("draft")}
            data-testid="button-tab-draft"
          >
            <FileEdit className="h-4 w-4" />
            Draft
          </Button>
        </div>

        <Separator />

        <div className="px-3 pt-3 pb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider" data-testid="text-recents-header">
            Recents
          </span>
        </div>

        <ScrollArea className="flex-1 px-1">
          <div className="space-y-0.5 p-2">
            {recentConversations.slice(0, 8).map((conv) => (
              <button
                key={conv.id}
                className="w-full text-left rounded-md px-2 py-2 hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => setLocation(`/ai-chat?conversation=${conv.id}`)}
                data-testid={`button-recent-${conv.id}`}
              >
                <p className="text-sm truncate" data-testid={`text-recent-title-${conv.id}`}>
                  {conv.title}
                </p>
                <p className="text-xs text-muted-foreground" data-testid={`text-recent-matter-${conv.id}`}>
                  {conv.matterId ? "Linked to matter" : "No matter assigned"}
                </p>
              </button>
            ))}
            {recentConversations.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-4">No recent conversations</p>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2" data-testid="user-info">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">LH</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate" data-testid="text-user-name">Lauren Hosler</p>
              <p className="text-xs text-muted-foreground truncate" data-testid="text-user-firm">Synergy Law PLLC</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" data-testid="button-collapse-sidebar">
            <PanelLeftClose className="h-4 w-4" />
            Collapse
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden" data-testid="legal-ai-main">
        {activeTab === "veribot" && (
          <VeribotView
            matters={matters}
            mattersLoading={mattersLoading}
            selectedMatterId={selectedMatterId}
            onMatterChange={setSelectedMatterId}
            promptText={promptText}
            onPromptChange={setPromptText}
            jurisdiction={jurisdiction}
            onJurisdictionChange={setJurisdiction}
            workflowFilter={workflowFilter}
            onWorkflowFilterChange={setWorkflowFilter}
            workflowSearch={workflowSearch}
            onWorkflowSearchChange={setWorkflowSearch}
            filteredWorkflows={filteredWorkflows}
            onWorkflowClick={handleWorkflowClick}
            onPromptSubmit={handlePromptSubmit}
            isLaunching={launchWorkflowMutation.isPending}
          />
        )}
        {activeTab === "library" && (
          <LibraryView
            templates={filteredTemplates}
            isLoading={templatesLoading}
            searchQuery={librarySearch}
            onSearchChange={setLibrarySearch}
            filterCategory={libraryFilter}
            onFilterChange={setLibraryFilter}
          />
        )}
        {activeTab === "draft" && (
          <DraftView
            documents={filteredDocuments}
            isLoading={documentsLoading}
            searchQuery={draftSearch}
            onSearchChange={setDraftSearch}
            matters={matters}
          />
        )}
      </div>
    </div>
  );
}

function VeribotView({
  matters,
  mattersLoading,
  selectedMatterId,
  onMatterChange,
  promptText,
  onPromptChange,
  jurisdiction,
  onJurisdictionChange,
  workflowFilter,
  onWorkflowFilterChange,
  workflowSearch,
  onWorkflowSearchChange,
  filteredWorkflows,
  onWorkflowClick,
  onPromptSubmit,
  isLaunching,
}: {
  matters: Matter[];
  mattersLoading: boolean;
  selectedMatterId: string;
  onMatterChange: (v: string) => void;
  promptText: string;
  onPromptChange: (v: string) => void;
  jurisdiction: string;
  onJurisdictionChange: (v: string) => void;
  workflowFilter: string;
  onWorkflowFilterChange: (v: string) => void;
  workflowSearch: string;
  onWorkflowSearchChange: (v: string) => void;
  filteredWorkflows: LegalWorkflow[];
  onWorkflowClick: (workflow: LegalWorkflow) => void;
  onPromptSubmit: () => void;
  isLaunching: boolean;
}) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3" data-testid="matter-selector-section">
          <Select value={selectedMatterId} onValueChange={onMatterChange}>
            <SelectTrigger className="w-64" data-testid="select-matter">
              <SelectValue placeholder="Select Matter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__" data-testid="select-item-no-matter">
                Select Matter
              </SelectItem>
              {mattersLoading ? (
                <SelectItem value="__loading__" disabled>
                  Loading...
                </SelectItem>
              ) : (
                matters.map((m) => (
                  <SelectItem key={m.id} value={m.id} data-testid={`select-item-matter-${m.id}`}>
                    {m.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Ask any question or say what you would like to do..."
            value={promptText}
            onChange={(e) => onPromptChange(e.target.value)}
            className="min-h-[100px] resize-none text-base"
            data-testid="textarea-prompt"
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={jurisdiction} onValueChange={onJurisdictionChange}>
                <SelectTrigger className="w-56" data-testid="select-jurisdiction">
                  <div className="flex items-center gap-2">
                    <Flag className="h-3.5 w-3.5 shrink-0" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-utah" data-testid="select-item-utah">United States (Utah)</SelectItem>
                  <SelectItem value="us-federal" data-testid="select-item-federal">United States (Federal)</SelectItem>
                  <SelectItem value="us-california" data-testid="select-item-california">United States (California)</SelectItem>
                  <SelectItem value="us-new-york" data-testid="select-item-new-york">United States (New York)</SelectItem>
                  <SelectItem value="us-texas" data-testid="select-item-texas">United States (Texas)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-add-documents">
                <FilePlus className="h-4 w-4" />
                Add Documents
              </Button>
            </div>
            <Button
              size="icon"
              onClick={onPromptSubmit}
              disabled={isLaunching || !promptText.trim()}
              data-testid="button-submit-prompt"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid="text-workflows-header">Workflows</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={workflowFilter} onValueChange={onWorkflowFilterChange}>
                <SelectTrigger className="w-44" data-testid="select-workflow-filter">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 shrink-0" />
                    <SelectValue placeholder="Filter" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" data-testid="select-item-filter-all">All Categories</SelectItem>
                  {WORKFLOW_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat} data-testid={`select-item-filter-${cat.toLowerCase().replace(/\s+/g, "-")}`}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Find..."
                  value={workflowSearch}
                  onChange={(e) => onWorkflowSearchChange(e.target.value)}
                  className="pl-9 w-48"
                  data-testid="input-workflow-search"
                />
              </div>
            </div>
          </div>

          {filteredWorkflows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-no-workflows">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No workflows match your search</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredWorkflows.map((workflow) => (
                <Card
                  key={workflow.id}
                  className="cursor-pointer hover-elevate"
                  onClick={() => onWorkflowClick(workflow)}
                  data-testid={`card-workflow-${workflow.id}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                        <workflow.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm" data-testid={`text-workflow-title-${workflow.id}`}>
                          {workflow.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1 line-clamp-2" data-testid={`text-workflow-desc-${workflow.id}`}>
                          {workflow.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5">
                      {workflow.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${TAG_COLORS[tag]}`}
                          data-testid={`badge-workflow-tag-${workflow.id}-${tag.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function LibraryView({
  templates,
  isLoading,
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterChange,
}: {
  templates: DocumentTemplate[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  filterCategory: string;
  onFilterChange: (v: string) => void;
}) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div>
          <h2 className="text-lg font-semibold" data-testid="text-library-header">Library</h2>
          <p className="text-sm text-muted-foreground">Saved workflow templates and document templates</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search library..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              data-testid="input-library-search"
            />
          </div>
          <Select value={filterCategory} onValueChange={onFilterChange}>
            <SelectTrigger className="w-44" data-testid="select-library-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" data-testid="select-item-library-all">All Categories</SelectItem>
              <SelectItem value="motions" data-testid="select-item-library-motions">Motions</SelectItem>
              <SelectItem value="pleadings" data-testid="select-item-library-pleadings">Pleadings</SelectItem>
              <SelectItem value="discovery" data-testid="select-item-library-discovery">Discovery</SelectItem>
              <SelectItem value="torts" data-testid="select-item-library-torts">Torts</SelectItem>
              <SelectItem value="court-filings" data-testid="select-item-library-court-filings">Court Filings</SelectItem>
              <SelectItem value="client-forms" data-testid="select-item-library-client-forms">Client Forms</SelectItem>
              <SelectItem value="correspondence" data-testid="select-item-library-correspondence">Correspondence</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-5 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="text-no-templates">
            <Library className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No templates found</p>
            <p className="text-xs mt-1">Adjust your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover-elevate"
                data-testid={`card-template-${template.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <CardTitle className="text-sm" data-testid={`text-template-title-${template.id}`}>
                      {template.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-[10px] shrink-0" data-testid={`badge-template-category-${template.id}`}>
                      {template.category}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs line-clamp-2" data-testid={`text-template-desc-${template.id}`}>
                    {template.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span data-testid={`text-template-fields-${template.id}`}>
                      {template.requiredFields.length} required fields
                    </span>
                    {template.tags.length > 0 && (
                      <>
                        <span>|</span>
                        <div className="flex gap-1 flex-wrap">
                          {template.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

function DraftView({
  documents,
  isLoading,
  searchQuery,
  onSearchChange,
  matters,
}: {
  documents: GeneratedDocument[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  matters: Matter[];
}) {
  const getMatterName = (matterId?: string) => {
    if (!matterId) return "No matter";
    const matter = matters.find((m) => m.id === matterId);
    return matter?.name || "Unknown matter";
  };

  const getStatusConfig = (status: string) => {
    return DRAFT_STATUS_CONFIG[status] || DRAFT_STATUS_CONFIG.draft;
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved":
      case "finalized":
        return "default" as const;
      case "rejected":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-drafts-header">Drafts</h2>
            <p className="text-sm text-muted-foreground">Your draft documents and AI-generated content</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-56"
              data-testid="input-draft-search"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-4 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground" data-testid="text-no-drafts">
            <FileEdit className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No drafts found</p>
            <p className="text-xs mt-1">Generated documents will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const statusCfg = getStatusConfig(doc.status);
              const StatusIcon = statusCfg.icon;
              return (
                <Card
                  key={doc.id}
                  className="cursor-pointer hover-elevate"
                  data-testid={`card-draft-${doc.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-draft-title-${doc.id}`}>
                          {doc.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          <span data-testid={`text-draft-matter-${doc.id}`}>
                            {getMatterName(doc.matterId)}
                          </span>
                          <span data-testid={`text-draft-date-${doc.id}`}>
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Badge variant={getStatusBadgeVariant(doc.status)} className="gap-1 shrink-0" data-testid={`badge-draft-status-${doc.id}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusCfg.label}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" data-testid={`button-view-draft-${doc.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" data-testid={`button-edit-draft-${doc.id}`}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
