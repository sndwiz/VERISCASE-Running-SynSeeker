import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Copy,
  Trash2,
  Edit3,
  Info,
  MoreHorizontal,
  ChevronDown,
  Columns,
  Settings,
  GripVertical,
  MinusCircle,
  EyeOff,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { ColumnDef, ColumnType } from "@shared/schema";

interface ColumnHeaderProps {
  column: ColumnDef;
  onSort?: (columnId: string, direction: "asc" | "desc") => void;
  onFilter?: (columnId: string) => void;
  onDuplicate?: (columnId: string) => void;
  onRename?: (columnId: string, newTitle: string) => void;
  onDelete?: (columnId: string) => void;
  onHide?: (columnId: string) => void;
  onChangeType?: (columnId: string, newType: ColumnType) => void;
  onUpdateDescription?: (columnId: string, description: string) => void;
  onAIAutofill?: (columnId: string) => void;
  currentSort?: { columnId: string; direction: "asc" | "desc" } | null;
}

const AI_AUTOFILL_COLUMN_TYPES: ColumnType[] = ["status", "label", "dropdown", "priority", "tags"];

const COLUMN_TYPES_FOR_CHANGE: { type: ColumnType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "long-text", label: "Long Text" },
  { type: "number", label: "Numbers" },
  { type: "date", label: "Date" },
  { type: "status", label: "Status" },
  { type: "phone", label: "Phone" },
  { type: "email", label: "Email" },
  { type: "dropdown", label: "Dropdown" },
  { type: "tags", label: "Tags" },
  { type: "link", label: "Link" },
  { type: "checkbox", label: "Checkbox" },
  { type: "rating", label: "Rating" },
];

export function ColumnHeader({
  column,
  onSort,
  onFilter,
  onDuplicate,
  onRename,
  onDelete,
  onHide,
  onChangeType,
  onUpdateDescription,
  onAIAutofill,
  currentSort,
}: ColumnHeaderProps) {
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(column.title);
  const [newDescription, setNewDescription] = useState(column.description || "");

  const isCurrentlySorted = currentSort?.columnId === column.id;
  const sortDirection = isCurrentlySorted ? currentSort.direction : null;

  const handleRename = () => {
    if (newTitle.trim() && newTitle !== column.title) {
      onRename?.(column.id, newTitle.trim());
    }
    setRenameDialogOpen(false);
  };

  const handleSaveDescription = () => {
    onUpdateDescription?.(column.id, newDescription);
    setDescriptionDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-1 w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors group"
            data-testid={`column-header-${column.id}`}
          >
            <span className="flex-1 text-left truncate flex items-center gap-1">
              {column.title}
              {column.description && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground/60" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{column.description}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </span>
            {isCurrentlySorted && (
              <span className="text-primary">
                {sortDirection === "asc" ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-48">
          {onSort && (
            <>
              <DropdownMenuItem
                onClick={() => onSort(column.id, "asc")}
                className={sortDirection === "asc" ? "bg-primary/10" : ""}
                data-testid={`sort-asc-${column.id}`}
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Sort Ascending
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onSort(column.id, "desc")}
                className={sortDirection === "desc" ? "bg-primary/10" : ""}
                data-testid={`sort-desc-${column.id}`}
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Sort Descending
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {onFilter && (
            <>
              <DropdownMenuItem onClick={() => onFilter(column.id)} data-testid={`filter-${column.id}`}>
                <Filter className="h-4 w-4 mr-2" />
                Filter by this column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {onAIAutofill && AI_AUTOFILL_COLUMN_TYPES.includes(column.type) && (
            <>
              <DropdownMenuItem
                onClick={() => onAIAutofill(column.id)}
                data-testid={`ai-autofill-${column.id}`}
              >
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Autofill with AI
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {onHide && (
            <DropdownMenuItem onClick={() => onHide(column.id)} data-testid={`hide-${column.id}`}>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Column
            </DropdownMenuItem>
          )}

          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(column.id)} data-testid={`duplicate-${column.id}`}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate Column
            </DropdownMenuItem>
          )}

          {onChangeType && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-testid={`change-type-${column.id}`}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Change Column Type
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                {COLUMN_TYPES_FOR_CHANGE.map((typeOption) => (
                  <DropdownMenuItem
                    key={typeOption.type}
                    onClick={() => onChangeType(column.id, typeOption.type)}
                    className={column.type === typeOption.type ? "bg-primary/10" : ""}
                    data-testid={`change-type-${column.id}-${typeOption.type}`}
                  >
                    {typeOption.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              setNewTitle(column.title);
              setRenameDialogOpen(true);
            }}
            data-testid={`rename-${column.id}`}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Rename
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => {
              setNewDescription(column.description || "");
              setDescriptionDialogOpen(true);
            }}
            data-testid={`edit-description-${column.id}`}
          >
            <Info className="h-4 w-4 mr-2" />
            {column.description ? "Edit Description" : "Add Description"}
          </DropdownMenuItem>

          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(column.id)}
                className="text-destructive focus:text-destructive"
                data-testid={`delete-${column.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Column
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="column-title">Column Name</Label>
              <Input
                id="column-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter column name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                }}
                data-testid="input-column-title"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} data-testid="button-save-column-title">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={descriptionDialogOpen} onOpenChange={setDescriptionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Column Description</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="column-description">Description</Label>
              <Textarea
                id="column-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe what this column is for..."
                className="min-h-[80px]"
                data-testid="input-column-description"
              />
              <p className="text-xs text-muted-foreground">
                This description will appear as a tooltip when hovering over the column header.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDescriptionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDescription} data-testid="button-save-column-description">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
