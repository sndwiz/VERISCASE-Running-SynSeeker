import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Calendar,
  Users,
  Flag,
  CheckSquare,
  Clock,
  Paperclip,
  Tag,
  BarChart3,
  Hash,
  Mail,
  Phone,
  Link,
  MapPin,
  MessageSquare,
  Activity,
  Star,
  Edit3,
  Check,
  ArrowRightLeft,
  Copy,
  MoveRight,
  Loader2,
  FileText,
  Plus,
  AtSign,
  Smile,
  Zap,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task, ColumnDef, CustomStatusLabel, Priority, Board, Group } from "@shared/schema";
import { statusConfig, priorityConfig, defaultStatusLabels } from "@shared/schema";

type DetailTab = "updates" | "files" | "activity";

interface TaskUpdate {
  id: string;
  text: string;
  author: string;
  authorInitial: string;
  authorColor: string;
  createdAt: string;
}

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  columns: ColumnDef[];
  statusLabels?: CustomStatusLabel[];
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onEditStatusLabels?: () => void;
  groups?: Group[];
  boardId?: string;
}

const COLUMN_ICONS: Record<string, any> = {
  status: CheckSquare,
  priority: Flag,
  date: Calendar,
  person: Users,
  progress: BarChart3,
  time: Clock,
  files: Paperclip,
  tags: Tag,
  email: Mail,
  phone: Phone,
  link: Link,
  location: MapPin,
  number: Hash,
  rating: Star,
};

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  columns,
  statusLabels = defaultStatusLabels,
  onUpdate,
  onEditStatusLabels,
  groups = [],
  boardId,
}: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>("updates");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  const [showMirrorSection, setShowMirrorSection] = useState(false);
  const [showMoveSection, setShowMoveSection] = useState(false);
  const [mirrorTargetBoardId, setMirrorTargetBoardId] = useState("");
  const [mirrorTargetGroupId, setMirrorTargetGroupId] = useState("");
  const [moveTargetBoardId, setMoveTargetBoardId] = useState("");
  const [moveTargetGroupId, setMoveTargetGroupId] = useState("");
  const [updateText, setUpdateText] = useState("");
  const [taskUpdates, setTaskUpdates] = useState<Record<string, TaskUpdate[]>>({});

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allBoards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
    enabled: open && (showMirrorSection || showMoveSection),
  });

  const { data: mirrorTargetGroups = [] } = useQuery<Group[]>({
    queryKey: ["/api/boards", mirrorTargetBoardId, "groups"],
    enabled: !!mirrorTargetBoardId && showMirrorSection,
  });

  const { data: moveTargetGroups = [] } = useQuery<Group[]>({
    queryKey: ["/api/boards", moveTargetBoardId, "groups"],
    enabled: !!moveTargetBoardId && showMoveSection,
  });

  const mirrorMutation = useMutation({
    mutationFn: (data: { targetBoardId: string; targetGroupId: string }) =>
      apiRequest("POST", `/api/tasks/${task?.id}/mirror`, data),
    onSuccess: () => {
      toast({ title: "Task mirrored successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", mirrorTargetBoardId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      setShowMirrorSection(false);
      setMirrorTargetBoardId("");
      setMirrorTargetGroupId("");
    },
    onError: () => {
      toast({ title: "Failed to mirror task", variant: "destructive" });
    },
  });

  const moveToBoardMutation = useMutation({
    mutationFn: (data: { targetBoardId: string; targetGroupId: string }) =>
      apiRequest("POST", `/api/tasks/${task?.id}/move-to-board`, data),
    onSuccess: () => {
      toast({ title: "Task moved to board successfully" });
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId, "tasks"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", moveTargetBoardId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      setShowMoveSection(false);
      setMoveTargetBoardId("");
      setMoveTargetGroupId("");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Failed to move task", variant: "destructive" });
    },
  });

  if (!task) return null;

  const currentUpdates = taskUpdates[task.id] || [];

  const handlePostUpdate = () => {
    if (!updateText.trim()) return;
    const newUpdate: TaskUpdate = {
      id: Math.random().toString(36).substring(2, 9),
      text: updateText.trim(),
      author: "You",
      authorInitial: "Y",
      authorColor: "#0891b2",
      createdAt: new Date().toISOString(),
    };
    setTaskUpdates(prev => ({
      ...prev,
      [task.id]: [newUpdate, ...(prev[task.id] || [])],
    }));
    setUpdateText("");
  };

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      onUpdate(task.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveDescription = () => {
    onUpdate(task.id, { description: editedDescription });
    setIsEditingDescription(false);
  };

  const getStatusDisplay = () => {
    const label = statusLabels.find((l) => l.id === task.status);
    if (label) {
      return { label: label.label, color: label.color };
    }
    const fallback = statusConfig[task.status];
    return { label: fallback?.label || task.status, color: "#6B7280" };
  };

  const getPriorityDisplay = () => {
    return priorityConfig[task.priority];
  };

  const statusDisplay = getStatusDisplay();
  const priorityDisplay = getPriorityDisplay();

  const handleMoveToGroup = (groupId: string) => {
    onUpdate(task.id, { groupId });
    toast({ title: "Task moved to group" });
  };

  const handleMirror = () => {
    if (!mirrorTargetBoardId || !mirrorTargetGroupId) return;
    mirrorMutation.mutate({
      targetBoardId: mirrorTargetBoardId,
      targetGroupId: mirrorTargetGroupId,
    });
  };

  const handleMoveToBoard = () => {
    if (!moveTargetBoardId || !moveTargetGroupId) return;
    moveToBoardMutation.mutate({
      targetBoardId: moveTargetBoardId,
      targetGroupId: moveTargetGroupId,
    });
  };

  const renderFieldValue = (column: ColumnDef) => {
    const value = task.customFields?.[column.id];
    switch (column.type) {
      case "email":
        return value ? <a href={`mailto:${value}`} className="text-primary underline">{value}</a> : <span className="text-muted-foreground">-</span>;
      case "phone":
        return value ? <a href={`tel:${value}`} className="text-primary underline">{value}</a> : <span className="text-muted-foreground">-</span>;
      case "link":
        return value?.url ? <a href={value.url} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate">{value.label || value.url}</a> : <span className="text-muted-foreground">-</span>;
      case "tags":
        return Array.isArray(value) && value.length > 0 ? (
          <div className="flex flex-wrap gap-1">{value.map((tag: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>)}</div>
        ) : <span className="text-muted-foreground">-</span>;
      case "number":
      case "numbers":
        return value !== undefined && value !== null ? <span className="font-mono">{value}</span> : <span className="text-muted-foreground">-</span>;
      case "rating":
        return (
          <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= (value || 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />)}</div>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${value ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
              {value && <Check className="h-3 w-3" />}
            </div>
            <span>{value ? "Yes" : "No"}</span>
          </div>
        );
      case "location":
        return value ? <div className="flex items-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground" /><span>{value}</span></div> : <span className="text-muted-foreground">-</span>;
      case "dropdown":
        return value ? <Badge variant="outline">{value}</Badge> : <span className="text-muted-foreground">-</span>;
      case "long-text":
        return value ? <p className="text-sm whitespace-pre-wrap">{value}</p> : <span className="text-muted-foreground">-</span>;
      default:
        return value !== undefined && value !== null && value !== "" ? <span>{String(value)}</span> : <span className="text-muted-foreground">-</span>;
    }
  };

  const renderBoardGroupPicker = (
    prefix: string,
    selectedBoardId: string,
    selectedGroupId: string,
    targetGroups: Group[],
    onBoardChange: (id: string) => void,
    onGroupChange: (id: string) => void,
  ) => (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Target Board</label>
        <Select value={selectedBoardId} onValueChange={(val) => { onBoardChange(val); onGroupChange(""); }}>
          <SelectTrigger data-testid={`select-${prefix}-board`}>
            <SelectValue placeholder="Select a board" />
          </SelectTrigger>
          <SelectContent>
            {allBoards.map((b) => (
              <SelectItem key={b.id} value={b.id} data-testid={`select-${prefix}-board-option-${b.id}`}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedBoardId && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Target Group</label>
          <Select value={selectedGroupId} onValueChange={onGroupChange}>
            <SelectTrigger data-testid={`select-${prefix}-group`}>
              <SelectValue placeholder="Select a group" />
            </SelectTrigger>
            <SelectContent>
              {targetGroups.map((g) => (
                <SelectItem key={g.id} value={g.id} data-testid={`select-${prefix}-group-option-${g.id}`}>{g.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  const tabs: { id: DetailTab; label: string; icon: any }[] = [
    { id: "updates", label: "Updates", icon: MessageSquare },
    { id: "files", label: "Files", icon: Paperclip },
    { id: "activity", label: "Activity Log", icon: Activity },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col" data-testid="task-detail-panel">
        <SheetHeader className="p-4 pb-2 space-y-0 border-b">
          <div className="flex items-start justify-between gap-2">
            {isEditingTitle ? (
              <div className="flex-1 flex gap-2">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="text-lg font-semibold"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") setIsEditingTitle(false);
                  }}
                  data-testid="input-task-title"
                />
                <Button size="sm" onClick={handleSaveTitle} data-testid="button-save-title">
                  Save
                </Button>
              </div>
            ) : (
              <SheetTitle
                className="text-lg cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                onClick={() => {
                  setEditedTitle(task.title);
                  setIsEditingTitle(true);
                }}
                data-testid="text-task-title"
              >
                {task.title}
                <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
              </SheetTitle>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <div
              className="px-2.5 py-1 rounded text-xs font-medium"
              style={{ backgroundColor: `${statusDisplay.color}20`, color: statusDisplay.color }}
              data-testid="task-status-badge"
            >
              {statusDisplay.label}
            </div>
            <div
              className={`px-2.5 py-1 rounded text-xs font-medium ${priorityDisplay.bgColor} ${priorityDisplay.color}`}
              data-testid="task-priority-badge"
            >
              {priorityDisplay.label}
            </div>
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="task-due-date">
                <Calendar className="h-3 w-3" />
                {format(parseISO(task.dueDate), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="flex items-center border-b px-1" data-testid="detail-panel-tabs">
          {tabs.map((tab) => (
            <div key={tab.id} className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-none gap-1.5 ${
                  activeTab === tab.id
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
                data-testid={`tab-detail-${tab.id}`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </Button>
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
              )}
            </div>
          ))}

          <div className="ml-auto px-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground gap-1"
              onClick={() => {
                toast({ title: "Update via email coming soon" });
              }}
              data-testid="button-update-via-email"
            >
              <Mail className="h-3 w-3" />
              Update via email
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === "updates" && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="p-4 border-b">
                <div className="border rounded-md">
                  <Textarea
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    placeholder="Write an update and mention others with @"
                    className="border-0 resize-none focus-visible:ring-0"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handlePostUpdate();
                      }
                    }}
                    data-testid="textarea-update"
                  />
                  <div className="flex items-center gap-1 p-2 border-t">
                    <Button variant="ghost" size="icon" data-testid="button-mention">
                      <AtSign className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" data-testid="button-attach-file">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" data-testid="button-add-emoji">
                      <Smile className="h-4 w-4" />
                    </Button>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      onClick={handlePostUpdate}
                      disabled={!updateText.trim()}
                      data-testid="button-post-update"
                    >
                      Update
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4">
                  {currentUpdates.length > 0 ? (
                    <div className="space-y-4">
                      {currentUpdates.map((update) => (
                        <div key={update.id} className="flex gap-3" data-testid={`update-${update.id}`}>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
                            style={{ backgroundColor: update.authorColor }}
                          >
                            {update.authorInitial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium" data-testid={`text-update-author-${update.id}`}>{update.author}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(parseISO(update.createdAt), "MMM d, h:mm a")}
                              </span>
                            </div>
                            <p className="text-sm mt-1" data-testid={`text-update-content-${update.id}`}>{update.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <MessageSquare className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="font-medium text-sm" data-testid="text-no-updates">No updates yet</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                        Share progress, mention a teammate, or upload a file to get things moving
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {activeTab === "files" && (
            <ScrollArea className="flex-1">
              <div className="p-4">
                {task.files && task.files.length > 0 ? (
                  <div className="space-y-2">
                    {task.files.map((file: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border/30" data-testid={`file-item-${idx}`}>
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name || `File ${idx + 1}`}</p>
                          <p className="text-xs text-muted-foreground">{file.size ? `${(file.size / 1024).toFixed(1)} KB` : "Unknown size"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Paperclip className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium text-sm" data-testid="text-no-files">No files attached</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Attach files to keep everything organized
                    </p>
                    <Button variant="outline" size="sm" className="mt-4" data-testid="button-upload-file">
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add file
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {activeTab === "activity" && (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Task Details</h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <CheckSquare className="h-3 w-3" />
                        Status
                      </label>
                      {onEditStatusLabels && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-muted-foreground"
                          onClick={onEditStatusLabels}
                          data-testid="button-edit-labels-modal"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit Labels
                        </Button>
                      )}
                      <div
                        className="px-2.5 py-1 rounded text-xs font-medium text-center"
                        style={{ backgroundColor: `${statusDisplay.color}20`, color: statusDisplay.color }}
                        data-testid="task-status"
                      >
                        {statusDisplay.label}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Flag className="h-3 w-3" />
                        Priority
                      </label>
                      <div
                        className={`px-2.5 py-1 rounded text-xs font-medium text-center ${priorityDisplay.bgColor} ${priorityDisplay.color}`}
                        data-testid="task-priority"
                      >
                        {priorityDisplay.label}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      Due Date
                    </label>
                    <div className="text-sm" data-testid="activity-due-date">
                      {task.dueDate ? format(parseISO(task.dueDate), "MMMM d, yyyy") : "-"}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      Assigned To
                    </label>
                    <div className="flex flex-wrap gap-2" data-testid="task-assignees">
                      {task.assignees.length > 0 ? (
                        task.assignees.map((person) => (
                          <div key={person.id} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-medium" style={{ backgroundColor: person.color }}>
                              {person.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs">{person.name}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">Unassigned</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <BarChart3 className="h-3 w-3" />
                      Progress
                    </label>
                    <div className="space-y-1">
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${task.progress}%` }} />
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid="task-progress">
                        {task.progress}% complete
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        Description
                      </label>
                      {!isEditingDescription && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditedDescription(task.description || "");
                            setIsEditingDescription(true);
                          }}
                          data-testid="button-edit-description"
                        >
                          <Edit3 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                    {isEditingDescription ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          className="min-h-[80px]"
                          placeholder="Add a description..."
                          data-testid="textarea-description"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveDescription} data-testid="button-save-description">Save</Button>
                          <Button variant="ghost" size="sm" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap" data-testid="task-description">
                        {task.description || <span className="text-muted-foreground">No description</span>}
                      </p>
                    )}
                  </div>

                  {groups.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <ArrowRightLeft className="h-3 w-3" />
                        Move to Group
                      </label>
                      <Select value={task.groupId} onValueChange={handleMoveToGroup}>
                        <SelectTrigger data-testid="select-move-to-group">
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map((g) => (
                            <SelectItem key={g.id} value={g.id} data-testid={`select-group-option-${g.id}`}>{g.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {columns.filter((c) => c.visible && !["status", "priority", "date", "person", "progress"].includes(c.type)).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Additional Fields</h4>
                      {columns
                        .filter((c) => c.visible && !["status", "priority", "date", "person", "progress"].includes(c.type))
                        .map((column) => {
                          const Icon = COLUMN_ICONS[column.type] || Hash;
                          return (
                            <div key={column.id} className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Icon className="h-3 w-3" />
                                {column.title}
                              </label>
                              <div className="text-sm" data-testid={`field-${column.id}`}>{renderFieldValue(column)}</div>
                            </div>
                          );
                        })}
                    </div>
                  </>
                )}

                {task.subtasks && task.subtasks.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
                      </h4>
                      <div className="space-y-1.5">
                        {task.subtasks.map((subtask) => (
                          <div key={subtask.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${subtask.completed ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                              {subtask.completed && <Check className="h-2.5 w-2.5" />}
                            </div>
                            <span className={`text-sm ${subtask.completed ? "text-muted-foreground line-through" : ""}`}>{subtask.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <TaskAutomationHistory taskId={task.id} />

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Task Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowMirrorSection(!showMirrorSection); setShowMoveSection(false); }}
                      data-testid="button-mirror-to-board"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1.5" />
                      Mirror to Board
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setShowMoveSection(!showMoveSection); setShowMirrorSection(false); }}
                      data-testid="button-move-to-board"
                    >
                      <MoveRight className="h-3.5 w-3.5 mr-1.5" />
                      Move to Board
                    </Button>
                  </div>

                  {showMirrorSection && (
                    <div className="space-y-3 p-3 rounded-md border bg-muted/30">
                      <p className="text-xs text-muted-foreground">Create a mirror copy of this task on another board.</p>
                      {renderBoardGroupPicker("mirror", mirrorTargetBoardId, mirrorTargetGroupId, mirrorTargetGroups, setMirrorTargetBoardId, setMirrorTargetGroupId)}
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleMirror} disabled={!mirrorTargetBoardId || !mirrorTargetGroupId || mirrorMutation.isPending} data-testid="button-confirm-mirror">
                          {mirrorMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                          Mirror Task
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowMirrorSection(false); setMirrorTargetBoardId(""); setMirrorTargetGroupId(""); }} data-testid="button-cancel-mirror">Cancel</Button>
                      </div>
                    </div>
                  )}

                  {showMoveSection && (
                    <div className="space-y-3 p-3 rounded-md border bg-muted/30">
                      <p className="text-xs text-muted-foreground">Move this task to a different board. It will be removed from the current board.</p>
                      {renderBoardGroupPicker("move", moveTargetBoardId, moveTargetGroupId, moveTargetGroups, setMoveTargetBoardId, setMoveTargetGroupId)}
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={handleMoveToBoard} disabled={!moveTargetBoardId || !moveTargetGroupId || moveToBoardMutation.isPending} data-testid="button-confirm-move">
                          {moveToBoardMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                          Move Task
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setShowMoveSection(false); setMoveTargetBoardId(""); setMoveTargetGroupId(""); }} data-testid="button-cancel-move">Cancel</Button>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Timeline</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm">Task created</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(task.createdAt), "MMM d, yyyy h:mm a")}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-sm">Last updated</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(task.updatedAt), "MMM d, yyyy h:mm a")}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                    <span>Task ID</span>
                    <span className="font-mono">#{task.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TaskAutomationHistory({ taskId }: { taskId: string }) {
  const [expanded, setExpanded] = useState(false);
  const { data: runs = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/tasks/${taskId}/automation-runs?limit=20`],
    enabled: expanded,
  });

  return (
    <div className="space-y-2">
      <button
        className="flex items-center gap-2 w-full text-left"
        onClick={() => setExpanded(!expanded)}
        data-testid="button-toggle-automation-history"
      >
        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex-1">
          Automation History
        </h4>
        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {expanded && (
        <div className="space-y-2 pl-5">
          {isLoading && (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Loading...</span>
            </div>
          )}
          {!isLoading && runs.length === 0 && (
            <p className="text-xs text-muted-foreground py-1">No automations have acted on this item.</p>
          )}
          {runs.map((run: any) => (
            <div key={run.id} className="flex items-start gap-2 py-1.5 border-l-2 border-muted pl-3" data-testid={`automation-run-${run.id}`}>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  {run.status === "completed" ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                  )}
                  <span className="text-xs font-medium">{run.ruleName || "Automation"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {run.executedAt ? formatTaskRunTime(run.executedAt) : ""}
                  </span>
                </div>
                {run.explanation && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{run.explanation}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTaskRunTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return diffDays < 7 ? `${diffDays}d ago` : date.toLocaleDateString();
}
