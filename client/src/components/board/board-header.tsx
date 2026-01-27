import { useState } from "react";
import { LayoutGrid, MoreHorizontal, Search, Filter, Plus, Columns, Settings, Trash2, Type, Calendar, Users, BarChart3, Clock, CheckSquare, ChevronUp, ChevronDown, Layers, Check, ArrowUpDown, Zap, List, LayoutDashboard, CalendarDays, Paperclip, X, ChevronDown as ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FiltersPanel, type FilterGroup, type SortOption } from "./filters-panel";
import { ColumnCenter } from "./column-center";
import type { Board, ColumnDef, ColumnType } from "@shared/schema";

export type GroupByOption = "default" | "status" | "priority" | "owner";

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
  filters?: FilterGroup[];
  onFiltersChange?: (filters: FilterGroup[]) => void;
  sorts?: SortOption[];
  onSortsChange?: (sorts: SortOption[]) => void;
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
  filters = [],
  onFiltersChange,
  sorts = [],
  onSortsChange,
}: BoardHeaderProps) {
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [columnCenterOpen, setColumnCenterOpen] = useState(false);

  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);
  const visibleCount = board.columns.filter(c => c.visible).length;

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

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2" 
            onClick={() => setFiltersPanelOpen(true)}
            data-testid="button-filter"
          >
            <Filter className="h-4 w-4" />
            Filter
            {filters.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                {filters.reduce((acc, g) => acc + g.conditions.length, 0)}
              </Badge>
            )}
          </Button>

          <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-sort">
                <ArrowUpDown className="h-4 w-4" />
                Sort
                {sorts.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                    {sorts.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Sort</h4>
                  {sorts.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground h-6"
                      onClick={() => onSortsChange?.([])}
                      data-testid="button-clear-sorts"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-3 space-y-2 max-h-64 overflow-auto">
                {sorts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No sorts applied. Add a sort to order your items.
                  </p>
                )}
                {sorts.map((sort, index) => (
                  <div key={sort.id} className="flex items-center gap-2">
                    {index > 0 && (
                      <span className="text-xs text-muted-foreground w-10">then</span>
                    )}
                    <Select
                      value={sort.columnId}
                      onValueChange={(value) => {
                        onSortsChange?.(
                          sorts.map((s) => (s.id === sort.id ? { ...s, columnId: value } : s))
                        );
                      }}
                    >
                      <SelectTrigger className="flex-1 h-8 text-xs" data-testid={`sort-column-${sort.id}`}>
                        <SelectValue placeholder="Column" />
                      </SelectTrigger>
                      <SelectContent>
                        {board.columns.map((col) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={sort.direction}
                      onValueChange={(value: "asc" | "desc") => {
                        onSortsChange?.(
                          sorts.map((s) => (s.id === sort.id ? { ...s, direction: value } : s))
                        );
                      }}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs" data-testid={`sort-direction-${sort.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => onSortsChange?.(sorts.filter((s) => s.id !== sort.id))}
                      data-testid={`button-remove-sort-${sort.id}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    const newSort: SortOption = {
                      id: Math.random().toString(36).substring(2, 9),
                      columnId: board.columns[0]?.id || "",
                      direction: "asc",
                    };
                    onSortsChange?.([...sorts, newSort]);
                  }}
                  data-testid="button-add-sort"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add sort
                </Button>
              </div>
            </PopoverContent>
          </Popover>

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
                          className="invisible group-hover:visible text-destructive"
                          onClick={() => onRemoveColumn(column.id)}
                          data-testid={`button-remove-column-${column.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
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
                    onClick={() => setColumnCenterOpen(true)}
                    data-testid="button-add-column"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Column Center
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

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

      <FiltersPanel
        open={filtersPanelOpen}
        onOpenChange={setFiltersPanelOpen}
        columns={board.columns}
        filters={filters}
        onFiltersChange={(newFilters) => onFiltersChange?.(newFilters)}
      />

      <ColumnCenter
        open={columnCenterOpen}
        onOpenChange={setColumnCenterOpen}
        onAddColumn={(type, title) => {
          onAddColumn?.({
            title,
            type,
            width: 120,
            visible: true,
          });
        }}
      />
    </div>
  );
}
