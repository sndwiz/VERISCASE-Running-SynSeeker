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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Zap, 
  Plus,
  Trash2,
  Play,
  Pause,
  Settings,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Bot,
  Bell,
  Move,
  Edit,
  UserPlus,
  UserMinus,
  Webhook,
  FileText,
  Calendar,
  Users,
  Target,
  MoreHorizontal
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

const TRIGGER_TYPES = {
  item_created: { label: "Item Created", icon: Plus, description: "When a new task is created" },
  status_changed: { label: "Status Changed", icon: Target, description: "When task status changes" },
  priority_changed: { label: "Priority Changed", icon: AlertCircle, description: "When task priority changes" },
  due_date_approaching: { label: "Due Date Approaching", icon: Calendar, description: "Before due date arrives" },
  due_date_passed: { label: "Due Date Passed", icon: Clock, description: "When due date has passed" },
  assigned: { label: "Person Assigned", icon: UserPlus, description: "When someone is assigned" },
  unassigned: { label: "Person Unassigned", icon: UserMinus, description: "When someone is unassigned" },
  moved_to_group: { label: "Moved to Group", icon: Move, description: "When task moves to different group" },
  file_uploaded: { label: "File Uploaded", icon: FileText, description: "When a file is attached" },
};

const ACTION_TYPES = {
  change_status: { label: "Change Status", icon: Target, description: "Update the task status" },
  change_priority: { label: "Change Priority", icon: AlertCircle, description: "Update the task priority" },
  move_to_group: { label: "Move to Group", icon: Move, description: "Move task to another group" },
  assign_person: { label: "Assign Person", icon: UserPlus, description: "Assign someone to the task" },
  send_notification: { label: "Send Notification", icon: Bell, description: "Send alert notification" },
  update_field: { label: "Update Field", icon: Edit, description: "Update a specific field" },
  trigger_webhook: { label: "Trigger Webhook", icon: Webhook, description: "Call an external URL" },
};

export default function AutomationsPage() {
  const { toast } = useToast();
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  
  const [ruleForm, setRuleForm] = useState({
    name: "",
    description: "",
    triggerType: "item_created" as keyof typeof TRIGGER_TYPES,
    triggerValue: "",
    actionType: "change_status" as keyof typeof ACTION_TYPES,
    actionConfig: {} as Record<string, any>,
  });

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
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col" data-testid="page-automations">
      <div className="flex items-center justify-between p-4 border-b gap-4">
        <div>
          <h1 className="text-2xl font-bold">Automations</h1>
          <p className="text-muted-foreground">Event-driven workflow automation</p>
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

          {selectedBoardId && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-automation">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Automation
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
                          {Object.entries(ACTION_TYPES).map(([key, { label }]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
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
          )}
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
          <div className="text-center">
            <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Automations Yet</h2>
            <p className="text-muted-foreground mb-4">Create your first automation to save time on repetitive tasks</p>
            <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create First Automation
            </Button>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-4 grid gap-4">
            {rules.map(rule => {
              const TriggerIcon = TRIGGER_TYPES[rule.triggerType as keyof typeof TRIGGER_TYPES]?.icon || Zap;
              const ActionIcon = ACTION_TYPES[rule.actionType as keyof typeof ACTION_TYPES]?.icon || Play;
              
              return (
                <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""} data-testid={`automation-card-${rule.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${rule.isActive ? "bg-primary/10" : "bg-muted"}`}>
                          <Zap className={`h-5 w-5 ${rule.isActive ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
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
                        <ActionIcon className="h-4 w-4 text-green-500" />
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
                        {rule.isActive ? "Active" : "Paused"}
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
