import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { LayoutTemplate, Loader2, Trash2, Pencil, Plus, ChevronRight, ChevronDown, CheckCircle2, ListChecks, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TemplateTask {
  title: string;
  status: string;
  priority: string;
}

interface TemplateGroup {
  title: string;
  color: string;
  tasks: TemplateTask[];
}

interface MatterTemplate {
  id: string;
  name: string;
  practiceArea: string;
  description: string | null;
  matterType: string | null;
  defaultGroups: TemplateGroup[];
  defaultColumns: any[];
  defaultCustomFields: any[];
  isBuiltIn: boolean;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

const PRACTICE_AREAS = [
  { value: "Personal Injury", label: "Personal Injury" },
  { value: "Family Law", label: "Family Law" },
  { value: "Criminal Law", label: "Criminal Law" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Corporate Law", label: "Corporate Law" },
  { value: "Employment Law", label: "Employment Law" },
  { value: "Immigration", label: "Immigration" },
  { value: "Bankruptcy", label: "Bankruptcy" },
  { value: "Estate Planning", label: "Estate Planning" },
  { value: "Intellectual Property", label: "Intellectual Property" },
];

const AREA_COLORS: Record<string, string> = {
  "Personal Injury": "#ef4444",
  "Family Law": "#f59e0b",
  "Criminal Law": "#8b5cf6",
  "Real Estate": "#10b981",
  "Corporate Law": "#3b82f6",
  "Employment Law": "#ec4899",
  "Immigration": "#06b6d4",
  "Bankruptcy": "#f97316",
  "Estate Planning": "#84cc16",
  "Intellectual Property": "#6366f1",
};

export default function MatterTemplatesSettings() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MatterTemplate | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingTemplate, setEditingTemplate] = useState<MatterTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    practiceArea: "Personal Injury",
    description: "",
    matterType: "",
  });

  const { data: templates, isLoading } = useQuery<MatterTemplate[]>({
    queryKey: ["/api/matter-templates"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/matter-templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matter-templates"] });
      toast({ title: "Template created" });
      closeCreateDialog();
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/matter-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matter-templates"] });
      toast({ title: "Template updated" });
      closeCreateDialog();
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/matter-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matter-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const closeCreateDialog = () => {
    setShowCreateDialog(false);
    setEditingTemplate(null);
    setFormData({ name: "", practiceArea: "Personal Injury", description: "", matterType: "" });
  };

  const openEditDialog = (template: MatterTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      practiceArea: template.practiceArea,
      description: template.description || "",
      matterType: template.matterType || "",
    });
    setShowCreateDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const openDetailDialog = (template: MatterTemplate) => {
    setSelectedTemplate(template);
    setExpandedGroups(new Set());
    setShowDetailDialog(true);
  };

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupTitle)) next.delete(groupTitle);
      else next.add(groupTitle);
      return next;
    });
  };

  const getGroupCount = (template: MatterTemplate) => {
    const groups = template.defaultGroups || [];
    return groups.length;
  };

  const getTaskCount = (template: MatterTemplate) => {
    const groups = template.defaultGroups || [];
    return groups.reduce((sum: number, g: TemplateGroup) => sum + (g.tasks?.length || 0), 0);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5" />
                Matter Templates
              </CardTitle>
              <CardDescription>
                Pre-configured workflows for different practice areas. Apply templates to set up matters with groups, tasks, and custom fields.
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              data-testid="button-create-template"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!templates || templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <LayoutTemplate className="h-10 w-10 mb-3" />
              <p>No templates available</p>
              <p className="text-sm mt-1">Create a template or wait for built-in templates to load</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className="hover-elevate cursor-pointer overflow-visible"
                  data-testid={`card-template-${template.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight">
                          {template.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            style={{
                              borderLeft: `3px solid ${AREA_COLORS[template.practiceArea] || "#6366f1"}`,
                              borderRadius: "4px",
                            }}
                          >
                            {template.practiceArea}
                          </Badge>
                          {template.isBuiltIn && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Lock className="h-3 w-3" />
                              Built-in
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {template.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1" data-testid={`text-groups-count-${template.id}`}>
                        <ListChecks className="h-3.5 w-3.5" />
                        {getGroupCount(template)} groups
                      </span>
                      <span className="flex items-center gap-1" data-testid={`text-tasks-count-${template.id}`}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {getTaskCount(template)} tasks
                      </span>
                    </div>
                    <Separator className="mb-3" />
                    <div className="flex items-center gap-1 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDetailDialog(template)}
                        data-testid={`button-view-template-${template.id}`}
                      >
                        View Details
                      </Button>
                      {!template.isBuiltIn && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); openEditDialog(template); }}
                            data-testid={`button-edit-template-${template.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(template.id); }}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-template-${template.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) closeCreateDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Edit Template" : "Create Matter Template"}</DialogTitle>
            <DialogDescription>
              {editingTemplate ? "Update the template details" : "Create a new template for a practice area workflow"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Personal Injury - Standard Litigation"
                data-testid="input-template-name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Practice Area</Label>
                <Select value={formData.practiceArea} onValueChange={(v) => setFormData({ ...formData, practiceArea: v })}>
                  <SelectTrigger data-testid="select-template-practice-area">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRACTICE_AREAS.map((pa) => (
                      <SelectItem key={pa.value} value={pa.value}>
                        {pa.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Matter Type (optional)</Label>
                <Input
                  value={formData.matterType}
                  onChange={(e) => setFormData({ ...formData, matterType: e.target.value })}
                  placeholder="e.g., Litigation, Transaction"
                  data-testid="input-template-matter-type"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this template workflow"
                data-testid="input-template-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateDialog} data-testid="button-cancel-template">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-template"
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingTemplate ? "Update Template" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {selectedTemplate.name}
                  {selectedTemplate.isBuiltIn && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Lock className="h-3 w-3" />
                      Built-in
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  <span className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="secondary"
                      style={{
                        borderLeft: `3px solid ${AREA_COLORS[selectedTemplate.practiceArea] || "#6366f1"}`,
                        borderRadius: "4px",
                      }}
                    >
                      {selectedTemplate.practiceArea}
                    </Badge>
                    {selectedTemplate.matterType && (
                      <Badge variant="outline">{selectedTemplate.matterType}</Badge>
                    )}
                  </span>
                </DialogDescription>
              </DialogHeader>
              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground">{selectedTemplate.description}</p>
              )}
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  Groups & Tasks ({getGroupCount(selectedTemplate)} groups, {getTaskCount(selectedTemplate)} tasks)
                </h4>
                <div className="space-y-1">
                  {(selectedTemplate.defaultGroups || []).map((group: TemplateGroup, gi: number) => (
                    <div key={gi}>
                      <button
                        className="flex items-center gap-2 w-full text-left p-2 rounded-md hover-elevate"
                        onClick={() => toggleGroup(group.title)}
                        data-testid={`button-toggle-group-${gi}`}
                      >
                        {expandedGroups.has(group.title) ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: group.color }}
                        />
                        <span className="text-sm font-medium">{group.title}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {group.tasks?.length || 0} tasks
                        </span>
                      </button>
                      {expandedGroups.has(group.title) && (
                        <div className="ml-8 space-y-1 mb-2">
                          {(group.tasks || []).map((task: TemplateTask, ti: number) => (
                            <div
                              key={ti}
                              className="flex items-center gap-2 py-1 px-2 text-sm"
                              data-testid={`text-task-${gi}-${ti}`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="flex-1">{task.title}</span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {task.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
