import { LayoutGrid, MoreHorizontal, Search, Filter, Plus, Columns, Eye, EyeOff, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Board, ColumnDef } from "@shared/schema";

interface BoardHeaderProps {
  board: Board;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddTask: () => void;
  onAddGroup: () => void;
  onEditBoard: () => void;
  onDeleteBoard: () => void;
  onToggleColumn?: (columnId: string, visible: boolean) => void;
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
}: BoardHeaderProps) {
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
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="pl-9 w-64"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="input-search-tasks"
            />
          </div>

          <Button variant="outline" size="icon" data-testid="button-filter">
            <Filter className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-columns">
                <Columns className="h-4 w-4 mr-2" />
                Columns
                <span className="ml-1 text-xs text-muted-foreground">({visibleCount})</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
              <div className="p-3 border-b">
                <h4 className="font-medium text-sm">Toggle Columns</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Show or hide columns in the board view
                </p>
              </div>
              <div className="max-h-64 overflow-auto p-2">
                {sortedColumns.map((column) => (
                  <div
                    key={column.id}
                    className="flex items-center justify-between py-2 px-2 rounded-md hover-elevate"
                  >
                    <span className="text-sm">{column.title}</span>
                    <Switch
                      checked={column.visible}
                      onCheckedChange={(checked) => onToggleColumn?.(column.id, checked)}
                      data-testid={`toggle-column-${column.id}`}
                    />
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>

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
