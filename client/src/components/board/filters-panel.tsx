import { useState } from "react";
import { Plus, X, Sparkles, Save, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ColumnDef, ColumnType } from "@shared/schema";

export type FilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "greater_than"
  | "less_than"
  | "equals"
  | "between";

export interface FilterCondition {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string | string[] | number | null;
}

export interface FilterGroup {
  id: string;
  logic: "and" | "or";
  conditions: FilterCondition[];
}

export interface SavedView {
  id: string;
  name: string;
  filters: FilterGroup[];
}

interface FiltersPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDef[];
  filters: FilterGroup[];
  onFiltersChange: (filters: FilterGroup[]) => void;
  savedViews?: SavedView[];
  onSaveView?: (name: string) => void;
  onLoadView?: (view: SavedView) => void;
  onDeleteView?: (viewId: string) => void;
}

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is: "is",
  is_not: "is not",
  contains: "contains",
  not_contains: "doesn't contain",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  greater_than: "greater than",
  less_than: "less than",
  equals: "equals",
  between: "between",
};

const OPERATORS_BY_TYPE: Record<ColumnType, FilterOperator[]> = {
  text: ["is", "is_not", "contains", "not_contains", "starts_with", "ends_with", "is_empty", "is_not_empty"],
  "long-text": ["contains", "not_contains", "is_empty", "is_not_empty"],
  status: ["is", "is_not"],
  priority: ["is", "is_not"],
  date: ["is", "is_not", "greater_than", "less_than", "is_empty", "is_not_empty"],
  person: ["is", "is_not", "is_empty", "is_not_empty"],
  progress: ["equals", "greater_than", "less_than"],
  timeline: ["is_empty", "is_not_empty"],
  files: ["is_empty", "is_not_empty"],
  time: ["equals", "greater_than", "less_than"],
  number: ["equals", "greater_than", "less_than", "is_empty", "is_not_empty"],
  numbers: ["equals", "greater_than", "less_than", "is_empty", "is_not_empty"],
  label: ["is", "is_not"],
  tags: ["contains", "not_contains", "is_empty", "is_not_empty"],
  checkbox: ["is", "is_not"],
  dropdown: ["is", "is_not", "is_empty", "is_not_empty"],
  email: ["is", "contains", "is_empty", "is_not_empty"],
  phone: ["is", "contains", "is_empty", "is_not_empty"],
  rating: ["equals", "greater_than", "less_than"],
  link: ["is_empty", "is_not_empty"],
  vote: ["equals", "greater_than", "less_than"],
  location: ["contains", "is_empty", "is_not_empty"],
  "world-clock": ["is", "is_not"],
  "item-id": ["is", "contains"],
  "creation-log": ["is_empty", "is_not_empty"],
  "last-updated": ["greater_than", "less_than"],
  "auto-number": ["equals", "greater_than", "less_than"],
  "progress-tracking": ["equals", "greater_than", "less_than"],
  button: ["is_empty", "is_not_empty"],
  dependency: ["is_empty", "is_not_empty"],
  week: ["is", "is_not", "is_empty", "is_not_empty"],
  formula: ["equals", "greater_than", "less_than"],
  country: ["is", "is_not"],
  "color-picker": ["is", "is_not"],
  "time-tracking": ["greater_than", "less_than"],
  hour: ["is", "greater_than", "less_than"],
  "date-status": ["is_empty", "is_not_empty"],
  "timeline-status": ["is_empty", "is_not_empty"],
  "timeline-numeric": ["is_empty", "is_not_empty"],
  "ai-improve": ["is_empty", "is_not_empty"],
  "ai-write": ["is_empty", "is_not_empty"],
  "ai-extract": ["is_empty", "is_not_empty"],
  "ai-summarize": ["is_empty", "is_not_empty"],
  "ai-translate": ["is_empty", "is_not_empty"],
  "ai-sentiment": ["is", "is_not"],
  "ai-categorize": ["is", "is_not"],
  approval: ["is", "is_not", "is_empty", "is_not_empty"],
};

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

export function FiltersPanel({
  open,
  onOpenChange,
  columns,
  filters,
  onFiltersChange,
  savedViews = [],
  onSaveView,
  onLoadView,
  onDeleteView,
}: FiltersPanelProps) {
  const [aiFilterEnabled, setAiFilterEnabled] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [newViewName, setNewViewName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const addFilterGroup = () => {
    const newGroup: FilterGroup = {
      id: generateId(),
      logic: "and",
      conditions: [
        {
          id: generateId(),
          columnId: columns[0]?.id || "",
          operator: "is",
          value: "",
        },
      ],
    };
    onFiltersChange([...filters, newGroup]);
  };

  const removeFilterGroup = (groupId: string) => {
    onFiltersChange(filters.filter((g) => g.id !== groupId));
  };

  const updateFilterGroup = (groupId: string, updates: Partial<FilterGroup>) => {
    onFiltersChange(
      filters.map((g) => (g.id === groupId ? { ...g, ...updates } : g))
    );
  };

  const addCondition = (groupId: string) => {
    const newCondition: FilterCondition = {
      id: generateId(),
      columnId: columns[0]?.id || "",
      operator: "is",
      value: "",
    };
    onFiltersChange(
      filters.map((g) =>
        g.id === groupId
          ? { ...g, conditions: [...g.conditions, newCondition] }
          : g
      )
    );
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    onFiltersChange(
      filters.map((g) =>
        g.id === groupId
          ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) }
          : g
      )
    );
  };

  const updateCondition = (
    groupId: string,
    conditionId: string,
    updates: Partial<FilterCondition>
  ) => {
    onFiltersChange(
      filters.map((g) =>
        g.id === groupId
          ? {
              ...g,
              conditions: g.conditions.map((c) =>
                c.id === conditionId ? { ...c, ...updates } : c
              ),
            }
          : g
      )
    );
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  const handleSaveView = () => {
    if (newViewName.trim() && onSaveView) {
      onSaveView(newViewName.trim());
      setNewViewName("");
      setShowSaveDialog(false);
    }
  };

  const getOperatorsForColumn = (columnId: string): FilterOperator[] => {
    const column = columns.find((c) => c.id === columnId);
    if (!column) return ["is", "is_not"];
    return OPERATORS_BY_TYPE[column.type] || ["is", "is_not"];
  };

  const activeFilterCount = filters.reduce(
    (acc, g) => acc + g.conditions.length,
    0
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <SheetTitle className="flex items-center gap-2">
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeFilterCount} active
                </Badge>
              )}
            </SheetTitle>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs text-muted-foreground"
                  data-testid="button-clear-filters"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Filter with AI</span>
            </div>
            <Switch
              checked={aiFilterEnabled}
              onCheckedChange={setAiFilterEnabled}
              data-testid="toggle-ai-filter"
            />
          </div>

          {aiFilterEnabled && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Describe what you want to filter
              </Label>
              <Input
                placeholder="e.g., Show tasks assigned to me that are overdue"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="text-sm"
                data-testid="input-ai-filter"
              />
              <Button
                size="sm"
                className="w-full"
                disabled={!aiPrompt.trim()}
                data-testid="button-apply-ai-filter"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Apply AI Filter
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {filters.map((group, groupIndex) => (
              <div
                key={group.id}
                className="border rounded-lg p-3 space-y-3 bg-card"
              >
                {groupIndex > 0 && (
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Select
                      value={group.logic}
                      onValueChange={(value: "and" | "or") =>
                        updateFilterGroup(group.id, { logic: value })
                      }
                    >
                      <SelectTrigger className="w-20 h-7 text-xs" data-testid={`filter-logic-${group.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="and">AND</SelectItem>
                        <SelectItem value="or">OR</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">
                      Match {group.logic === "and" ? "all" : "any"} of the following
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      onClick={() => removeFilterGroup(group.id)}
                      data-testid={`button-remove-group-${group.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {group.conditions.map((condition, condIndex) => (
                  <div key={condition.id} className="flex items-center gap-2">
                    {condIndex > 0 && (
                      <span className="text-xs text-muted-foreground w-10">
                        {group.logic.toUpperCase()}
                      </span>
                    )}
                    <Select
                      value={condition.columnId}
                      onValueChange={(value) =>
                        updateCondition(group.id, condition.id, { columnId: value })
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-xs" data-testid={`filter-column-${condition.id}`}>
                        <SelectValue placeholder="Column" />
                      </SelectTrigger>
                      <SelectContent>
                        {columns.map((col) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={condition.operator}
                      onValueChange={(value: FilterOperator) =>
                        updateCondition(group.id, condition.id, { operator: value })
                      }
                    >
                      <SelectTrigger className="w-32 h-8 text-xs" data-testid={`filter-operator-${condition.id}`}>
                        <SelectValue placeholder="Operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperatorsForColumn(condition.columnId).map((op) => (
                          <SelectItem key={op} value={op}>
                            {OPERATOR_LABELS[op]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {!["is_empty", "is_not_empty"].includes(condition.operator) && (
                      <Input
                        value={(condition.value as string) || ""}
                        onChange={(e) =>
                          updateCondition(group.id, condition.id, {
                            value: e.target.value,
                          })
                        }
                        placeholder="Value"
                        className="flex-1 h-8 text-xs"
                        data-testid={`filter-value-${condition.id}`}
                      />
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => removeCondition(group.id, condition.id)}
                      data-testid={`button-remove-condition-${condition.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => addCondition(group.id)}
                  data-testid={`button-add-condition-${group.id}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add condition
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={addFilterGroup}
              data-testid="button-add-filter-group"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add filter group
            </Button>
          </div>

          {savedViews.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-sm font-medium">Saved Views</Label>
              <div className="space-y-1">
                {savedViews.map((view) => (
                  <div
                    key={view.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate"
                  >
                    <button
                      className="text-sm text-left flex-1"
                      onClick={() => onLoadView?.(view)}
                      data-testid={`view-${view.id}`}
                    >
                      {view.name}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onDeleteView?.(view.id)}
                      data-testid={`button-delete-view-${view.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-4 space-y-2">
          {activeFilterCount > 0 && (
            <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  data-testid="button-save-view"
                >
                  <Save className="h-3 w-3 mr-1" />
                  Save as view
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3">
                <div className="space-y-2">
                  <Label className="text-sm">View name</Label>
                  <Input
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="My view"
                    className="text-sm h-8"
                    data-testid="input-view-name"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={handleSaveView}
                    disabled={!newViewName.trim()}
                    data-testid="button-confirm-save-view"
                  >
                    Save
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Button
            className="w-full"
            onClick={() => onOpenChange(false)}
            data-testid="button-apply-filters"
          >
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export interface SortOption {
  id: string;
  columnId: string;
  direction: "asc" | "desc";
}

interface SortPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDef[];
  sorts: SortOption[];
  onSortsChange: (sorts: SortOption[]) => void;
}

export function SortPanel({
  open,
  onOpenChange,
  columns,
  sorts,
  onSortsChange,
}: SortPanelProps) {
  const addSort = () => {
    const newSort: SortOption = {
      id: generateId(),
      columnId: columns[0]?.id || "",
      direction: "asc",
    };
    onSortsChange([...sorts, newSort]);
  };

  const removeSort = (sortId: string) => {
    onSortsChange(sorts.filter((s) => s.id !== sortId));
  };

  const updateSort = (sortId: string, updates: Partial<SortOption>) => {
    onSortsChange(
      sorts.map((s) => (s.id === sortId ? { ...s, ...updates } : s))
    );
  };

  const clearAllSorts = () => {
    onSortsChange([]);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span className="hidden" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm">Sort</h4>
            {sorts.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-6"
                onClick={clearAllSorts}
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
                onValueChange={(value) => updateSort(sort.id, { columnId: value })}
              >
                <SelectTrigger className="flex-1 h-8 text-xs" data-testid={`sort-column-${sort.id}`}>
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={sort.direction}
                onValueChange={(value: "asc" | "desc") =>
                  updateSort(sort.id, { direction: value })
                }
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
                className="h-6 w-6 flex-shrink-0"
                onClick={() => removeSort(sort.id)}
                data-testid={`button-remove-sort-${sort.id}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={addSort}
            data-testid="button-add-sort"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add sort
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
