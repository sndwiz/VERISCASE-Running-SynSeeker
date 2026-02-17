import { useState, useMemo, useRef, memo, useCallback } from "react";
import { ChevronDown, ChevronRight, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskRow } from "./task-row";
import type { Group, Task, ColumnDef, ColumnType, CustomStatusLabel, StatusType } from "@shared/schema";
import { statusConfig } from "@shared/schema";

function GroupSummaryRow({ 
  tasks, 
  columns,
  groupColor 
}: { 
  tasks: Task[]; 
  columns: ColumnDef[];
  groupColor: string;
}) {
  const summaryData = useMemo(() => {
    const data: Record<string, any> = {};
    
    columns.forEach(col => {
      switch (col.type) {
        case "status": {
          const statusCounts: Record<string, number> = {};
          tasks.forEach(task => {
            const statusValue = col.id === "status" 
              ? task.status 
              : (task.customFields?.[col.id] as string) || "not-started";
            statusCounts[statusValue] = (statusCounts[statusValue] || 0) + 1;
          });
          data[col.id] = { type: "status-bar", counts: statusCounts, total: tasks.length };
          break;
        }
        case "progress": {
          const values = tasks.map(t => {
            if (col.id === "progress") return t.progress || 0;
            const val = t.customFields?.[col.id];
            return typeof val === "number" ? val : 0;
          });
          const total = values.reduce((sum, v) => sum + v, 0);
          const avg = tasks.length > 0 ? Math.round(total / tasks.length) : 0;
          data[col.id] = { type: "average", value: avg, suffix: "%" };
          break;
        }
        case "number":
        case "numbers": {
          const sum = tasks.reduce((total, t) => {
            const val = t.customFields?.[col.id];
            return total + (typeof val === "number" ? val : 0);
          }, 0);
          data[col.id] = { type: "sum", value: sum };
          break;
        }
        case "rating": {
          let count = 0;
          const sum = tasks.reduce((total, t) => {
            const val = t.customFields?.[col.id];
            if (typeof val === "number" && val > 0) {
              count++;
              return total + val;
            }
            return total;
          }, 0);
          data[col.id] = { type: "average", value: count > 0 ? (sum / count).toFixed(1) : "-", suffix: " / 5" };
          break;
        }
        case "vote": {
          const sum = tasks.reduce((total, t) => {
            const val = t.customFields?.[col.id];
            return total + (typeof val === "number" ? val : 0);
          }, 0);
          data[col.id] = { type: "sum", value: sum, prefix: "Total: " };
          break;
        }
        default:
          data[col.id] = null;
      }
    });
    
    return data;
  }, [tasks, columns]);

  const renderSummaryCell = (column: ColumnDef) => {
    const data = summaryData[column.id];
    if (!data) return null;

    switch (data.type) {
      case "status-bar": {
        const statusColors: Record<StatusType, string> = {
          "not-started": "bg-gray-300 dark:bg-gray-600",
          "working-on-it": "bg-amber-400",
          "stuck": "bg-red-500",
          "done": "bg-green-500",
          "pending-review": "bg-purple-500",
        };
        return (
          <div className="flex h-5 rounded overflow-hidden w-full" data-testid="status-summary-bar">
            {Object.entries(data.counts as Record<string, number>).map(([status, count]) => (
              <div
                key={status}
                className={`${statusColors[status as StatusType] || "bg-gray-400"}`}
                style={{ width: `${(count / data.total) * 100}%` }}
                title={`${statusConfig[status as StatusType]?.label || status}: ${count}`}
              />
            ))}
          </div>
        );
      }
      case "sum":
        return (
          <span className="text-xs font-medium text-muted-foreground">
            {data.prefix || ""}{data.value}{data.suffix || ""}
          </span>
        );
      case "average":
        return (
          <span className="text-xs font-medium text-muted-foreground">
            {data.value}{data.suffix || ""}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className="flex items-center gap-0 border-t-2 border-b border-border bg-muted/30 dark:bg-muted/10"
      style={{ minHeight: "32px" }}
      data-testid="group-summary-row"
    >
      <div className="w-10 flex-shrink-0 sticky left-0 z-30 bg-inherit border-r border-border" />
      <div
        className="min-w-[200px] w-[280px] flex-shrink-0 px-3 sticky left-10 z-30 bg-inherit border-r border-border sticky-col-shadow flex items-center"
      >
        <span className="text-xs font-medium text-muted-foreground">
          {tasks.length}
          <span className="ml-1 opacity-70">items</span>
        </span>
      </div>
      {columns.map((col) => (
        <div
          key={col.id}
          className="px-1.5 flex items-center border-r border-border"
          style={{ width: col.width, minWidth: col.width, minHeight: "32px" }}
        >
          {renderSummaryCell(col)}
        </div>
      ))}
      <div className="w-8 flex-shrink-0" />
    </div>
  );
}

interface TaskGroupProps {
  group: Group;
  tasks: Task[];
  columns: ColumnDef[];
  statusLabels?: CustomStatusLabel[];
  onToggleCollapse: () => void;
  onAddTask: () => void;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onEditStatusLabels?: () => void;
  selectedTaskIds?: Set<string>;
  onSelectTask?: (taskId: string, selected: boolean) => void;
  currentSort?: { columnId: string; direction: "asc" | "desc" } | null;
  onOpenColumnCenter?: () => void;
  canDeleteTasks?: boolean;
  onInlineAddTask?: (groupId: string, title: string) => void;
}

export const TaskGroup = memo(function TaskGroup({
  group,
  tasks,
  columns,
  statusLabels,
  onToggleCollapse,
  onAddTask,
  onEditGroup,
  onDeleteGroup,
  onTaskClick,
  onTaskUpdate,
  onTaskDelete,
  onEditStatusLabels,
  selectedTaskIds = new Set(),
  onSelectTask,
  currentSort,
  onOpenColumnCenter,
  canDeleteTasks = true,
  onInlineAddTask,
}: TaskGroupProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [workflowFilter, setWorkflowFilter] = useState<"all" | "not-started" | "in-progress" | "completed">("all");
  const [inlineTaskName, setInlineTaskName] = useState("");
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const visibleColumns = columns.filter((col) => col.visible).sort((a, b) => a.order - b.order);

  const notStartedTasks = tasks.filter(t => t.status === "not-started");
  const inProgressTasks = tasks.filter(t => ["working-on-it", "stuck", "pending-review"].includes(t.status));
  const completedTasks = tasks.filter(t => t.status === "done");

  const displayTasks = useMemo(() => {
    switch (workflowFilter) {
      case "not-started": return notStartedTasks;
      case "in-progress": return inProgressTasks;
      case "completed": return completedTasks;
      default: return tasks;
    }
  }, [workflowFilter, tasks, notStartedTasks, inProgressTasks, completedTasks]);

  const handleInlineSubmit = useCallback(() => {
    if (inlineTaskName.trim() && onInlineAddTask) {
      onInlineAddTask(group.id, inlineTaskName.trim());
      setInlineTaskName("");
      setIsInlineEditing(false);
    }
  }, [inlineTaskName, onInlineAddTask, group.id]);

  const handleInlineKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleInlineSubmit();
    } else if (e.key === "Escape") {
      setInlineTaskName("");
      setIsInlineEditing(false);
    }
  }, [handleInlineSubmit]);

  const startInlineEdit = useCallback(() => {
    if (onInlineAddTask) {
      setIsInlineEditing(true);
      setTimeout(() => inlineInputRef.current?.focus(), 0);
    } else {
      onAddTask();
    }
  }, [onInlineAddTask, onAddTask]);

  const filterItems = [
    { key: "all" as const, label: "All", count: tasks.length },
    { key: "not-started" as const, label: "Not Started", count: notStartedTasks.length },
    { key: "in-progress" as const, label: "In Progress", count: inProgressTasks.length },
    { key: "completed" as const, label: "Done", count: completedTasks.length },
  ];

  return (
    <div
      className="mb-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="flex items-center gap-2 py-2 px-2 cursor-pointer"
        onClick={onToggleCollapse}
        data-testid={`group-header-${group.id}`}
      >
        <div className="flex items-center gap-1">
          {group.collapsed ? (
            <ChevronRight className="h-4 w-4" style={{ color: group.color }} />
          ) : (
            <ChevronDown className="h-4 w-4" style={{ color: group.color }} />
          )}
        </div>
        <span className="font-semibold text-sm" style={{ color: group.color }}>
          {group.title}
        </span>
        <span className="text-xs text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? "item" : "items"}
        </span>

        <div className="flex items-center gap-0.5 ml-2" onClick={(e) => e.stopPropagation()}>
          {filterItems.map(f => (
            <Badge
              key={f.key}
              variant={workflowFilter === f.key ? "default" : "outline"}
              className={`text-[10px] px-1.5 py-0 h-5 cursor-pointer font-normal ${
                workflowFilter === f.key
                  ? ""
                  : "text-muted-foreground border-transparent"
              }`}
              onClick={() => setWorkflowFilter(f.key)}
              data-testid={`filter-workflow-${group.id}-${f.key}`}
            >
              {f.label} ({f.count})
            </Badge>
          ))}
        </div>

        <div className="flex-1" />

        <div
          className="flex items-center gap-1"
          style={{ visibility: isHovered ? "visible" : "hidden" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTask}
            data-testid={`button-add-task-${group.id}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-group-menu-${group.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditGroup}>
                Rename Group
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDeleteGroup}
                className="text-destructive"
              >
                Delete Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {!group.collapsed && (
        <div style={{ borderLeft: `3px solid ${group.color}` }} className="border-r border-border">
            {displayTasks.map((task, idx) => (
              <TaskRow
                key={task.id}
                task={task}
                columns={visibleColumns}
                statusLabels={statusLabels}
                groupColor={group.color}
                onClick={() => onTaskClick(task)}
                onUpdate={(updates) => onTaskUpdate(task.id, updates)}
                onDelete={() => onTaskDelete(task.id)}
                onEditStatusLabels={onEditStatusLabels}
                isSelected={selectedTaskIds.has(task.id)}
                onSelect={onSelectTask}
                canDelete={canDeleteTasks}
                rowIndex={idx}
                onAddRowBelow={() => {
                  setIsInlineEditing(true);
                }}
              />
            ))}

            {tasks.length === 0 && !isInlineEditing && (
              <div className="flex items-center justify-center text-sm text-muted-foreground border-b border-border" style={{ minHeight: "36px" }}>
                No tasks in this group.{" "}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startInlineEdit}
                  data-testid={`button-add-first-task-${group.id}`}
                >
                  Add one
                </Button>
              </div>
            )}

            <div
              className="flex items-center gap-0 border-b border-border hover-elevate cursor-pointer"
              style={{ minHeight: "36px" }}
              onClick={!isInlineEditing ? startInlineEdit : undefined}
              data-testid={`row-add-task-${group.id}`}
            >
              <div
                className="w-10 flex-shrink-0 sticky left-0 z-30 bg-inherit flex items-center justify-center border-r border-border"
              />
              <div
                className="min-w-[200px] w-[280px] flex-shrink-0 sticky left-10 z-30 bg-inherit border-r border-border sticky-col-shadow"
              >
                {isInlineEditing ? (
                  <Input
                    ref={inlineInputRef}
                    value={inlineTaskName}
                    onChange={(e) => setInlineTaskName(e.target.value)}
                    onKeyDown={handleInlineKeyDown}
                    onBlur={() => {
                      if (inlineTaskName.trim()) {
                        handleInlineSubmit();
                      } else {
                        setIsInlineEditing(false);
                      }
                    }}
                    placeholder="Enter task name..."
                    className="h-8 text-sm border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary bg-transparent"
                    autoFocus
                    data-testid={`input-inline-task-${group.id}`}
                  />
                ) : (
                  <div
                    className="flex items-center gap-2 py-2 px-2 text-sm text-muted-foreground"
                    onClick={startInlineEdit}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add task</span>
                  </div>
                )}
              </div>
              {visibleColumns.map((col) => (
                <div
                  key={col.id}
                  className="border-r border-border"
                  style={{ width: col.width, minWidth: col.width }}
                />
              ))}
              <div className="w-8 flex-shrink-0" />
            </div>

            {tasks.length > 0 && (
              <GroupSummaryRow
                tasks={tasks}
                columns={visibleColumns}
                groupColor={group.color}
              />
            )}
        </div>
      )}
    </div>
  );
});
