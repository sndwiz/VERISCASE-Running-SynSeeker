import { useState } from "react";
import { Search, X, Sparkles, Users, Zap, LayoutGrid, Hash, Type, Calendar, Flag, CheckSquare, Clock, Paperclip, BarChart3, TrendingUp, CalendarRange, Star, ThumbsUp, Mail, Phone, Link, MapPin, Globe, Tag, ChevronDown, Palette, Timer, GitBranch, AlignLeft, Layers, ListOrdered, RefreshCw, Calculator, FileText, Languages, FolderTree, Wand2, Scan, Smile, Plus, CheckCircle, MousePointerClick } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ColumnType, ColumnCategory } from "@shared/schema";

const COLUMN_ICON_MAP: Record<string, any> = {
  "type": Type,
  "align-left": AlignLeft,
  "circle-dot": CheckSquare,
  "calendar": Calendar,
  "users": Users,
  "trending-up": TrendingUp,
  "calendar-range": CalendarRange,
  "paperclip": Paperclip,
  "clock": Clock,
  "flag": Flag,
  "hash": Hash,
  "calculator": Calculator,
  "tag": Tag,
  "tags": Tag,
  "check-square": CheckSquare,
  "chevron-down": ChevronDown,
  "mail": Mail,
  "phone": Phone,
  "star": Star,
  "link": Link,
  "thumbs-up": ThumbsUp,
  "check-circle": CheckCircle,
  "map-pin": MapPin,
  "globe": Globe,
  "user-plus": Users,
  "refresh-cw": RefreshCw,
  "list-ordered": ListOrdered,
  "bar-chart-2": BarChart3,
  "square": MousePointerClick,
  "git-branch": GitBranch,
  "calendar-days": Calendar,
  "function-square": Calculator,
  "palette": Palette,
  "timer": Timer,
  "clock-4": Clock,
  "calendar-check": Calendar,
  "sparkles": Sparkles,
  "wand-2": Wand2,
  "scan": Scan,
  "file-text": FileText,
  "languages": Languages,
  "smile": Smile,
  "folder-tree": FolderTree,
};

interface ColumnTypeOption {
  type: ColumnType;
  label: string;
  icon: string;
  category: ColumnCategory;
  description: string;
}

const COLUMN_COLORS: Record<string, string> = {
  "status": "#22c55e",
  "priority": "#eab308",
  "label": "#a855f7",
  "person": "#3b82f6",
  "date": "#22c55e",
  "timeline": "#a855f7",
  "text": "#f43f5e",
  "long-text": "#ec4899",
  "number": "#eab308",
  "numbers": "#eab308",
  "files": "#06b6d4",
  "time": "#3b82f6",
  "progress": "#6366f1",
  "checkbox": "#eab308",
  "link": "#06b6d4",
  "world-clock": "#22c55e",
  "item-id": "#3b82f6",
  "phone": "#6366f1",
  "location": "#f43f5e",
  "tags": "#a855f7",
  "vote": "#22c55e",
  "approval": "#22c55e",
  "rating": "#6366f1",
  "dropdown": "#22c55e",
  "email": "#eab308",
  "creation-log": "#6366f1",
  "last-updated": "#f43f5e",
  "auto-number": "#eab308",
  "progress-tracking": "#a855f7",
  "button": "#6366f1",
  "dependency": "#6366f1",
  "week": "#eab308",
  "formula": "#6366f1",
  "country": "#22c55e",
  "color-picker": "#3b82f6",
  "time-tracking": "#eab308",
  "hour": "#eab308",
  "date-status": "#22c55e",
  "timeline-status": "#22c55e",
  "timeline-numeric": "#a855f7",
  "ai-improve": "#gradient",
  "ai-write": "#gradient",
  "ai-extract": "#gradient",
  "ai-summarize": "#gradient",
  "ai-translate": "#gradient",
  "ai-sentiment": "#gradient",
  "ai-categorize": "#gradient",
};

const COLUMN_OPTIONS: ColumnTypeOption[] = [
  { type: "status", label: "Status", icon: "circle-dot", category: "essentials", description: "Get an instant overview of where things stand" },
  { type: "priority", label: "Priority", icon: "flag", category: "essentials", description: "Prioritize tasks and focus on what's most important" },
  { type: "label", label: "Label", icon: "tag", category: "essentials", description: "Categorize and triage work with custom labels" },
  { type: "person", label: "People", icon: "users", category: "essentials", description: "Assign people to improve team work" },
  { type: "text", label: "Text", icon: "type", category: "essentials", description: "Add textual information e.g. addresses, names or keywords" },
  { type: "long-text", label: "Long text", icon: "align-left", category: "essentials", description: "Add large amounts of text without changing column width" },
  { type: "timeline", label: "Timeline", icon: "calendar-range", category: "essentials", description: "Visualize your item's duration, with a start and end date" },
  { type: "date", label: "Date", icon: "calendar", category: "essentials", description: "Add dates like deadlines to ensure you never drop the ball" },
  { type: "number", label: "Numbers", icon: "hash", category: "essentials", description: "Add revenue, costs, time estimations and more" },
  { type: "files", label: "Files", icon: "paperclip", category: "essentials", description: "Add files & docs to your item" },
  { type: "progress", label: "Progress tracking", icon: "trending-up", category: "essentials", description: "Show progress by combining status columns in a battery" },
  { type: "time", label: "Time", icon: "clock", category: "essentials", description: "Track time spent on tasks" },

  { type: "tags", label: "Tags", icon: "tags", category: "more", description: "Add tags to categorize items across multiple boards" },
  { type: "vote", label: "Vote", icon: "thumbs-up", category: "more", description: "Vote on an item e.g. pick a new feature or a favorite lunch place" },
  { type: "rating", label: "Rating", icon: "star", category: "more", description: "Rate or rank anything visually" },
  { type: "creation-log", label: "Creation log", icon: "user-plus", category: "more", description: "Add the item's creator and creation date automatically" },
  { type: "last-updated", label: "Last updated", icon: "refresh-cw", category: "more", description: "Add the person that last updated the item and the date" },
  { type: "auto-number", label: "Auto number", icon: "list-ordered", category: "more", description: "Number items according to their order in the group/board" },
  { type: "checkbox", label: "Checkbox", icon: "check-square", category: "more", description: "Check off items and see what's done at a glance" },
  { type: "link", label: "Link", icon: "link", category: "more", description: "Simply hyperlink to any website" },
  { type: "world-clock", label: "World clock", icon: "globe", category: "more", description: "Keep track of the time anywhere in the world" },
  { type: "item-id", label: "Item ID", icon: "hash", category: "more", description: "Show a unique ID for each item" },
  { type: "phone", label: "Phone", icon: "phone", category: "more", description: "Call your contacts directly from the board" },
  { type: "location", label: "Location", icon: "map-pin", category: "more", description: "Place multiple locations on a geographic map" },
  { type: "dropdown", label: "Dropdown", icon: "chevron-down", category: "more", description: "Create a dropdown list of options" },
  { type: "email", label: "Email", icon: "mail", category: "more", description: "Email team members and clients directly from your board" },
  { type: "approval", label: "Approval", icon: "check-circle", category: "more", description: "Track approval status for legal review workflows" },
  { type: "color-picker", label: "Color picker", icon: "palette", category: "more", description: "Manage a design system using a color palette" },
  { type: "time-tracking", label: "Time tracking", icon: "timer", category: "more", description: "Easily track time spent on each item, group, and board" },
  { type: "hour", label: "Hour", icon: "clock-4", category: "more", description: "Add times to manage and schedule tasks, shifts and more" },
  { type: "week", label: "Week", icon: "calendar-days", category: "more", description: "Select the week on which each item should be completed" },
  { type: "formula", label: "Formula", icon: "function-square", category: "more", description: "Use functions to manipulate data across multiple columns" },
  { type: "country", label: "Country", icon: "flag", category: "more", description: "Choose a country" },

  { type: "progress-tracking", label: "Progress tracking", icon: "bar-chart-2", category: "team-power-up", description: "Show progress by combining status columns in a battery" },
  { type: "button", label: "Button", icon: "square", category: "board-power-up", description: "Perform actions on items by clicking a button" },
  { type: "dependency", label: "Dependency", icon: "git-branch", category: "board-power-up", description: "Set up dependencies between items in the board" },

  { type: "date-status", label: "Date + Status", icon: "calendar-check", category: "combo", description: "Use the Date combo to see urgent & overdue assignments in a single date" },
  { type: "timeline-status", label: "Timeline + Status", icon: "calendar-range", category: "combo", description: "Use the Timeline combo to see urgent & overdue assignments in a time range" },
  { type: "timeline-numeric", label: "Timeline + Numeric", icon: "calendar-range", category: "combo", description: "Use the Timeline and Numeric combo to reflect duration changes" },

  { type: "ai-translate", label: "Translate", icon: "languages", category: "ai-powered", description: "Use AI to automatically translate a selected column" },
  { type: "ai-summarize", label: "Summarize", icon: "file-text", category: "ai-powered", description: "Automatically get a summarized version of your chosen input" },
  { type: "ai-categorize", label: "Assign labels", icon: "folder-tree", category: "ai-powered", description: "Use AI to automatically assign the relevant label to each item" },
  { type: "ai-sentiment", label: "Detect Sentiment", icon: "smile", category: "ai-powered", description: "Use AI to detect the sentiment of text" },
  { type: "ai-extract", label: "Extract from file", icon: "scan", category: "ai-powered", description: "Use AI to extract information from file" },
  { type: "ai-improve", label: "Improve text", icon: "sparkles", category: "ai-powered", description: "Automatically get an improved version of your chosen text" },
  { type: "ai-write", label: "Write with AI", icon: "wand-2", category: "ai-powered", description: "Automatically generate any type of output, tailored to your instructions" },
];

const CATEGORY_CONFIG: Record<ColumnCategory, { label: string; icon: any; color: string }> = {
  "essentials": { label: "Essentials", icon: LayoutGrid, color: "text-blue-500" },
  "more": { label: "More Columns", icon: Layers, color: "text-green-500" },
  "team-power-up": { label: "Team Power-Up", icon: Users, color: "text-purple-500" },
  "board-power-up": { label: "Board Power-Up", icon: Zap, color: "text-orange-500" },
  "combo": { label: "Combos", icon: Layers, color: "text-pink-500" },
  "ai-powered": { label: "AI-powered", icon: Sparkles, color: "text-violet-500" },
};

interface ColumnCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddColumn: (type: ColumnType, title: string) => void;
}

function ColumnIcon({ type, icon, size = "md" }: { type: string; icon: string; size?: "sm" | "md" | "lg" }) {
  const IconComponent = COLUMN_ICON_MAP[icon] || Hash;
  const color = COLUMN_COLORS[type] || "#6366f1";
  const isGradient = color === "#gradient";
  const sizeClasses = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const iconSizeClasses = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div
      className={`${sizeClasses} rounded-lg flex items-center justify-center shrink-0`}
      style={isGradient ? { background: "linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)" } : { backgroundColor: color }}
    >
      <IconComponent className={`${iconSizeClasses} text-white`} />
    </div>
  );
}

function EssentialColumnCard({ column, onAdd }: { column: ColumnTypeOption; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex items-start gap-3 p-3 rounded-md border hover-elevate text-left transition-all group"
      data-testid={`add-column-${column.type}`}
    >
      <ColumnIcon type={column.type} icon={column.icon} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm">{column.label}</p>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{column.description}</p>
      </div>
    </button>
  );
}

function ListColumnRow({ column, onAdd }: { column: ColumnTypeOption; onAdd: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-md border hover-elevate transition-all group"
      data-testid={`add-column-${column.type}`}
    >
      <ColumnIcon type={column.type} icon={column.icon} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{column.label}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{column.description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 text-xs"
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        data-testid={`button-add-column-${column.type}`}
      >
        Add to board
      </Button>
    </div>
  );
}

function ComboColumnCard({ column, onAdd }: { column: ColumnTypeOption; onAdd: () => void }) {
  const parts = column.label.split(" + ");
  const firstType = parts[0]?.toLowerCase() === "date" ? "date" : parts[0]?.toLowerCase() === "timeline" ? "timeline" : "date";
  const secondType = parts[1]?.toLowerCase() === "status" ? "status" : parts[1]?.toLowerCase() === "numeric" ? "number" : "status";
  const firstIcon = firstType === "date" ? "calendar" : "calendar-range";
  const secondIcon = secondType === "status" ? "circle-dot" : "hash";

  return (
    <div
      className="flex flex-col rounded-md border hover-elevate transition-all overflow-visible"
      data-testid={`add-column-${column.type}`}
    >
      <div className="flex items-center justify-center gap-3 py-6 px-4 bg-blue-50 dark:bg-blue-950/30 rounded-t-md">
        <ColumnIcon type={firstType} icon={firstIcon} size="lg" />
        <Plus className="h-5 w-5 text-muted-foreground" />
        <ColumnIcon type={secondType} icon={secondIcon} size="lg" />
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm">{column.label}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{column.description}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-3 text-xs"
          onClick={onAdd}
          data-testid={`button-add-column-${column.type}`}
        >
          Add to board
        </Button>
      </div>
    </div>
  );
}

function AIColumnRow({ column, onAdd }: { column: ColumnTypeOption; onAdd: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-md border hover-elevate transition-all group"
      data-testid={`add-column-${column.type}`}
    >
      <ColumnIcon type={column.type} icon={column.icon} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{column.label}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{column.description}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 text-xs"
        onClick={(e) => { e.stopPropagation(); onAdd(); }}
        data-testid={`button-add-column-${column.type}`}
      >
        Add to board
      </Button>
    </div>
  );
}

function PowerUpCard({ column, onAdd }: { column: ColumnTypeOption; onAdd: () => void }) {
  return (
    <div
      className="flex flex-col rounded-md border hover-elevate transition-all overflow-visible"
      data-testid={`add-column-${column.type}`}
    >
      <div className="p-4 flex items-center gap-3">
        <ColumnIcon type={column.type} icon={column.icon} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{column.label}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{column.description}</p>
        </div>
      </div>
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onAdd}
          data-testid={`button-add-column-${column.type}`}
        >
          Add to board
        </Button>
      </div>
    </div>
  );
}

export function ColumnCenter({ open, onOpenChange, onAddColumn }: ColumnCenterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ColumnCategory | "all">("all");

  const filteredColumns = COLUMN_OPTIONS.filter((col) => {
    const matchesSearch = col.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      col.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || col.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedColumns = filteredColumns.reduce((acc, col) => {
    if (!acc[col.category]) {
      acc[col.category] = [];
    }
    acc[col.category].push(col);
    return acc;
  }, {} as Record<string, ColumnTypeOption[]>);

  const handleAddColumn = (column: ColumnTypeOption) => {
    onAddColumn(column.type, column.label);
    onOpenChange(false);
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const categories: (ColumnCategory | "all")[] = ["all", "essentials", "more", "team-power-up", "board-power-up", "combo", "ai-powered"];

  const renderCategorySection = (category: ColumnCategory, columns: ColumnTypeOption[]) => {
    const config = CATEGORY_CONFIG[category];

    switch (category) {
      case "essentials":
        return (
          <div key={category} className="space-y-3" data-testid={`section-${category}`}>
            <h3 className="text-base font-semibold flex items-center gap-2">
              {config.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {columns.map((col) => (
                <EssentialColumnCard key={col.type} column={col} onAdd={() => handleAddColumn(col)} />
              ))}
            </div>
          </div>
        );

      case "more":
        return (
          <div key={category} className="space-y-3" data-testid={`section-${category}`}>
            <h3 className="text-base font-semibold flex items-center gap-2">
              {config.label}
            </h3>
            <div className="space-y-2">
              {columns.map((col) => (
                <ListColumnRow key={col.type} column={col} onAdd={() => handleAddColumn(col)} />
              ))}
            </div>
          </div>
        );

      case "combo":
        return (
          <div key={category} className="space-y-3" data-testid={`section-${category}`}>
            <h3 className="text-base font-semibold flex items-center gap-2">
              {config.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {columns.map((col) => (
                <ComboColumnCard key={col.type} column={col} onAdd={() => handleAddColumn(col)} />
              ))}
            </div>
          </div>
        );

      case "ai-powered":
        return (
          <div key={category} className="space-y-3" data-testid={`section-${category}`}>
            <h3 className="text-base font-semibold flex items-center gap-2">
              {config.label}
            </h3>
            <div className="space-y-2">
              {columns.map((col) => (
                <AIColumnRow key={col.type} column={col} onAdd={() => handleAddColumn(col)} />
              ))}
            </div>
          </div>
        );

      case "team-power-up":
      case "board-power-up":
        return (
          <div key={category} className="space-y-3" data-testid={`section-${category}`}>
            <h3 className="text-base font-semibold flex items-center gap-2">
              {config.label}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {columns.map((col) => (
                <PowerUpCard key={col.type} column={col} onAdd={() => handleAddColumn(col)} />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const categoryOrder: ColumnCategory[] = ["essentials", "more", "team-power-up", "board-power-up", "combo", "ai-powered"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0">
        <DialogHeader className="p-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Column Center
          </DialogTitle>
          <DialogDescription>
            Add columns to customize your board. Choose from essentials, power-ups, combos, and AI-powered columns.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pt-4 pb-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for a column type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-columns"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery("")}
                data-testid="button-clear-column-search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat;
              if (cat === "all") {
                return (
                  <Button
                    key={cat}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="text-xs"
                    data-testid="category-all"
                  >
                    All
                  </Button>
                );
              }
              const config = CATEGORY_CONFIG[cat];
              return (
                <Button
                  key={cat}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs gap-1 ${isActive ? "" : config.color}`}
                  data-testid={`category-${cat}`}
                >
                  <config.icon className="h-3 w-3" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[500px]">
          <div className="p-5 space-y-8">
            {categoryOrder.map((category) => {
              const columns = groupedColumns[category];
              if (!columns || columns.length === 0) return null;
              return renderCategorySection(category, columns);
            })}

            {filteredColumns.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">No columns found</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
