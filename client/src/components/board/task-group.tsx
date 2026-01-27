import { useState } from "react";
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
import type { Group, Task, ColumnDef } from "@shared/schema";

interface TaskGroupProps {
  group: Group;
  tasks: Task[];
  columns: ColumnDef[];
  onToggleCollapse: () => void;
  onAddTask: () => void;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
}

export function TaskGroup({
  group,
  tasks,
  columns,
  onToggleCollapse,
  onAddTask,
  onEditGroup,
  onDeleteGroup,
  onTaskClick,
  onTaskUpdate,
  onTaskDelete,
}: TaskGroupProps) {
  const [isHovered, setIsHovered] = useState(false);
  const visibleColumns = columns.filter((col) => col.visible).sort((a, b) => a.order - b.order);

  return (
    <div
      className="mb-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="flex items-center gap-2 py-2 px-2 rounded-md hover-elevate cursor-pointer"
        style={{ borderLeft: `3px solid ${group.color}` }}
        onClick={onToggleCollapse}
        data-testid={`group-header-${group.id}`}
      >
        <GripVertical
          className="h-4 w-4 text-muted-foreground"
          style={{ visibility: isHovered ? "visible" : "hidden" }}
        />
        {group.collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-medium" style={{ color: group.color }}>
          {group.title}
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </span>

        <div className="flex-1" />

        <div
          className="flex items-center gap-1"
          style={{ visibility: isHovered ? "visible" : "hidden" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onAddTask}
            data-testid={`button-add-task-${group.id}`}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                data-testid={`button-group-menu-${group.id}`}
              >
                <MoreHorizontal className="h-3 w-3" />
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
        <div className="mt-2">
          {/* Column Headers */}
          <div className="flex items-center gap-0 text-xs font-medium text-muted-foreground border-b pb-2 mb-1">
            <div className="w-8" />
            <div className="flex-1 min-w-[200px] px-2">Task</div>
            {visibleColumns.map((col) => (
              <div
                key={col.id}
                className="px-2 text-center"
                style={{ width: col.width, minWidth: col.width }}
              >
                {col.title}
              </div>
            ))}
            <div className="w-8" />
          </div>

          {/* Task Rows */}
          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              columns={visibleColumns}
              isEven={index % 2 === 0}
              onClick={() => onTaskClick(task)}
              onUpdate={(updates) => onTaskUpdate(task.id, updates)}
              onDelete={() => onTaskDelete(task.id)}
            />
          ))}

          {tasks.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No tasks in this group.{" "}
              <button
                className="text-primary hover:underline"
                onClick={onAddTask}
                data-testid={`button-add-first-task-${group.id}`}
              >
                Add one
              </button>
            </div>
          )}

          {/* Add Task Row */}
          <div
            className="flex items-center gap-2 py-2 px-2 text-sm text-muted-foreground hover-elevate cursor-pointer rounded-md"
            onClick={onAddTask}
            data-testid={`row-add-task-${group.id}`}
          >
            <div className="w-8" />
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </div>
        </div>
      )}
    </div>
  );
}
