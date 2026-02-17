import { useState, useMemo } from "react";
import { LayoutGrid, MoreHorizontal, Search, Filter, Plus, Columns, Settings, Trash2, ChevronUp, ChevronDown, Layers, Check, ArrowUpDown, Zap, X, UserPlus, Download, Bot, Plug, User, EyeOff, ChevronsUpDown } from "lucide-react";
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
import { FiltersPanel, type FilterGroup, type SortOption } from "./filters-panel";
import type { Board, ColumnDef, ColumnType, Task } from "@shared/schema";

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
  automationCount?: number;
  filters?: FilterGroup[];
  onFiltersChange?: (filters: FilterGroup[]) => void;
  sorts?: SortOption[];
  onSortsChange?: (sorts: SortOption[]) => void;
  onOpenColumnCenter?: () => void;
  onInvite?: () => void;
  onExport?: () => void;
  onOpenIntegrations?: () => void;
  onOpenSidekick?: () => void;
  tasks?: Task[];
  personFilter?: string | null;
  onPersonFilterChange?: (person: string | null) => void;
  onCollapseAll?: () => void;
  onExpandAll?: () => void;
  allCollapsed?: boolean;
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
  automationCount = 0,
  filters = [],
  onFiltersChange,
  sorts = [],
  onSortsChange,
  onOpenColumnCenter,
  onInvite,
  onExport,
  onOpenIntegrations,
  onOpenSidekick,
  tasks = [],
  personFilter,
  onPersonFilterChange,
  onCollapseAll,
  onExpandAll,
  allCollapsed = false,
}: BoardHeaderProps) {
  const [filtersPanelOpen, setFiltersPanelOpen] = useState(false);
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);

  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);
  const visibleCount = board.columns.filter(c => c.visible).length;
  const hiddenCount = board.columns.length - visibleCount;

  const uniqueAssignees = useMemo(() => {
    const names = new Set<string>();
    tasks.forEach(t => {
      t.assignees?.forEach(a => names.add(a.name));
    });
    return Array.from(names).sort();
  }, [tasks]);

  return (
    <div className="flex flex-col border-b bg-card/50">
      <div className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md shadow-sm"
            style={{ backgroundColor: board.color }}
          >
            <LayoutGrid className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight" data-testid="text-board-name">
              {board.name}
            </h1>
            {board.description && (
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                {board.description}
              </p>
            )}
          </div>
          <Badge variant="secondary" className="text-xs" data-testid="badge-task-count">
            {taskCount} items
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5" 
            onClick={onOpenSidekick}
            data-testid="button-sidekick"
          >
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sidekick</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5" 
            onClick={onOpenIntegrations}
            data-testid="button-integrations"
          >
            <Plug className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Integrate</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5" 
            onClick={onOpenAutomations}
            data-testid="button-automations"
          >
            <Zap className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Automate</span>
            {automationCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5">
                {automationCount}
              </Badge>
            )}
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5" 
            onClick={onInvite}
            data-testid="button-invite"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Invite</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5" 
            onClick={onExport}
            data-testid="button-export"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
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
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Board
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-4 py-1.5 border-t bg-muted/20 flex-wrap">
        <Button onClick={onAddTask} size="sm" data-testid="button-add-task">
          <Plus className="h-3.5 w-3.5 mr-1" />
          New Task
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className={`pl-7 h-8 text-sm transition-all ${searchExpanded || searchQuery ? "w-44" : "w-28"}`}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setSearchExpanded(true)}
            onBlur={() => !searchQuery && setSearchExpanded(false)}
            data-testid="input-search-tasks"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant={personFilter ? "default" : "ghost"} 
              size="sm" 
              className="gap-1.5"
              data-testid="button-person-filter"
            >
              <User className="h-3.5 w-3.5" />
              {personFilter ? (
                <span className="text-xs max-w-[80px] truncate">{personFilter}</span>
              ) : (
                "Person"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 p-0">
            <div className="p-2 border-b">
              <h4 className="font-medium text-sm">Filter by Person</h4>
            </div>
            <div className="max-h-48 overflow-auto p-1">
              <button
                className="flex items-center justify-between gap-2 w-full px-2 py-1.5 text-sm rounded-md hover-elevate"
                onClick={() => onPersonFilterChange?.(null)}
                data-testid="person-filter-all"
              >
                <span>All People</span>
                {!personFilter && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
              {uniqueAssignees.map(name => (
                <button
                  key={name}
                  className="flex items-center justify-between gap-2 w-full px-2 py-1.5 text-sm rounded-md hover-elevate"
                  onClick={() => onPersonFilterChange?.(name)}
                  data-testid={`person-filter-${name}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-medium text-primary">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="truncate">{name}</span>
                  </div>
                  {personFilter === name && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
              {uniqueAssignees.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No assignees found</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button 
          variant={filters.length > 0 ? "default" : "ghost"} 
          size="sm" 
          className="gap-1.5" 
          onClick={() => setFiltersPanelOpen(true)}
          data-testid="button-filter"
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
          {filters.length > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {filters.reduce((acc, g) => acc + g.conditions.length, 0)}
            </Badge>
          )}
        </Button>

        <Popover open={sortPopoverOpen} onOpenChange={setSortPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant={sorts.length > 0 ? "default" : "ghost"} size="sm" className="gap-1.5" data-testid="button-sort">
              <ArrowUpDown className="h-3.5 w-3.5" />
              Sort
              {sorts.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {sorts.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-0">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between gap-2">
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
            <Button variant={hiddenCount > 0 ? "default" : "ghost"} size="sm" className="gap-1.5" data-testid="button-hide-columns">
              <EyeOff className="h-3.5 w-3.5" />
              Hide
              {hiddenCount > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {hiddenCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-0">
            <div className="p-3 border-b">
              <h4 className="font-medium text-sm">Hide Columns</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {visibleCount} visible, {hiddenCount} hidden
              </p>
            </div>
            <div className="max-h-64 overflow-auto p-2">
              {sortedColumns.map((column, index) => (
                <div
                  key={column.id}
                  className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover-elevate group"
                >
                  <div className="flex items-center gap-1.5">
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
                  onClick={() => onOpenColumnCenter?.()}
                  data-testid="button-add-column"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Column Center
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant={groupBy !== "default" ? "default" : "ghost"} size="sm" className="gap-1.5" data-testid="button-group-by">
              <Layers className="h-3.5 w-3.5" />
              Group
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-2">
            <div className="space-y-1">
              <h4 className="font-medium text-sm px-2 py-1.5">Group by</h4>
              {GROUP_BY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className="flex items-center justify-between gap-2 w-full px-2 py-1.5 text-sm rounded-md hover-elevate"
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

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={allCollapsed ? onExpandAll : onCollapseAll}
          data-testid="button-collapse-expand-all"
        >
          <ChevronsUpDown className="h-3.5 w-3.5" />
          {allCollapsed ? "Expand All" : "Collapse All"}
        </Button>
      </div>

      <FiltersPanel
        open={filtersPanelOpen}
        onOpenChange={setFiltersPanelOpen}
        columns={board.columns}
        filters={filters}
        onFiltersChange={(newFilters) => onFiltersChange?.(newFilters)}
      />

    </div>
  );
}
