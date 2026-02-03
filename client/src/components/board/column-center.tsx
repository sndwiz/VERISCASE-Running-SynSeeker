import { useState } from "react";
import { Search, X, Sparkles, Users, Zap, LayoutGrid, Hash, Type, Calendar, Flag, CheckSquare, Clock, Paperclip, BarChart3, TrendingUp, CalendarRange, Star, ThumbsUp, Mail, Phone, Link, MapPin, Globe, Tag, ChevronDown, Palette, Timer, GitBranch, AlertCircle, AlignLeft, Layers, ListOrdered, RefreshCw, Calculator, FileText, Languages, FolderTree, Wand2, Scan, Smile } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
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
  "map-pin": MapPin,
  "globe": Globe,
  "user-plus": Users,
  "refresh-cw": RefreshCw,
  "list-ordered": ListOrdered,
  "bar-chart-2": BarChart3,
  "square": LayoutGrid,
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
  description?: string;
  color?: string; // Individual column color
}

// Individual column colors matching Monday.com style
const COLUMN_COLORS: Record<string, string> = {
  "status": "bg-emerald-500",
  "priority": "bg-red-500",
  "label": "bg-green-500",
  "person": "bg-yellow-400",
  "date": "bg-green-600",
  "timeline": "bg-green-500",
  "text": "bg-green-500",
  "long-text": "bg-pink-500",
  "number": "bg-yellow-500",
  "numbers": "bg-yellow-500",
  "files": "bg-blue-500",
  "time": "bg-blue-500",
  "progress": "bg-blue-600",
  "checkbox": "bg-purple-500",
  "link": "bg-teal-500",
  "world-clock": "bg-green-400",
  "item-id": "bg-blue-500",
  "phone": "bg-blue-400",
  "location": "bg-pink-500",
  "tags": "bg-purple-500",
  "vote": "bg-green-500",
  "approval": "bg-emerald-500",
  "rating": "bg-purple-500",
  "dropdown": "bg-teal-500",
  "email": "bg-amber-500",
  "creation-log": "bg-green-500",
  "last-updated": "bg-purple-500",
  "auto-number": "bg-purple-500",
  "progress-tracking": "bg-blue-600",
  "button": "bg-purple-500",
  "dependency": "bg-purple-500",
  "week": "bg-yellow-500",
  "formula": "bg-blue-500",
  "country": "bg-green-400",
  "color-picker": "bg-blue-500",
  "time-tracking": "bg-amber-500",
  "hour": "bg-blue-400",
  "ai-improve": "bg-gradient-to-br from-purple-500 to-pink-500",
  "ai-write": "bg-gradient-to-br from-purple-500 to-pink-500",
  "ai-extract": "bg-gradient-to-br from-purple-500 to-pink-500",
  "ai-summarize": "bg-gradient-to-br from-purple-500 to-pink-500",
  "ai-translate": "bg-gradient-to-br from-purple-500 to-pink-500",
  "ai-sentiment": "bg-gradient-to-br from-purple-500 to-pink-500",
  "ai-categorize": "bg-gradient-to-br from-purple-500 to-pink-500",
};

const COLUMN_OPTIONS: ColumnTypeOption[] = [
  // Essentials
  { type: "text", label: "Text", icon: "type", category: "essentials", description: "Add textual content" },
  { type: "long-text", label: "Long Text", icon: "align-left", category: "essentials", description: "Add longer text with formatting" },
  { type: "status", label: "Status", icon: "circle-dot", category: "essentials", description: "Track progress with statuses" },
  { type: "date", label: "Date", icon: "calendar", category: "essentials", description: "Set and track dates" },
  { type: "person", label: "People", icon: "users", category: "essentials", description: "Assign team members" },
  { type: "progress", label: "Progress", icon: "trending-up", category: "essentials", description: "Track completion percentage" },
  { type: "timeline", label: "Timeline", icon: "calendar-range", category: "essentials", description: "Set date ranges" },
  { type: "files", label: "Files", icon: "paperclip", category: "essentials", description: "Upload and manage files" },
  { type: "time", label: "Time", icon: "clock", category: "essentials", description: "Track time spent" },
  { type: "priority", label: "Priority", icon: "flag", category: "essentials", description: "Set priority levels" },
  { type: "number", label: "Numbers", icon: "hash", category: "essentials", description: "Add numeric values" },
  { type: "label", label: "Label", icon: "tag", category: "essentials", description: "Categorize with labels" },
  // More
  { type: "tags", label: "Tags", icon: "tags", category: "more", description: "Add multiple tags" },
  { type: "checkbox", label: "Checkbox", icon: "check-square", category: "more", description: "Simple yes/no toggle" },
  { type: "dropdown", label: "Dropdown", icon: "chevron-down", category: "more", description: "Select from options" },
  { type: "email", label: "Email", icon: "mail", category: "more", description: "Store email addresses" },
  { type: "phone", label: "Phone", icon: "phone", category: "more", description: "Store phone numbers" },
  { type: "rating", label: "Rating", icon: "star", category: "more", description: "Rate with stars" },
  { type: "link", label: "Link", icon: "link", category: "more", description: "Add URLs" },
  { type: "vote", label: "Vote", icon: "thumbs-up", category: "more", description: "Collect team votes" },
  { type: "approval", label: "Approval", icon: "check-square", category: "more", description: "Track approval status for legal review" },
  { type: "location", label: "Location", icon: "map-pin", category: "more", description: "Store locations" },
  { type: "world-clock", label: "World Clock", icon: "globe", category: "more", description: "Display time zones" },
  { type: "item-id", label: "Item ID", icon: "hash", category: "more", description: "Unique identifier" },
  // Team Power-Ups
  { type: "creation-log", label: "Creation Log", icon: "user-plus", category: "team-power-up", description: "Track item creator" },
  { type: "last-updated", label: "Last Updated", icon: "refresh-cw", category: "team-power-up", description: "Track modifications" },
  { type: "auto-number", label: "Auto Number", icon: "list-ordered", category: "team-power-up", description: "Sequential numbering" },
  { type: "progress-tracking", label: "Progress Tracking", icon: "bar-chart-2", category: "team-power-up", description: "Visual progress" },
  // Board Power-Ups
  { type: "button", label: "Button", icon: "square", category: "board-power-up", description: "Trigger actions" },
  { type: "dependency", label: "Dependency", icon: "git-branch", category: "board-power-up", description: "Link items" },
  { type: "week", label: "Week", icon: "calendar-days", category: "board-power-up", description: "Week scheduling" },
  { type: "formula", label: "Formula", icon: "function-square", category: "board-power-up", description: "Calculate values" },
  { type: "country", label: "Country", icon: "flag", category: "board-power-up", description: "Select countries" },
  { type: "color-picker", label: "Color Picker", icon: "palette", category: "board-power-up", description: "Choose colors" },
  { type: "time-tracking", label: "Time Tracking", icon: "timer", category: "board-power-up", description: "Log time" },
  { type: "hour", label: "Hour", icon: "clock-4", category: "board-power-up", description: "Time of day" },
  // AI-Powered
  { type: "ai-improve", label: "Improve Text", icon: "sparkles", category: "ai-powered", description: "AI text improvement" },
  { type: "ai-write", label: "Write with AI", icon: "wand-2", category: "ai-powered", description: "AI-generated content" },
  { type: "ai-extract", label: "Extract Info", icon: "scan", category: "ai-powered", description: "AI information extraction" },
  { type: "ai-summarize", label: "Summarize", icon: "file-text", category: "ai-powered", description: "AI-generated summaries" },
  { type: "ai-translate", label: "Translate", icon: "languages", category: "ai-powered", description: "AI translation" },
  { type: "ai-sentiment", label: "Detect Sentiment", icon: "smile", category: "ai-powered", description: "AI sentiment analysis" },
  { type: "ai-categorize", label: "Categorize", icon: "folder-tree", category: "ai-powered", description: "AI categorization" },
];

const CATEGORY_CONFIG: Record<ColumnCategory, { label: string; icon: any; color: string; bgColor: string }> = {
  "essentials": { label: "Essentials", icon: LayoutGrid, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  "more": { label: "More Columns", icon: Layers, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  "team-power-up": { label: "Team Power-Ups", icon: Users, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  "board-power-up": { label: "Board Power-Ups", icon: Zap, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  "combo": { label: "Combo", icon: Layers, color: "text-pink-600", bgColor: "bg-pink-100 dark:bg-pink-900/30" },
  "ai-powered": { label: "AI-Powered", icon: Sparkles, color: "text-violet-600", bgColor: "bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30" },
};

interface ColumnCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddColumn: (type: ColumnType, title: string) => void;
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
  }, {} as Record<ColumnCategory, ColumnTypeOption[]>);

  const handleAddColumn = (column: ColumnTypeOption) => {
    onAddColumn(column.type, column.label);
    onOpenChange(false);
    setSearchQuery("");
    setSelectedCategory("all");
  };

  const categories: (ColumnCategory | "all")[] = ["all", "essentials", "more", "team-power-up", "board-power-up", "ai-powered"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-primary" />
            Column Center
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Add columns to customize your board
          </p>
        </DialogHeader>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search columns..."
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
                    data-testid={`category-${cat}`}
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

        <ScrollArea className="flex-1 max-h-[400px]">
          <div className="p-4 space-y-6">
            {Object.entries(groupedColumns).map(([category, columns]) => {
              const config = CATEGORY_CONFIG[category as ColumnCategory];
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded ${config.bgColor}`}>
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <h3 className="font-medium text-sm">{config.label}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {columns.length}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {columns.map((column) => {
                      const IconComponent = COLUMN_ICON_MAP[column.icon] || Hash;
                      const columnColor = COLUMN_COLORS[column.type] || config.bgColor;
                      return (
                        <button
                          key={column.type}
                          onClick={() => handleAddColumn(column)}
                          className="flex items-start gap-3 p-3 rounded-lg border hover-elevate text-left transition-all group"
                          data-testid={`add-column-${column.type}`}
                        >
                          <div className={`p-2 rounded-lg ${columnColor} shrink-0`}>
                            <IconComponent className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                              {column.label}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {column.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredColumns.length === 0 && (
              <div className="text-center py-8">
                <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No columns found matching "{searchQuery}"</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
