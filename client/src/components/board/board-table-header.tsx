import { Checkbox } from "@/components/ui/checkbox";
import { ColumnHeader } from "./column-header";
import { AddColumnPopover } from "./add-column-popover";
import type { ColumnDef, ColumnType } from "@shared/schema";

interface BoardTableHeaderProps {
  columns: ColumnDef[];
  onColumnSort?: (columnId: string, direction: "asc" | "desc") => void;
  onColumnFilter?: (columnId: string) => void;
  onColumnDuplicate?: (columnId: string) => void;
  onColumnRename?: (columnId: string, newTitle: string) => void;
  onColumnDelete?: (columnId: string) => void;
  onColumnHide?: (columnId: string) => void;
  onColumnChangeType?: (columnId: string, newType: ColumnType) => void;
  onColumnUpdateDescription?: (columnId: string, description: string) => void;
  onColumnAIAutofill?: (columnId: string) => void;
  currentSort?: { columnId: string; direction: "asc" | "desc" } | null;
  onOpenColumnCenter?: () => void;
  onAddColumn?: (type: ColumnType, title: string) => void;
  allSelected?: boolean;
  onSelectAll?: (selected: boolean) => void;
}

export function BoardTableHeader({
  columns,
  onColumnSort,
  onColumnFilter,
  onColumnDuplicate,
  onColumnRename,
  onColumnDelete,
  onColumnHide,
  onColumnChangeType,
  onColumnUpdateDescription,
  onColumnAIAutofill,
  currentSort,
  onOpenColumnCenter,
  onAddColumn,
  allSelected = false,
  onSelectAll,
}: BoardTableHeaderProps) {
  const visibleColumns = columns.filter((col) => col.visible).sort((a, b) => a.order - b.order);

  return (
    <div
      className="flex items-center gap-0 text-xs font-medium uppercase tracking-wider text-muted-foreground bg-muted/60 dark:bg-muted/30 border-b-2 border-border sticky top-0 z-50"
      style={{ minHeight: "36px" }}
      data-testid="board-table-header"
    >
      <div className="w-10 flex-shrink-0 sticky left-0 z-40 bg-muted/60 dark:bg-muted/30 flex items-center justify-center border-r border-border">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => onSelectAll?.(!!checked)}
          className="h-3.5 w-3.5"
          data-testid="checkbox-select-all"
        />
      </div>
      <div
        className="min-w-[200px] w-[280px] flex-shrink-0 px-3 flex items-center sticky left-10 z-40 bg-muted/60 dark:bg-muted/30 border-r border-border sticky-col-shadow"
      >
        Task
      </div>
      {visibleColumns.map((col) => (
        <div
          key={col.id}
          className="flex-shrink-0 border-r border-border"
          style={{ width: col.width, minWidth: col.width }}
          data-col-id={col.id}
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
            onAIAutofill={onColumnAIAutofill}
            currentSort={currentSort}
          />
        </div>
      ))}
      <div className="flex-shrink-0 w-10 flex items-center justify-center border-r border-border">
        {onAddColumn && onOpenColumnCenter ? (
          <AddColumnPopover
            onAddColumn={onAddColumn}
            onOpenMoreColumns={onOpenColumnCenter}
          />
        ) : (
          <div className="w-10" />
        )}
      </div>
    </div>
  );
}
