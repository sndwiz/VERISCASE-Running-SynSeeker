import { useState } from "react";
import { GripVertical, MoreHorizontal, Trash2, ChevronRight, ChevronDown, Plus, Check, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusCell } from "./cells/status-cell";
import { PriorityCell } from "./cells/priority-cell";
import { DateCell } from "./cells/date-cell";
import { PersonCell } from "./cells/person-cell";
import { ProgressCell } from "./cells/progress-cell";
import { TextCell } from "./cells/text-cell";
import { TimeCell } from "./cells/time-cell";
import { FileCell } from "./cells/file-cell";
import {
  EmailCell,
  PhoneCell,
  RatingCell,
  VoteCell,
  ApprovalCell,
  LinkCell,
  LocationCell,
  CheckboxCell,
  DropdownCell,
  TagsCell,
  NumberCell,
  LongTextCell,
  ColorPickerCell,
  TimeTrackingCell,
  ItemIdCell,
  CreationLogCell,
  LastUpdatedCell,
  AutoNumberCell,
  DependencyCell,
  CountryCell,
  WorldClockCell,
  HourCell,
  WeekCell,
  FormulaCell,
  ButtonCell,
  LabelCell,
  AICell,
  TimelineCell,
  ProgressTrackingCell,
} from "./cells/extended-cells";
import type { Task, ColumnDef, StatusType, Priority, Person, FileAttachment, CustomStatusLabel } from "@shared/schema";

interface TaskRowProps {
  task: Task;
  columns: ColumnDef[];
  statusLabels?: CustomStatusLabel[];
  groupColor: string;
  onClick: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  onEditStatusLabels?: () => void;
  isSelected?: boolean;
  onSelect?: (taskId: string, selected: boolean) => void;
}

export function TaskRow({
  task,
  columns,
  statusLabels,
  groupColor,
  onClick,
  onUpdate,
  onDelete,
  onEditStatusLabels,
  isSelected = false,
  onSelect,
}: TaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [subtasksExpanded, setSubtasksExpanded] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);

  const subtasks = task.subtasks || [];
  const hasSubtasks = subtasks.length > 0;
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleToggleSubtask = (subtaskId: string, completed: boolean) => {
    const updatedSubtasks = subtasks.map(s => 
      s.id === subtaskId ? { ...s, completed } : s
    );
    onUpdate({ subtasks: updatedSubtasks });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask = {
      id: Math.random().toString(36).substring(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    onUpdate({ subtasks: [...subtasks, newSubtask] });
    setNewSubtaskTitle("");
    setIsAddingSubtask(false);
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const updatedSubtasks = subtasks.filter(s => s.id !== subtaskId);
    onUpdate({ subtasks: updatedSubtasks });
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSubtasksExpanded(!subtasksExpanded);
  };

  const renderCell = (column: ColumnDef) => {
    const cellProps = {
      onClick: handleCellClick,
    };

    const getCustomFieldValue = () => task.customFields?.[column.id];
    const setCustomFieldValue = (value: any) =>
      onUpdate({ customFields: { ...task.customFields, [column.id]: value } });

    switch (column.type) {
      case "status":
        return (
          <StatusCell
            value={task.status}
            onChange={(value: string) => onUpdate({ status: value as StatusType })}
            customLabels={statusLabels}
            onEditLabels={onEditStatusLabels}
            {...cellProps}
          />
        );
      case "priority":
        return (
          <PriorityCell
            value={task.priority}
            onChange={(value: Priority) => onUpdate({ priority: value })}
            {...cellProps}
          />
        );
      case "date":
        return (
          <DateCell
            value={task.dueDate}
            onChange={(value: string | null) => onUpdate({ dueDate: value })}
            {...cellProps}
          />
        );
      case "person":
        return (
          <PersonCell
            value={task.assignees}
            onChange={(value: Person[]) => onUpdate({ assignees: value })}
            {...cellProps}
          />
        );
      case "progress":
        return (
          <ProgressCell
            value={task.progress}
            onChange={(value: number) => onUpdate({ progress: value })}
            {...cellProps}
          />
        );
      case "time":
        return (
          <TimeCell
            value={task.timeTracked}
            onChange={(value: number) => onUpdate({ timeTracked: value })}
            {...cellProps}
          />
        );
      case "files":
        return (
          <FileCell
            value={task.files || []}
            onChange={(value: FileAttachment[]) => onUpdate({ files: value })}
            taskId={task.id}
            {...cellProps}
          />
        );
      case "email":
        return <EmailCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "phone":
        return <PhoneCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "rating":
        return <RatingCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "vote":
        return <VoteCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "approval":
        return <ApprovalCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "link":
        return <LinkCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "location":
        return <LocationCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "checkbox":
        return <CheckboxCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "dropdown":
        return <DropdownCell value={getCustomFieldValue()} onChange={setCustomFieldValue} options={column.options || []} {...cellProps} />;
      case "tags":
        return <TagsCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "number":
      case "numbers":
        return <NumberCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "long-text":
        return <LongTextCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "color-picker":
        return <ColorPickerCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "time-tracking":
        return <TimeTrackingCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "item-id":
        return <ItemIdCell value={getCustomFieldValue()} onChange={setCustomFieldValue} taskId={task.id} {...cellProps} />;
      case "creation-log":
        return <CreationLogCell value={{ createdAt: task.createdAt, createdBy: "User" }} onChange={() => {}} {...cellProps} />;
      case "last-updated":
        return <LastUpdatedCell value={task.updatedAt || task.createdAt} onChange={() => {}} {...cellProps} />;
      case "auto-number":
        return <AutoNumberCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "dependency":
        return <DependencyCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "country":
        return <CountryCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "world-clock":
        return <WorldClockCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "hour":
        return <HourCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "week":
        return <WeekCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "formula":
        return <FormulaCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "button":
        return <ButtonCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "label":
        return <LabelCell value={getCustomFieldValue()} onChange={setCustomFieldValue} options={column.options || []} {...cellProps} />;
      case "timeline":
        return <TimelineCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "progress-tracking":
        return <ProgressTrackingCell value={getCustomFieldValue()} onChange={setCustomFieldValue} {...cellProps} />;
      case "ai-improve":
      case "ai-write":
      case "ai-extract":
      case "ai-summarize":
      case "ai-translate":
      case "ai-sentiment":
      case "ai-categorize":
        return <AICell value={getCustomFieldValue()} onChange={setCustomFieldValue} aiType={column.type} {...cellProps} />;
      case "text":
      default:
        return (
          <TextCell
            value={task.customFields?.[column.id] || ""}
            onChange={(value: string) =>
              onUpdate({
                customFields: { ...task.customFields, [column.id]: value },
              })
            }
            {...cellProps}
          />
        );
    }
  };

  return (
    <>
    <div
      className={`flex items-center gap-0 py-1 px-0 transition-colors cursor-pointer border-b border-border/30 ${
        isSelected
          ? "bg-primary/10"
          : isHovered
          ? "bg-muted/40"
          : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`task-row-${task.id}`}
    >
      <div className="w-10 flex items-center justify-center flex-shrink-0 gap-0.5">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect?.(task.id, !!checked)}
          onClick={(e) => e.stopPropagation()}
          className="h-3.5 w-3.5"
          data-testid={`checkbox-task-${task.id}`}
        />
      </div>

      <div
        className="flex-1 min-w-[200px] px-2 flex items-center gap-1"
        onClick={onClick}
        data-testid={`task-title-${task.id}`}
      >
        {(hasSubtasks || isAddingSubtask) && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={handleToggleExpand}
            data-testid={`button-expand-subtasks-${task.id}`}
          >
            {subtasksExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
        <span className="text-sm truncate">{task.title}</span>
        {hasSubtasks && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm shrink-0"
            style={{ backgroundColor: `${groupColor}20`, color: groupColor }}
            data-testid={`badge-subtask-count-${task.id}`}
          >
            {completedSubtasks}/{subtasks.length}
          </span>
        )}
      </div>

      {columns.map((col) => (
        <div
          key={col.id}
          className="px-1 border-l border-border/20"
          style={{ width: col.width, minWidth: col.width }}
        >
          {renderCell(col)}
        </div>
      ))}

      <div className="w-8 flex items-center justify-center flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={isHovered ? "visible" : "invisible"}
              onClick={(e) => e.stopPropagation()}
              data-testid={`button-task-menu-${task.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onClick} data-testid={`menu-open-details-${task.id}`}>
              Open Details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setSubtasksExpanded(true);
                setIsAddingSubtask(true);
              }}
              data-testid={`menu-add-subtask-${task.id}`}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Subitem
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-destructive"
              data-testid={`menu-delete-task-${task.id}`}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    {subtasksExpanded && (
      <div
        className="border-b border-border/30"
        style={{ borderLeft: `3px solid ${groupColor}40` }}
        data-testid={`subtasks-panel-${task.id}`}
      >
        <div className="bg-muted/20">
          <div className="flex items-center gap-0 text-[11px] font-medium text-muted-foreground py-1 pl-14 border-b border-border/20">
            <div className="flex-1 min-w-[180px] px-2">Subitem</div>
            <div className="w-[120px] px-1 border-l border-border/20">Owner</div>
            <div className="w-[120px] px-1 border-l border-border/20">Status</div>
          </div>

          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              className="flex items-center gap-0 py-1 pl-14 group border-b border-border/15"
              data-testid={`subtask-row-${subtask.id}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-[180px] px-2">
                <Checkbox
                  checked={subtask.completed}
                  onCheckedChange={(checked) => handleToggleSubtask(subtask.id, !!checked)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-3.5 w-3.5"
                  data-testid={`checkbox-subtask-${subtask.id}`}
                />
                <span
                  className={`text-sm truncate ${
                    subtask.completed ? "text-muted-foreground line-through" : ""
                  }`}
                  data-testid={`text-subtask-title-${subtask.id}`}
                >
                  {subtask.title}
                </span>
              </div>
              <div className="w-[120px] px-1 border-l border-border/20">
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  ?
                </div>
              </div>
              <div className="w-[120px] px-1 border-l border-border/20">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  subtask.completed 
                    ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {subtask.completed ? "Done" : "Pending"}
                </span>
              </div>
              <div className="w-8 flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="invisible group-hover:visible text-destructive h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSubtask(subtask.id);
                  }}
                  data-testid={`button-delete-subtask-${subtask.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {isAddingSubtask ? (
            <div className="flex items-center gap-2 py-1.5 pl-14 pr-2 border-b border-border/15">
              <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                placeholder="Enter subitem title..."
                className="flex-1 text-sm h-7"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSubtask();
                  if (e.key === "Escape") {
                    setIsAddingSubtask(false);
                    setNewSubtaskTitle("");
                  }
                }}
                data-testid="input-new-subtask"
              />
              <Button
                size="sm"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim()}
                data-testid="button-save-subtask"
              >
                Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingSubtask(false);
                  setNewSubtaskTitle("");
                }}
                data-testid="button-cancel-subtask"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 py-1.5 pl-14 px-2 text-sm text-muted-foreground cursor-pointer hover-elevate"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddingSubtask(true);
              }}
              data-testid={`button-add-subtask-${task.id}`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add subitem</span>
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
