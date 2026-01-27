import { LayoutGrid, MoreHorizontal, Search, Filter, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Board } from "@shared/schema";

interface BoardHeaderProps {
  board: Board;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddTask: () => void;
  onAddGroup: () => void;
  onEditBoard: () => void;
  onDeleteBoard: () => void;
}

export function BoardHeader({
  board,
  searchQuery,
  onSearchChange,
  onAddTask,
  onAddGroup,
  onEditBoard,
  onDeleteBoard,
}: BoardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 p-4 border-b">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-md"
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
