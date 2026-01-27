import { useState, useEffect } from "react";
import { Zap, Plus, X, Loader2, ChevronDown, ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  actionType: string;
  isActive: boolean;
}

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  triggerType: string;
  triggerLabel: string;
  actionType: string;
  actionLabel: string;
}

const AUTOMATION_CATEGORIES = [
  { id: "status_progress", name: "Status & Progress", color: "bg-purple-500" },
  { id: "date_time", name: "Date & Time", color: "bg-yellow-500" },
  { id: "assignees", name: "Assignees & Ownership", color: "bg-blue-500" },
  { id: "notifications", name: "Notifications & Alerts", color: "bg-red-500" },
  { id: "column_updates", name: "Column Updates", color: "bg-gray-500" },
  { id: "cross_board", name: "Cross-Board", color: "bg-orange-500" },
  { id: "approvals_reviews", name: "Approvals & Reviews", color: "bg-green-500" },
  { id: "recurring_work", name: "Recurring Work", color: "bg-teal-500" },
  { id: "subitems", name: "Subitems", color: "bg-blue-400" },
  { id: "forms_intake", name: "Forms & Intake", color: "bg-blue-500" },
  { id: "email", name: "Email", color: "bg-orange-400" },
  { id: "files_assets", name: "Files & Assets", color: "bg-green-400" },
];

const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  // Status & Progress
  { id: "move_item_done", name: "Move item when status changes", description: "When status changes to 'Done', move item to the Completed group", category: "status_progress", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "move_to_group", actionLabel: "Move to group" },
  { id: "notify_blocked", name: "Notify when item is blocked", description: "When status changes to 'Stuck', notify the owner", category: "status_progress", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "send_notification", actionLabel: "Send notification" },
  { id: "clear_assignee_done", name: "Clear assignee when done", description: "When status changes to 'Done', clear the assignee for next cycle", category: "status_progress", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "update_field", actionLabel: "Update field" },
  { id: "set_progress_status", name: "Set progress when status changes", description: "When status changes to 'Working on it', set progress to 50%", category: "status_progress", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "update_field", actionLabel: "Update field" },
  { id: "mark_complete_auto", name: "Mark complete when progress is 100%", description: "Automatically set status to 'Done' when progress reaches 100%", category: "status_progress", triggerType: "progress_changed", triggerLabel: "When progress changes", actionType: "change_status", actionLabel: "Change status" },
  { id: "auto_start_working", name: "Set working when assigned", description: "When someone is assigned, set status to 'Working on it'", category: "status_progress", triggerType: "person_assigned", triggerLabel: "When person is assigned", actionType: "change_status", actionLabel: "Change status" },
  
  // Recurring Work
  { id: "create_followup", name: "Create follow-up when done", description: "When item is marked done, create a follow-up task", category: "recurring_work", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "move_to_group", actionLabel: "Duplicate item" },
  { id: "create_from_template", name: "Create item from template", description: "When triggered, duplicate a template item with preset values", category: "recurring_work", triggerType: "item_created", triggerLabel: "When item is created", actionType: "move_to_group", actionLabel: "Duplicate item" },
  { id: "create_item_board", name: "Create item in board when status changes", description: "When status changes to something, create an item in board", category: "recurring_work", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "move_to_group", actionLabel: "Duplicate item" },
  { id: "assign_reviewer_done", name: "Assign reviewer when done", description: "When item is marked done, assign a reviewer for final check", category: "recurring_work", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "assign_person", actionLabel: "Assign person" },
  { id: "notify_on_create", name: "Notify team on new item", description: "When a new item is created, send notification to the team", category: "recurring_work", triggerType: "item_created", triggerLabel: "When item is created", actionType: "send_notification", actionLabel: "Send notification" },
  { id: "auto_priority_high", name: "Set priority when due soon", description: "When due date is within 2 days, set priority to high", category: "recurring_work", triggerType: "due_date_approaching", triggerLabel: "When due date is approaching", actionType: "change_priority", actionLabel: "Change priority" },
  
  // Subitems
  { id: "auto_create_subitems", name: "Auto-create standard subitems", description: "When item is created, automatically add standard subtasks", category: "subitems", triggerType: "item_created", triggerLabel: "When item is created", actionType: "update_field", actionLabel: "Create subitems" },
  { id: "sync_parent_status", name: "Sync parent status from subitems", description: "When all subitems are done, mark parent as done", category: "subitems", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "change_status", actionLabel: "Change status" },
  { id: "copy_assignee_subitems", name: "Copy assignee to subitems", description: "When parent is assigned, assign the same person to all subitems", category: "subitems", triggerType: "person_assigned", triggerLabel: "When person is assigned", actionType: "assign_person", actionLabel: "Assign person" },
  
  // Cross-Board
  { id: "move_to_group", name: "Move to another group", description: "When status changes, move item to a different group", category: "cross_board", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "move_to_group", actionLabel: "Move to group" },
  { id: "mirror_columns", name: "Mirror columns between boards", description: "Sync key columns across related boards", category: "cross_board", triggerType: "status_changed", triggerLabel: "When value changes", actionType: "update_field", actionLabel: "Update field" },
  
  // Approvals & Reviews
  { id: "notify_reviewer", name: "Notify reviewer on submit", description: "When item is submitted for review, notify the assigned reviewer", category: "approvals_reviews", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "send_notification", actionLabel: "Send notification" },
  { id: "approve_next_stage", name: "Move to next stage on approval", description: "When approved, move item to the next workflow stage", category: "approvals_reviews", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "move_to_group", actionLabel: "Move to group" },
  { id: "reject_reassign", name: "Reassign on rejection", description: "When rejected, assign back to original owner for revisions", category: "approvals_reviews", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "assign_person", actionLabel: "Assign person" },
  { id: "escalate_approval", name: "Escalate if not approved in time", description: "If pending approval for more than 2 days, notify manager", category: "approvals_reviews", triggerType: "due_date_approaching", triggerLabel: "When time passes", actionType: "send_notification", actionLabel: "Send notification" },
  
  // Forms & Intake
  { id: "form_create_item", name: "Create item from form", description: "When form is submitted, create a new item with form data", category: "forms_intake", triggerType: "item_created", triggerLabel: "When form submitted", actionType: "change_status", actionLabel: "Create item" },
  { id: "auto_triage", name: "Auto-triage by category", description: "Route items to different groups based on form answers", category: "forms_intake", triggerType: "item_created", triggerLabel: "When item is created", actionType: "move_to_group", actionLabel: "Move to group" },
  
  // Email
  { id: "email_on_status", name: "Send email on status change", description: "When status changes to 'Done', send email to client", category: "email", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "send_notification", actionLabel: "Send email" },
  { id: "email_followup", name: "Schedule follow-up email", description: "Send follow-up email X days after completion", category: "email", triggerType: "due_date_approaching", triggerLabel: "When date arrives", actionType: "send_notification", actionLabel: "Send email" },
  { id: "email_reminder", name: "Send reminder before due date", description: "Email assignee 2 days before due date", category: "email", triggerType: "due_date_approaching", triggerLabel: "When due date approaches", actionType: "send_notification", actionLabel: "Send email" },
  { id: "email_weekly_summary", name: "Weekly email summary", description: "Send weekly summary of open items to team", category: "email", triggerType: "due_date_approaching", triggerLabel: "On schedule", actionType: "send_notification", actionLabel: "Send email" },
  
  // Files & Assets
  { id: "notify_file_added", name: "Notify when file added", description: "When a file is uploaded, notify the team", category: "files_assets", triggerType: "file_uploaded", triggerLabel: "When file is uploaded", actionType: "send_notification", actionLabel: "Send notification" },
  { id: "request_file_status", name: "Request file on status change", description: "When status changes to 'Needs Documents', request file upload", category: "files_assets", triggerType: "status_changed", triggerLabel: "When status changes", actionType: "send_notification", actionLabel: "Send notification" },
];

interface AutomationsPanelProps {
  boardId: string;
  open: boolean;
  onClose: () => void;
}

export function AutomationsPanel({ boardId, open, onClose }: AutomationsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [templateSearchQuery, setTemplateSearchQuery] = useState("");

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !showTemplatesDialog) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, showTemplatesDialog]);

  const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/boards", boardId, "automations"],
    enabled: open && !!boardId,
  });

  const toggleRuleMutation = useMutation({
    mutationFn: (rule: AutomationRule) =>
      apiRequest("PATCH", `/api/automations/${rule.id}`, { isActive: !rule.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "automations"] });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: Partial<AutomationRule>) =>
      apiRequest("POST", `/api/boards/${boardId}/automations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "automations"] });
      toast({ title: "Automation created successfully" });
      setShowTemplatesDialog(false);
    },
    onError: () => {
      toast({ title: "Failed to create automation", variant: "destructive" });
    },
  });

  const filteredTemplates = AUTOMATION_TEMPLATES.filter((template) => {
    const matchesSearch = templateSearchQuery
      ? template.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(templateSearchQuery.toLowerCase())
      : true;
    const matchesCategory = selectedCategory ? template.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (template: AutomationTemplate) => {
    createRuleMutation.mutate({
      name: template.name,
      description: template.description,
      triggerType: template.triggerType,
      actionType: template.actionType,
      isActive: true,
    });
  };

  const handleOpenTemplates = () => {
    setSelectedCategory(null);
    setTemplateSearchQuery("");
    setShowTemplatesDialog(true);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 w-96 bg-card border-l shadow-xl z-50 flex flex-col" data-testid="panel-automations">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="font-semibold" data-testid="text-panel-title">Automations</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleOpenTemplates} data-testid="button-add-automation">
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-automations">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground px-4 pt-3">Automate repetitive tasks</p>

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-medium mb-2">Create your first automation to save time</h3>
              <p className="text-sm text-muted-foreground mb-4">
                You can also explore pre-built automation templates.
              </p>
              <Button variant="outline" onClick={handleOpenTemplates} data-testid="button-explore-templates">
                Explore templates
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <Card key={rule.id} className={!rule.isActive ? "opacity-60" : ""} data-testid={`automation-card-${rule.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{rule.name}</h4>
                          {rule.isActive && (
                            <Badge className="bg-primary/20 text-primary text-xs">Active</Badge>
                          )}
                        </div>
                        {rule.description && (
                          <p className="text-xs text-muted-foreground">{rule.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => toggleRuleMutation.mutate(rule)}
                        data-testid={`toggle-automation-${rule.id}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-automations">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">Add Automation</DialogTitle>
            <DialogDescription data-testid="text-dialog-description">Choose from 136 automation recipes organized by category</DialogDescription>
          </DialogHeader>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={templateSearchQuery}
              onChange={(e) => setTemplateSearchQuery(e.target.value)}
              placeholder="Search automations..."
              className="pl-9 focus-visible:ring-primary"
              data-testid="input-search-templates"
            />
          </div>

          <ScrollArea className="flex-1 min-h-0 pr-2">
            <div className="space-y-2">
              {AUTOMATION_CATEGORIES.map((category) => {
                const allCategoryTemplates = AUTOMATION_TEMPLATES.filter(t => t.category === category.id);
                const categoryTemplates = filteredTemplates.filter(t => t.category === category.id);
                const isExpanded = selectedCategory === category.id;
                
                if (allCategoryTemplates.length === 0) return null;
                
                return (
                  <div key={category.id}>
                    <button
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover-elevate ${isExpanded ? 'bg-primary/10 border border-primary/30' : ''}`}
                      onClick={() => setSelectedCategory(isExpanded ? null : category.id)}
                      data-testid={`category-${category.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full ${category.color}`} />
                        <span className="font-medium text-sm">{category.name}</span>
                        <Badge variant="secondary" className="text-xs">{allCategoryTemplates.length}</Badge>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isExpanded && categoryTemplates.length > 0 && (
                      <div className="mt-2 space-y-2 pl-2">
                        {categoryTemplates.map((template) => (
                          <Card 
                            key={template.id} 
                            className="cursor-pointer hover-elevate border-muted"
                            onClick={() => handleUseTemplate(template)}
                            data-testid={`template-${template.id}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                  <Zap className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-sm">{template.name}</h4>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="secondary" className="text-xs">{template.triggerLabel}</Badge>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <Badge variant="secondary" className="text-xs">{template.actionLabel}</Badge>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setShowTemplatesDialog(false)}>Cancel</Button>
            <Button disabled={createRuleMutation.isPending}>
              {createRuleMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Automation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
