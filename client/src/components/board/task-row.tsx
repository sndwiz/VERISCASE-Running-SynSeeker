import { useState } from "react";
import { GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { Task, ColumnDef, StatusType, Priority, Person } from "@shared/schema";

interface TaskRowProps {
  task: Task;
  columns: ColumnDef[];
  isEven: boolean;
  onClick: () => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
}

export function TaskRow({
  task,
  columns,
  isEven,
  onClick,
  onUpdate,
  onDelete,
}: TaskRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const renderCell = (column: ColumnDef) => {
    const cellProps = {
      onClick: handleCellClick,
    };

    switch (column.type) {
      case "status":
        return (
          <StatusCell
            value={task.status}
            onChange={(value: StatusType) => onUpdate({ status: value })}
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
    <div
      className={`flex items-center gap-0 py-1.5 px-0 rounded-md transition-colors cursor-pointer border-b border-border/50 ${
        isSelected
          ? "bg-primary/10"
          : isEven
          ? "bg-muted/30"
          : "bg-transparent"
      } ${isHovered && !isSelected ? "bg-muted/50" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`task-row-${task.id}`}
    >
      <div className="w-8 flex items-center justify-center">
        {isHovered ? (
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => setIsSelected(!!checked)}
            onClick={(e) => e.stopPropagation()}
            data-testid={`checkbox-task-${task.id}`}
          />
        )}
      </div>

      <div
        className="flex-1 min-w-[200px] px-2 truncate"
        onClick={onClick}
        data-testid={`task-title-${task.id}`}
      >
        <span className="text-sm font-medium">{task.title}</span>
      </div>

      {columns.map((col) => (
        <div
          key={col.id}
          className="px-1"
          style={{ width: col.width, minWidth: col.width }}
        >
          {renderCell(col)}
        </div>
      ))}

      <div className="w-8 flex items-center justify-center">
        {isHovered && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => e.stopPropagation()}
                data-testid={`button-task-menu-${task.id}`}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onClick}>
                Open Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
