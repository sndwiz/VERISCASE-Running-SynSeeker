import { useState } from "react";
import { LayoutGrid, MoreHorizontal, Search, Filter, Plus, Columns, Settings, Trash2, Type, Calendar, Users, BarChart3, Clock, CheckSquare, ChevronUp, ChevronDown, Layers, Check, ArrowUpDown, Zap, List, LayoutDashboard, CalendarDays, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Board, ColumnDef, ColumnType } from "@shared/schema";

export type GroupByOption = "default" | "status" | "priority" | "owner";

const COLUMN_TYPES: { type: ColumnType; label: string; icon: typeof Type }[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "status", label: "Status", icon: CheckSquare },
  { type: "priority", label: "Priority", icon: BarChart3 },
  { type: "date", label: "Date", icon: Calendar },
  { type: "person", label: "Person", icon: Users },
  { type: "progress", label: "Progress", icon: BarChart3 },
  { type: "time", label: "Time Tracking", icon: Clock },
  { type: "files", label: "Files", icon: Paperclip },
];

const GROUP_BY_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: "default", label: "Default (Groups)" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "owner", label: "Owner" },
];

interface BoardHeaderProps {
  board: Board;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddTask: () => void;
  onAddGroup: () => void;
  onEditBoard: () => void;
  onDeleteBoard: () => void;
  onToggleColumn?: (columnId: string, visible: boolean) => void;
  onAddColumn?: (column: Omit<ColumnDef, "id" | "order">) => void;
  onRemoveColumn?: (columnId: string) => void;
  onReorderColumn?: (columnId: string, direction: "up" | "down") => void;
  groupBy?: GroupByOption;
  onGroupByChange?: (value: GroupByOption) => void;
  taskCount?: number;
  onOpenAutomations?: () => void;
}

export function BoardHeader({
  board,
  searchQuery,
  onSearchChange,
  onAddTask,
  onAddGroup,
  onEditBoard,
  onDeleteBoard,
  onToggleColumn,
  onAddColumn,
  onRemoveColumn,
  onReorderColumn,
  groupBy = "default",
  onGroupByChange,
  taskCount = 0,
  onOpenAutomations,
}: BoardHeaderProps) {
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnType>("text");

  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);
  const visibleCount = board.columns.filter(c => c.visible).length;

  const handleAddColumn = () => {
    if (newColumnTitle.trim() && onAddColumn) {
      onAddColumn({
        title: newColumnTitle.trim(),
        type: newColumnType,
        width: 120,
        visible: true,
      });
      setNewColumnTitle("");
      setNewColumnType("text");
      setAddColumnOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border-b bg-card/50">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-md shadow-sm"
            style={{ backgroundColor: board.color }}
          >
            <LayoutGrid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-board-name">
              {board.name}
            </h1>
            {board.description && (
              <p className="text-sm text-muted-foreground">
                {board.description}
              </p>
            )}
          </div>
          <span className="ml-2 text-sm text-muted-foreground">{taskCount} items</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="pl-9 w-48"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="input-search-tasks"
            />
          </div>

          <div className="flex items-center border rounded-md">
            <Button variant="ghost" size="icon" className="rounded-r-none" data-testid="button-view-list">
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-none border-x" data-testid="button-view-grid">
              <LayoutDashboard className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-l-none" data-testid="button-view-calendar">
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" className="gap-2" data-testid="button-filter">
            <Filter className="h-4 w-4" />
            Filter
          </Button>

          <Button variant="outline" size="sm" className="gap-2" data-testid="button-sort">
            <ArrowUpDown className="h-4 w-4" />
            Sort
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-group-by">
                <Layers className="h-4 w-4" />
                Group
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-2">
              <div className="space-y-1">
                <h4 className="font-medium text-sm px-2 py-1.5">Group by</h4>
                {GROUP_BY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded-md hover-elevate"
                    onClick={() => onGroupByChange?.(option.value)}
                    data-testid={`group-by-${option.value}`}
                  >
                    <span>{option.label}</span>
                    {groupBy === option.value && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-columns">
                <Columns className="h-4 w-4 mr-2" />
                Columns
                <span className="ml-1 text-xs text-muted-foreground">({visibleCount})</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <div className="p-3 border-b">
                <h4 className="font-medium text-sm">Manage Columns</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Show, hide, or remove columns
                </p>
              </div>
              <div className="max-h-64 overflow-auto p-2">
                {sortedColumns.map((column, index) => (
                  <div
                    key={column.id}
                    className="flex items-center justify-between py-2 px-2 rounded-md hover-elevate group"
                  >
                    <div className="flex items-center gap-1">
                      {onReorderColumn && (
                        <div className="flex flex-col opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => onReorderColumn(column.id, "up")}
                            disabled={index === 0}
                            data-testid={`button-move-up-${column.id}`}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => onReorderColumn(column.id, "down")}
                            disabled={index === sortedColumns.length - 1}
                            data-testid={`button-move-down-${column.id}`}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <span className="text-sm">{column.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={column.visible}
                        onCheckedChange={(checked) => onToggleColumn?.(column.id, checked)}
                        data-testid={`toggle-column-${column.id}`}
                      />
                      {onRemoveColumn && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => onRemoveColumn(column.id)}
                          data-testid={`button-remove-column-${column.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {onAddColumn && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setAddColumnOpen(true)}
                    data-testid="button-add-column"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Column
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          <Dialog open={addColumnOpen} onOpenChange={setAddColumnOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Column</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="column-title">Column Title</Label>
                  <Input
                    id="column-title"
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    placeholder="Enter column title"
                    data-testid="input-column-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Column Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {COLUMN_TYPES.map(({ type, label, icon: Icon }) => (
                      <Button
                        key={type}
                        variant={newColumnType === type ? "default" : "outline"}
                        size="sm"
                        className="justify-start"
                        onClick={() => setNewColumnType(type)}
                        data-testid={`button-column-type-${type}`}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddColumn}
                  disabled={!newColumnTitle.trim()}
                  data-testid="button-confirm-add-column"
                >
                  Add Column
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2" 
            onClick={onOpenAutomations}
            data-testid="button-automations"
          >
            <Zap className="h-4 w-4" />
            Automations
          </Button>

          <Button onClick={onAddTask} data-testid="button-add-task">
            <Plus className="h-4 w-4 mr-1" />
            New Task
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-board-menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAddGroup} data-testid="menu-add-group">
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEditBoard} data-testid="menu-edit-board">
                <Settings className="h-4 w-4 mr-2" />
                Edit Board
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDeleteBoard}
                className="text-destructive"
                data-testid="menu-delete-board"
              >
                Delete Board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
