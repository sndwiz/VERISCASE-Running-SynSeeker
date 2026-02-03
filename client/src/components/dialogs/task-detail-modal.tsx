import { useState } from "react";
import { format, parseISO } from "date-fns";
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
} from "lucide-react";
import type { Task, ColumnDef, CustomStatusLabel, Priority } from "@shared/schema";
import { statusConfig, priorityConfig, defaultStatusLabels } from "@shared/schema";

interface TaskDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  columns: ColumnDef[];
  statusLabels?: CustomStatusLabel[];
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onEditStatusLabels?: () => void;
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
}: TaskDetailModalProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");

  if (!task) return null;

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

  const renderFieldValue = (column: ColumnDef) => {
    const value = task.customFields?.[column.id];

    switch (column.type) {
      case "email":
        return value ? (
          <a href={`mailto:${value}`} className="text-primary hover:underline">
            {value}
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case "phone":
        return value ? (
          <a href={`tel:${value}`} className="text-primary hover:underline">
            {value}
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case "link":
        return value?.url ? (
          <a
            href={value.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline truncate"
          >
            {value.label || value.url}
          </a>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case "tags":
        return Array.isArray(value) && value.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {value.map((tag: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case "number":
      case "numbers":
        return value !== undefined && value !== null ? (
          <span className="font-mono">{value}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case "rating":
        return (
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-4 w-4 ${
                  star <= (value || 0)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                value
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              }`}
            >
              {value && <Check className="h-3 w-3" />}
            </div>
            <span>{value ? "Yes" : "No"}</span>
          </div>
        );
      case "location":
        return value ? (
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{value}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case "dropdown":
        return value ? (
          <Badge variant="outline">{value}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      case "long-text":
        return value ? (
          <p className="text-sm whitespace-pre-wrap">{value}</p>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      default:
        return value !== undefined && value !== null && value !== "" ? (
          <span>{String(value)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-4 pb-0 space-y-0">
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
                className="text-xl cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                onClick={() => {
                  setEditedTitle(task.title);
                  setIsEditingTitle(true);
                }}
                data-testid="text-task-title"
              >
                {task.title}
                <Edit3 className="h-4 w-4 text-muted-foreground" />
              </SheetTitle>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" />
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
                </div>
                <div
                  className="px-3 py-1.5 rounded-md text-sm font-medium text-center"
                  style={{
                    backgroundColor: `${statusDisplay.color}20`,
                    color: statusDisplay.color,
                  }}
                  data-testid="task-status"
                >
                  {statusDisplay.label}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5" />
                  Priority
                </label>
                <div
                  className={`px-3 py-1.5 rounded-md text-sm font-medium text-center ${priorityDisplay.bgColor} ${priorityDisplay.color}`}
                  data-testid="task-priority"
                >
                  {priorityDisplay.label}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                Due Date
              </label>
              <div className="text-sm" data-testid="task-due-date">
                {task.dueDate
                  ? format(parseISO(task.dueDate), "MMMM d, yyyy")
                  : "-"}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Assigned To
              </label>
              <div className="flex flex-wrap gap-2" data-testid="task-assignees">
                {task.assignees.length > 0 ? (
                  task.assignees.map((person) => (
                    <div
                      key={person.id}
                      className="flex items-center gap-2 px-2 py-1 rounded-full bg-muted"
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: person.color }}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{person.name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Unassigned</span>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Progress
              </label>
              <div className="space-y-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground" data-testid="task-progress">
                  {task.progress}% complete
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
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
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              {isEditingDescription ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="min-h-[100px]"
                    placeholder="Add a description..."
                    data-testid="textarea-description"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveDescription} data-testid="button-save-description">
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingDescription(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap" data-testid="task-description">
                  {task.description || (
                    <span className="text-muted-foreground">No description</span>
                  )}
                </p>
              )}
            </div>

            {columns.filter((c) => c.visible && !["status", "priority", "date", "person", "progress"].includes(c.type)).length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="text-sm font-medium flex items-center gap-1.5">
                    <Activity className="h-4 w-4" />
                    Additional Fields
                  </h4>
                  {columns
                    .filter((c) => c.visible && !["status", "priority", "date", "person", "progress"].includes(c.type))
                    .map((column) => {
                      const Icon = COLUMN_ICONS[column.type] || Hash;
                      return (
                        <div key={column.id} className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5" />
                            {column.title}
                            {column.description && (
                              <span className="text-xs text-muted-foreground/70">
                                - {column.description}
                              </span>
                            )}
                          </label>
                          <div className="text-sm" data-testid={`field-${column.id}`}>
                            {renderFieldValue(column)}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </>
            )}

            {task.subtasks && task.subtasks.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">
                    Subtasks ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
                  </h4>
                  <div className="space-y-2">
                    {task.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        className="flex items-center gap-2 p-2 rounded-md bg-muted/50"
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            subtask.completed
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/30"
                          }`}
                        >
                          {subtask.completed && <Check className="h-3 w-3" />}
                        </div>
                        <span
                          className={`text-sm ${
                            subtask.completed
                              ? "text-muted-foreground line-through"
                              : ""
                          }`}
                        >
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Created</span>
                <span>{format(parseISO(task.createdAt), "MMM d, yyyy h:mm a")}</span>
              </div>
              <div className="flex justify-between">
                <span>Updated</span>
                <span>{format(parseISO(task.updatedAt), "MMM d, yyyy h:mm a")}</span>
              </div>
              <div className="flex justify-between">
                <span>Task ID</span>
                <span className="font-mono">#{task.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
