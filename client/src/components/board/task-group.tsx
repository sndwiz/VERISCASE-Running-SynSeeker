import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TaskRow } from "./task-row";
import { ColumnHeader } from "./column-header";
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
      className="flex items-center gap-0 py-1.5 border-t border-border/30"
      data-testid="group-summary-row"
    >
      <div className="w-10 flex-shrink-0" style={{ borderLeft: `3px solid ${groupColor}` }} />
      <div className="flex-1 min-w-[200px] px-2">
        <span className="text-xs font-medium text-muted-foreground">
          {tasks.length}
          <span className="ml-1 opacity-70">items</span>
        </span>
      </div>
      {columns.map((col) => (
        <div
          key={col.id}
          className="px-1 flex items-center"
          style={{ width: col.width, minWidth: col.width }}
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
  onColumnSort?: (columnId: string, direction: "asc" | "desc") => void;
  onColumnFilter?: (columnId: string) => void;
  onColumnDuplicate?: (columnId: string) => void;
  onColumnRename?: (columnId: string, newTitle: string) => void;
  onColumnDelete?: (columnId: string) => void;
  onColumnHide?: (columnId: string) => void;
  onColumnChangeType?: (columnId: string, newType: ColumnType) => void;
  onColumnUpdateDescription?: (columnId: string, description: string) => void;
  currentSort?: { columnId: string; direction: "asc" | "desc" } | null;
  onOpenColumnCenter?: () => void;
  canDeleteTasks?: boolean;
}

export function TaskGroup({
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
  onColumnSort,
  onColumnFilter,
  onColumnDuplicate,
  onColumnRename,
  onColumnDelete,
  onColumnHide,
  onColumnChangeType,
  onColumnUpdateDescription,
  currentSort,
  onOpenColumnCenter,
  canDeleteTasks = true,
}: TaskGroupProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const visibleColumns = columns.filter((col) => col.visible).sort((a, b) => a.order - b.order);

  const COMPLETED_COLLAPSE_THRESHOLD = 10;
  const completedTasks = tasks.filter(t => t.status === "done");
  const activeTasks = tasks.filter(t => t.status !== "done");
  const shouldCollapseCompleted = completedTasks.length >= COMPLETED_COLLAPSE_THRESHOLD;
  const displayTasks = shouldCollapseCompleted
    ? (showCompleted ? [...activeTasks, ...completedTasks] : activeTasks)
    : tasks;

  return (
    <div
      className="mb-6"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="flex items-center gap-2 py-2.5 px-3 cursor-pointer rounded-t-md"
        style={{ backgroundColor: `${group.color}15` }}
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
        <span className="text-xs text-muted-foreground ml-1">
          {tasks.length} {tasks.length === 1 ? "item" : "items"}
        </span>

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
        <div className="overflow-x-auto" style={{ borderLeft: `3px solid ${group.color}` }}>
          <div className="min-w-max">
            <div className="flex items-center gap-0 text-xs font-medium text-muted-foreground py-1.5 bg-muted/40 border-b border-border/40">
              <div className="w-10 flex-shrink-0" />
              <div className="flex-1 min-w-[200px] px-2">Task</div>
              {visibleColumns.map((col) => (
                <div
                  key={col.id}
                  className="flex-shrink-0"
                  style={{ width: col.width, minWidth: col.width }}
                >
                  <ColumnHeader
                    column={col}
                    onSort={onColumnSort}
                    onFilter={onColumnFilter}
                    onDuplicate={onColumnDuplicate}
                    onRename={onColumnRename}
                    onDelete={onColumnDelete}
                    onHide={onColumnHide}
                    onChangeType={onColumnChangeType}
                    onUpdateDescription={onColumnUpdateDescription}
                    currentSort={currentSort}
                  />
                </div>
              ))}
              {onOpenColumnCenter && (
                <div className="flex-shrink-0 w-10 flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenColumnCenter}
                    data-testid="button-add-column-inline"
                    title="Add column"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!onOpenColumnCenter && <div className="w-8 flex-shrink-0" />}
            </div>

            {displayTasks.map((task) => (
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
              />
            ))}

            {shouldCollapseCompleted && (
              <div
                className="flex items-center gap-2 py-2 px-3 text-sm text-muted-foreground cursor-pointer border-b border-border/30 hover-elevate"
                onClick={() => setShowCompleted(!showCompleted)}
                data-testid={`toggle-completed-${group.id}`}
              >
                <div className="w-7 flex-shrink-0" />
                {showCompleted ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                <span>
                  {showCompleted ? "Hide" : "Show"} {completedTasks.length} completed item{completedTasks.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground border-b border-border/30">
                No tasks in this group.{" "}
                <Button
                  variant="ghost"
                  className="text-primary"
                  onClick={onAddTask}
                  data-testid={`button-add-first-task-${group.id}`}
                >
                  Add one
                </Button>
              </div>
            )}

            <div
              className="flex items-center gap-2 py-1.5 px-3 text-sm text-muted-foreground cursor-pointer border-b border-border/30 hover-elevate"
              onClick={onAddTask}
              data-testid={`row-add-task-${group.id}`}
            >
              <div className="w-7 flex-shrink-0" />
              <Plus className="h-3.5 w-3.5" />
              <span>Add task</span>
            </div>

            {tasks.length > 0 && (
              <GroupSummaryRow
                tasks={tasks}
                columns={visibleColumns}
                groupColor={group.color}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
