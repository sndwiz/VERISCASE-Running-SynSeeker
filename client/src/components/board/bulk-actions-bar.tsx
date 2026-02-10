import { Copy, Trash2, Archive, FileDown, X, Edit, FolderInput, Tag, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Group } from "@shared/schema";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onExport: () => void;
  onMoveTo?: (groupId: string) => void;
  groups?: Group[];
  onBulkEdit?: () => void;
  onBulkTag?: () => void;
}

export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onDuplicate,
  onDelete,
  onArchive,
  onExport,
  onMoveTo,
  groups = [],
  onBulkEdit,
  onBulkTag,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border shadow-lg animate-in slide-in-from-bottom-5"
      data-testid="bulk-actions-bar"
    >
      <div className="flex items-center gap-2 pr-3 border-r">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{selectedCount} selected</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearSelection}
          data-testid="button-clear-selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onDuplicate}
          data-testid="button-bulk-duplicate"
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
        </Button>

        {onMoveTo && groups.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                data-testid="button-bulk-move"
              >
                <FolderInput className="h-3.5 w-3.5" />
                Move to
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {groups.map((group) => (
                <DropdownMenuItem
                  key={group.id}
                  onClick={() => onMoveTo(group.id)}
                  data-testid={`move-to-${group.id}`}
                >
                  <div
                    className="w-3 h-3 rounded-sm mr-2"
                    style={{ backgroundColor: group.color }}
                  />
                  {group.title}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {onBulkEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onBulkEdit}
            data-testid="button-bulk-edit"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}

        {onBulkTag && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={onBulkTag}
            data-testid="button-bulk-tag"
          >
            <Tag className="h-3.5 w-3.5" />
            Tag
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onExport}
          data-testid="button-bulk-export"
        >
          <FileDown className="h-3.5 w-3.5" />
          Export
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onArchive}
          data-testid="button-bulk-archive"
        >
          <Archive className="h-3.5 w-3.5" />
          Archive
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={onDelete}
          data-testid="button-bulk-delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

