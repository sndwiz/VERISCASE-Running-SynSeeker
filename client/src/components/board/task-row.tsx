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
import { TimeCell } from "./cells/time-cell";
import { FileCell } from "./cells/file-cell";
import {
  EmailCell,
  PhoneCell,
  RatingCell,
  VoteCell,
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
import type { Task, ColumnDef, StatusType, Priority, Person, FileAttachment } from "@shared/schema";

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

    const getCustomFieldValue = () => task.customFields?.[column.id];
    const setCustomFieldValue = (value: any) =>
      onUpdate({ customFields: { ...task.customFields, [column.id]: value } });

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
            {...cellProps}
          />
        );
      case "email":
        return (
          <EmailCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "phone":
        return (
          <PhoneCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "rating":
        return (
          <RatingCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "vote":
        return (
          <VoteCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "link":
        return (
          <LinkCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "location":
        return (
          <LocationCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "checkbox":
        return (
          <CheckboxCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "dropdown":
        return (
          <DropdownCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            options={column.options || []}
            {...cellProps}
          />
        );
      case "tags":
        return (
          <TagsCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "number":
      case "numbers":
        return (
          <NumberCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "long-text":
        return (
          <LongTextCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "color-picker":
        return (
          <ColorPickerCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "time-tracking":
        return (
          <TimeTrackingCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "item-id":
        return (
          <ItemIdCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            taskId={task.id}
            {...cellProps}
          />
        );
      case "creation-log":
        return (
          <CreationLogCell
            value={{ createdAt: task.createdAt, createdBy: "User" }}
            onChange={() => {}}
            {...cellProps}
          />
        );
      case "last-updated":
        return (
          <LastUpdatedCell
            value={task.updatedAt || task.createdAt}
            onChange={() => {}}
            {...cellProps}
          />
        );
      case "auto-number":
        return (
          <AutoNumberCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "dependency":
        return (
          <DependencyCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "country":
        return (
          <CountryCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "world-clock":
        return (
          <WorldClockCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "hour":
        return (
          <HourCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "week":
        return (
          <WeekCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "formula":
        return (
          <FormulaCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "button":
        return (
          <ButtonCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "label":
        return (
          <LabelCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            options={column.options || []}
            {...cellProps}
          />
        );
      case "timeline":
        return (
          <TimelineCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "progress-tracking":
        return (
          <ProgressTrackingCell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            {...cellProps}
          />
        );
      case "ai-improve":
      case "ai-write":
      case "ai-extract":
      case "ai-summarize":
      case "ai-translate":
      case "ai-sentiment":
      case "ai-categorize":
        return (
          <AICell
            value={getCustomFieldValue()}
            onChange={setCustomFieldValue}
            aiType={column.type}
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
