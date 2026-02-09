import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Zap, 
  Plus,
  Trash2,
  Play,
  ArrowRight,
  Clock,
  Loader2,
  Bot,
  Sparkles,
  Smartphone,
  Search,
  Globe,
  LayoutGrid,
  Workflow,
  Send,
  BarChart3,
  RefreshCw,
  MessageSquare,
  Smile,
} from "lucide-react";
import { SiSlack, SiGmail } from "react-icons/si";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  TRIGGER_TYPES,
  ACTION_TYPES,
  AUTOMATION_CATEGORIES,
  ALL_TEMPLATES,
} from "./automations/automation-templates";
import type { AutomationTemplate } from "./automations/automation-templates";
import {
  AIIcon,
  TemplateCard,
  FeaturedIntegrationCard,
  AIAutomationBuilder,
} from "./automations/automation-components";

interface AutomationRule {
  id: string;
  boardId: string;
  name: string;
  description: string;
  isActive: boolean;
  triggerType: string;
  triggerField?: string;
  triggerValue?: string;
  conditions: { field: string; operator: string; value: any }[];
  actionType: string;
  actionConfig: Record<string, any>;
  runCount: number;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
}

interface Board {
  id: string;
  name: string;
}

export default function AutomationsPage() {
  const { toast } = useToast();
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("templates");
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [workflowInput, setWorkflowInput] = useState("");
  
  const [suggestedAutomations] = useState([
    {
      prompt: "When a task is marked complete, notify the client via email",
      description: "You frequently update clients after completing tasks",
      confidence: 0.87,
    },
    {
      prompt: "When a deadline is within 3 days, set priority to high and notify the team",
      description: "You often manually escalate tasks as deadlines approach",
      confidence: 0.72,
    },
    {
      prompt: "When a document is uploaded, extract key dates and parties using AI",
      description: "You regularly extract information from uploaded documents",
      confidence: 0.65,
    },
  ]);
  
  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    triggerType: "item_created" as keyof typeof TRIGGER_TYPES,
    triggerValue: "",
    actionType: "change_status" as keyof typeof ACTION_TYPES,
    actionConfig: {} as Record<string, any>,
  });

  const filteredTemplates = ALL_TEMPLATES.filter((template) => {
    const matchesSearch = templateSearchQuery
      ? template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(templateSearchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory ? template.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const aiTemplates = filteredTemplates.filter(t => t.category === "ai_powered");
  const integrationTemplates = filteredTemplates.filter(t => t.category === "integrations");
  const otherTemplates = filteredTemplates.filter(t => !["ai_powered", "integrations"].includes(t.category));

  const handleUseTemplate = (template: AutomationTemplate) => {
    setRuleForm({
      name: template.name,
      description: template.description,
      triggerType: template.triggerType as keyof typeof TRIGGER_TYPES,
      triggerValue: "",
      actionType: template.actionType as keyof typeof ACTION_TYPES,
      actionConfig: {},
    });
    setShowTemplatesDialog(false);
    setSelectedCategory(null);
    setTemplateSearchQuery("");
    setShowCreateDialog(true);
  };

  const handleOpenTemplates = () => {
    setSelectedCategory(null);
    setTemplateSearchQuery("");
    setActiveTab("templates");
    setShowTemplatesDialog(true);
  };

  const handleBuildFromAI = (prompt: string) => {
    if (!selectedBoardId) {
      toast({
        title: "No board selected",
        description: "Please select a board first to create automations.",
        variant: "destructive",
      });
      return;
    }

    const promptLower = prompt.toLowerCase();
    
    let detectedTrigger: keyof typeof TRIGGER_TYPES = "item_created";
    let detectedAction: keyof typeof ACTION_TYPES = "send_notification";
    
    if (promptLower.includes("status change") || promptLower.includes("when status")) {
      detectedTrigger = "status_changed";
    } else if (promptLower.includes("deadline") || promptLower.includes("due date")) {
      detectedTrigger = "deadline_warning";
    } else if (promptLower.includes("document") || promptLower.includes("file") || promptLower.includes("upload")) {
      detectedTrigger = "file_uploaded";
    } else if (promptLower.includes("approval") || promptLower.includes("approved") || promptLower.includes("review")) {
      detectedTrigger = "approval_status_changed";
    } else if (promptLower.includes("priority")) {
      detectedTrigger = "priority_changed";
    } else if (promptLower.includes("assigned") || promptLower.includes("assign")) {
      detectedTrigger = "assigned";
    } else if (promptLower.includes("created") || promptLower.includes("new item") || promptLower.includes("new task")) {
      detectedTrigger = "item_created";
    }
    
    if (promptLower.includes("notify") || promptLower.includes("alert") || promptLower.includes("send notification")) {
      detectedAction = "send_notification";
    } else if (promptLower.includes("approval") || promptLower.includes("review") || promptLower.includes("attorney")) {
      detectedAction = "request_approval";
    } else if (promptLower.includes("email")) {
      detectedAction = "send_email";
    } else if (promptLower.includes("extract") || promptLower.includes("ai extract")) {
      detectedAction = "ai_extract";
    } else if (promptLower.includes("summarize") || promptLower.includes("summary")) {
      detectedAction = "ai_summarize";
    } else if (promptLower.includes("categorize") || promptLower.includes("classify")) {
      detectedAction = "ai_categorize";
    } else if (promptLower.includes("priority") && promptLower.includes("change")) {
      detectedAction = "change_priority";
    } else if (promptLower.includes("status") && (promptLower.includes("change") || promptLower.includes("set"))) {
      detectedAction = "change_status";
    } else if (promptLower.includes("slack")) {
      detectedAction = "send_slack";
    } else if (promptLower.includes("time tracking") || promptLower.includes("start time")) {
      detectedAction = "start_time_tracking";
    }
    
    setRuleForm({
      name: prompt.slice(0, 100) + (prompt.length > 100 ? "..." : ""),
      description: `AI-generated automation: ${prompt}`,
      triggerType: detectedTrigger,
      triggerValue: "",
      actionType: detectedAction,
      actionConfig: {},
    });
    
    setShowAIBuilder(false);
    setShowCreateDialog(true);
    
    toast({
      title: "Automation built by AI",
      description: `Created automation with trigger "${TRIGGER_TYPES[detectedTrigger]?.label}" and action "${ACTION_TYPES[detectedAction]?.label}". Review and customize as needed.`,
    });
  };

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
  });

  const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/boards", selectedBoardId, "automations"],
    enabled: !!selectedBoardId,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: typeof ruleForm) => {
      const res = await apiRequest("POST", `/api/boards/${selectedBoardId}/automations`, {
        boardId: selectedBoardId,
        name: data.name,
        description: data.description,
        isActive: true,
        triggerType: data.triggerType,
        triggerValue: data.triggerValue || undefined,
        conditions: [],
        actionType: data.actionType,
        actionConfig: data.actionConfig,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", selectedBoardId, "automations"] });
      setShowCreateDialog(false);
      setRuleForm({ name: "", description: "", triggerType: "item_created", triggerValue: "", actionType: "change_status", actionConfig: {} });
      toast({ title: "Automation created", description: "Your new automation rule is now active." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create automation.", variant: "destructive" });
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AutomationRule> }) => {
      const res = await apiRequest("PATCH", `/api/automations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", selectedBoardId, "automations"] });
      toast({ title: "Automation updated", description: "Changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update automation.", variant: "destructive" });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/automations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", selectedBoardId, "automations"] });
      setSelectedRule(null);
      toast({ title: "Automation deleted", description: "The automation rule has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete automation.", variant: "destructive" });
    }
  });

  const toggleRule = (rule: AutomationRule) => {
    updateRuleMutation.mutate({ id: rule.id, data: { isActive: !rule.isActive } });
  };

  const renderActionConfig = () => {
    switch (ruleForm.actionType) {
      case "change_status":
        return (
          <div className="space-y-2">
            <Label>New Status</Label>
            <Select 
              value={ruleForm.actionConfig.status || ""} 
              onValueChange={v => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, status: v } }))}
            >
              <SelectTrigger data-testid="select-action-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case "change_priority":
        return (
          <div className="space-y-2">
            <Label>New Priority</Label>
            <Select 
              value={ruleForm.actionConfig.priority || ""} 
              onValueChange={v => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, priority: v } }))}
            >
              <SelectTrigger data-testid="select-action-priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      case "send_notification":
      case "send_slack":
      case "send_email":
        return (
          <div className="space-y-2">
            <Label>Notification Message</Label>
            <Textarea 
              value={ruleForm.actionConfig.message || ""}
              onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, message: e.target.value } }))}
              placeholder="Enter notification message..."
              data-testid="input-action-message"
            />
          </div>
        );
      case "send_sms":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number(s)</Label>
              <Input 
                value={ruleForm.actionConfig.phoneNumbers || ""}
                onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, phoneNumbers: e.target.value } }))}
                placeholder="+1234567890"
                data-testid="input-action-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                value={ruleForm.actionConfig.message || ""}
                onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, message: e.target.value } }))}
                placeholder="Enter SMS message..."
                data-testid="input-action-sms-message"
              />
            </div>
          </div>
        );
      case "trigger_webhook":
        return (
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <Input 
              value={ruleForm.actionConfig.webhookUrl || ""}
              onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, webhookUrl: e.target.value } }))}
              placeholder="https://..."
              data-testid="input-action-webhook"
            />
          </div>
        );
      case "ai_fill_column":
      case "ai_summarize":
      case "ai_categorize":
      case "ai_detect_language":
      case "ai_translate":
      case "ai_sentiment":
      case "ai_improve":
      case "ai_extract":
      case "ai_write":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Source Column</Label>
              <Input 
                value={ruleForm.actionConfig.sourceColumn || ""}
                onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, sourceColumn: e.target.value } }))}
                placeholder="Column to analyze..."
                data-testid="input-ai-source"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Column</Label>
              <Input 
                value={ruleForm.actionConfig.targetColumn || ""}
                onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, targetColumn: e.target.value } }))}
                placeholder="Column to update..."
                data-testid="input-ai-target"
              />
            </div>
            {(ruleForm.actionType === "ai_translate") && (
              <div className="space-y-2">
                <Label>Target Language</Label>
                <Select 
                  value={ruleForm.actionConfig.targetLanguage || ""} 
                  onValueChange={v => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, targetLanguage: v } }))}
                >
                  <SelectTrigger data-testid="select-target-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {(ruleForm.actionType === "ai_categorize" || ruleForm.actionType === "ai_extract") && (
              <div className="space-y-2">
                <Label>Instructions</Label>
                <Textarea 
                  value={ruleForm.actionConfig.instructions || ""}
                  onChange={e => setRuleForm(p => ({ ...p, actionConfig: { ...p.actionConfig, instructions: e.target.value } }))}
                  placeholder="Describe what to extract or how to categorize..."
                  data-testid="input-ai-instructions"
                />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="page-automations">
      <div className="flex items-center justify-between p-4 border-b gap-4">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-muted-foreground">AI-powered workflow automation</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
            <SelectTrigger className="w-[200px]" data-testid="select-board">
              <SelectValue placeholder="Select board" />
            </SelectTrigger>
            <SelectContent>
              {boards.map(board => (
                <SelectItem key={board.id} value={board.id}>
                  {board.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button 
            variant="outline"
            onClick={() => setShowAIBuilder(!showAIBuilder)}
            className="gap-2"
            data-testid="button-ai-builder"
          >
            <Bot className="h-4 w-4" />
            AI Builder
          </Button>

          {selectedBoardId && (
            <>
            <Button 
              variant="outline"
              onClick={handleOpenTemplates}
              data-testid="button-add-automation"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-automation">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Custom
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Automation</DialogTitle>
                  <DialogDescription>Set up a new automation rule for this board.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input 
                      value={ruleForm.name}
                      onChange={e => setRuleForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Auto-assign urgent tasks"
                      data-testid="input-rule-name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      value={ruleForm.description}
                      onChange={e => setRuleForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="What does this automation do?"
                      data-testid="input-rule-description"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>When (Trigger)</Label>
                      <Select 
                        value={ruleForm.triggerType} 
                        onValueChange={v => setRuleForm(p => ({ ...p, triggerType: v as any }))}
                      >
                        <SelectTrigger data-testid="select-trigger-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TRIGGER_TYPES).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {TRIGGER_TYPES[ruleForm.triggerType]?.description}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Then (Action)</Label>
                      <Select 
                        value={ruleForm.actionType} 
                        onValueChange={v => setRuleForm(p => ({ ...p, actionType: v as any, actionConfig: {} }))}
                      >
                        <SelectTrigger data-testid="select-action-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="change_status">Change Status</SelectItem>
                          <SelectItem value="change_priority">Change Priority</SelectItem>
                          <SelectItem value="move_to_group">Move to Group</SelectItem>
                          <SelectItem value="assign_person">Assign Person</SelectItem>
                          <SelectItem value="send_notification">Send Notification</SelectItem>
                          <SelectItem value="update_field">Update Field</SelectItem>
                          <SelectItem value="trigger_webhook">Trigger Webhook</SelectItem>
                          <SelectItem value="create_item">Create Item</SelectItem>
                          <SelectItem value="ai_fill_column">AI: Fill Column</SelectItem>
                          <SelectItem value="ai_summarize">AI: Summarize</SelectItem>
                          <SelectItem value="ai_categorize">AI: Categorize</SelectItem>
                          <SelectItem value="ai_translate">AI: Translate</SelectItem>
                          <SelectItem value="ai_sentiment">AI: Detect Sentiment</SelectItem>
                          <SelectItem value="ai_improve">AI: Improve Text</SelectItem>
                          <SelectItem value="ai_extract">AI: Extract Info</SelectItem>
                          <SelectItem value="ai_write">AI: Write</SelectItem>
                          <SelectItem value="send_slack">Send Slack Message</SelectItem>
                          <SelectItem value="send_sms">Send SMS</SelectItem>
                          <SelectItem value="send_email">Send Email</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {ACTION_TYPES[ruleForm.actionType]?.description}
                      </p>
                    </div>
                  </div>

                  {ruleForm.triggerType === "status_changed" && (
                    <div className="space-y-2">
                      <Label>When status changes to</Label>
                      <Select 
                        value={ruleForm.triggerValue} 
                        onValueChange={v => setRuleForm(p => ({ ...p, triggerValue: v }))}
                      >
                        <SelectTrigger data-testid="select-trigger-value">
                          <SelectValue placeholder="Any status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="pending_review">Pending Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {renderActionConfig()}
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => createRuleMutation.mutate(ruleForm)}
                    disabled={!ruleForm.name || createRuleMutation.isPending}
                    data-testid="button-submit-automation"
                  >
                    {createRuleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Automation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
              <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-xl">Automation Center</DialogTitle>
                  <DialogDescription>Choose from {ALL_TEMPLATES.length}+ automation recipes including AI-powered and integration templates</DialogDescription>
                </DialogHeader>
                
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={templateSearchQuery}
                    onChange={(e) => setTemplateSearchQuery(e.target.value)}
                    placeholder="Search automations..."
                    className="pl-10"
                    data-testid="input-search-templates"
                  />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
                  <TabsList className="w-full justify-start mb-4">
                    <TabsTrigger value="templates" className="gap-2" data-testid="tab-templates">
                      <LayoutGrid className="h-4 w-4" />
                      Templates
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="gap-2" data-testid="tab-ai">
                      <Sparkles className="h-4 w-4" />
                      AI-powered
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="gap-2" data-testid="tab-integrations">
                      <Globe className="h-4 w-4" />
                      Integrations
                    </TabsTrigger>
                  </TabsList>

                  <ScrollArea className="flex-1">
                    <TabsContent value="templates" className="mt-0 space-y-6">
                      {integrationTemplates.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-muted-foreground">Featured Integrations</h3>
                          <div className="space-y-2">
                            {integrationTemplates.slice(0, 3).map((template) => (
                              <FeaturedIntegrationCard 
                                key={template.id} 
                                template={template} 
                                onUse={handleUseTemplate}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {AUTOMATION_CATEGORIES.filter(c => !["ai_powered", "integrations"].includes(c.id)).map((category) => {
                        const categoryTemplates = otherTemplates.filter(t => t.category === category.id);
                        if (categoryTemplates.length === 0) return null;
                        
                        const CategoryIcon = category.icon;
                        
                        return (
                          <div key={category.id} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${category.color}`} />
                              <h3 className="text-sm font-semibold">{category.name}</h3>
                              <Badge variant="secondary" className="text-xs">{categoryTemplates.length}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              {categoryTemplates.slice(0, 6).map((template) => (
                                <TemplateCard 
                                  key={template.id} 
                                  template={template} 
                                  onUse={handleUseTemplate}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </TabsContent>

                    <TabsContent value="ai" className="mt-0 space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-400/10 border border-purple-500/20">
                        <AIIcon />
                        <div>
                          <h3 className="font-semibold">AI-powered Automations</h3>
                          <p className="text-sm text-muted-foreground">Let AI handle text analysis, summarization, translation, and more</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        {aiTemplates.map((template) => (
                          <TemplateCard 
                            key={template.id} 
                            template={template} 
                            onUse={handleUseTemplate}
                          />
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="integrations" className="mt-0 space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white">
                            <SiSlack className="h-5 w-5 text-[#4A154B]" />
                          </div>
                          <h3 className="font-semibold">Slack</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {integrationTemplates.filter(t => t.icon === "slack").map((template) => (
                            <TemplateCard 
                              key={template.id} 
                              template={template} 
                              onUse={handleUseTemplate}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-white">
                            <SiGmail className="h-5 w-5 text-[#EA4335]" />
                          </div>
                          <h3 className="font-semibold">Gmail</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {integrationTemplates.filter(t => t.icon === "gmail").map((template) => (
                            <TemplateCard 
                              key={template.id} 
                              template={template} 
                              onUse={handleUseTemplate}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-red-600">
                            <Smartphone className="h-5 w-5 text-white" />
                          </div>
                          <h3 className="font-semibold">SMS / Twilio</h3>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          {integrationTemplates.filter(t => t.icon === "sms").map((template) => (
                            <TemplateCard 
                              key={template.id} 
                              template={template} 
                              onUse={handleUseTemplate}
                            />
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </Tabs>

                <DialogFooter className="pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowTemplatesDialog(false)}>Cancel</Button>
                  <Button onClick={() => { setShowTemplatesDialog(false); setShowCreateDialog(true); }}>
                    Create Custom Automation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </>
          )}
        </div>
      </div>

      {showAIBuilder && (
        <div className="p-4 border-b bg-muted/30">
          <AIAutomationBuilder 
            onBuildAutomation={handleBuildFromAI}
            suggestedAutomations={suggestedAutomations}
            hasBoardSelected={!!selectedBoardId}
          />
        </div>
      )}

      <div className="border-b overflow-auto" data-testid="section-ai-workflows">
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1e293b 0%, #172554 50%, #312e81 100%)" }}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-40 h-40 rounded-full" style={{ background: "radial-gradient(circle, rgba(99,102,241,0.4), transparent)" }} />
            <div className="absolute bottom-10 right-20 w-60 h-60 rounded-full" style={{ background: "radial-gradient(circle, rgba(20,184,166,0.3), transparent)" }} />
          </div>
          <div className="relative px-6 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-md" style={{ backgroundColor: "rgba(99,102,241,0.2)" }}>
                  <Workflow className="h-5 w-5 text-indigo-300" />
                </div>
                <Badge variant="secondary" className="text-xs text-indigo-200" style={{ backgroundColor: "rgba(99,102,241,0.25)" }}>
                  AI Workflows
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1" data-testid="text-workflows-title">
                Orchestrate your work with AI workflows
              </h2>
              <p className="text-sm text-slate-300 mb-5 max-w-lg">
                Combine multiple automations into intelligent workflows that adapt to your legal practice. Describe what you need and let AI build it.
              </p>

              <div className="flex items-center gap-2 max-w-xl mb-6">
                <div className="relative flex-1 flex items-center bg-white/10 border border-white/20 rounded-md backdrop-blur-sm">
                  <Sparkles className="absolute left-3 h-4 w-4 text-indigo-300" />
                  <Input
                    value={workflowInput}
                    onChange={(e) => setWorkflowInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && workflowInput.trim()) { handleBuildFromAI(workflowInput); setWorkflowInput(""); } }}
                    placeholder="Describe your workflow in plain English..."
                    className="border-0 bg-transparent text-white placeholder:text-slate-400 pl-10 focus-visible:ring-0 shadow-none"
                    data-testid="input-workflow-prompt"
                  />
                </div>
                <Button
                  onClick={() => { if (workflowInput.trim()) { handleBuildFromAI(workflowInput); setWorkflowInput(""); } }}
                  disabled={!workflowInput.trim()}
                  className="gap-2 shrink-0"
                  data-testid="button-create-workflow"
                >
                  <Send className="h-4 w-4" />
                  Build
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="section-workflow-templates">
                {[
                  { icon: MessageSquare, title: "Meeting Summarizer", desc: "Record, transcribe, and summarize meeting notes automatically", color: "#6366f1" },
                  { icon: Smile, title: "Feedback Sentiment", desc: "Analyze client feedback, detect sentiment, and route responses", color: "#ec4899" },
                  { icon: BarChart3, title: "Case Intake Triage", desc: "Categorize new cases, assign teams, and set priorities", color: "#f59e0b" },
                  { icon: RefreshCw, title: "Weekly Case Digest", desc: "Compile weekly updates across all active matters", color: "#22c55e" },
                ].map((template, i) => (
                  <button
                    key={i}
                    onClick={() => handleBuildFromAI(template.title + ": " + template.desc)}
                    className="p-3 rounded-md text-left"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                    data-testid={`button-workflow-template-${i}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-md" style={{ backgroundColor: `${template.color}25` }}>
                        <template.icon className="h-4 w-4" style={{ color: template.color }} />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-white mb-0.5">{template.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-2">{template.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {!selectedBoardId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Zap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Select a Board</h2>
            <p className="text-muted-foreground">Choose a board to manage its automations</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : rules.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <AIIcon className="mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Automations Yet</h2>
            <p className="text-muted-foreground mb-6">Create your first automation to save time on repetitive tasks. Use AI-powered templates to analyze, categorize, and transform your data automatically.</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleOpenTemplates} data-testid="button-browse-templates">
                Browse Templates
              </Button>
              <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first">
                <Plus className="h-4 w-4 mr-2" />
                Create Automation
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 grid gap-4">
            {rules.map(rule => {
              const TriggerIcon = TRIGGER_TYPES[rule.triggerType as keyof typeof TRIGGER_TYPES]?.icon || Zap;
              const ActionIcon = ACTION_TYPES[rule.actionType as keyof typeof ACTION_TYPES]?.icon || Play;
              const isAI = rule.actionType.startsWith("ai_");
              
              return (
                <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""} data-testid={`automation-card-${rule.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {isAI ? (
                          <AIIcon />
                        ) : (
                          <div className={`p-2 rounded-lg ${rule.isActive ? "bg-primary/10" : "bg-muted"}`}>
                            <Zap className={`h-5 w-5 ${rule.isActive ? "text-primary" : "text-muted-foreground"}`} />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">{rule.name}</CardTitle>
                          {rule.description && (
                            <CardDescription className="text-xs mt-0.5">{rule.description}</CardDescription>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={rule.isActive}
                          onCheckedChange={() => toggleRule(rule)}
                          data-testid={`toggle-automation-${rule.id}`}
                        />
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          data-testid={`button-delete-${rule.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
                        <TriggerIcon className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">
                          {TRIGGER_TYPES[rule.triggerType as keyof typeof TRIGGER_TYPES]?.label || rule.triggerType}
                        </span>
                        {rule.triggerValue && (
                          <Badge variant="secondary" className="text-xs">{rule.triggerValue}</Badge>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="flex items-center gap-2 flex-1">
                        {isAI ? (
                          <Sparkles className="h-4 w-4 text-purple-500" />
                        ) : (
                          <ActionIcon className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-sm font-medium">
                          {ACTION_TYPES[rule.actionType as keyof typeof ACTION_TYPES]?.label || rule.actionType}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Play className="h-3 w-3" />
                          {rule.runCount} runs
                        </span>
                        {rule.lastRun && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last: {new Date(rule.lastRun).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? (isAI ? "AI Active" : "Active") : "Paused"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
