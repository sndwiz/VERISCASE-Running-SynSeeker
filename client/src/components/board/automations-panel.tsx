import { useState, useEffect, useMemo } from "react";
import {
  Zap, Plus, X, Loader2, Search, Sparkles, Mail, MessageSquare, Bell,
  ArrowDown, MoreHorizontal, ChevronDown, ArrowRight, Users, Calendar,
  Clock, Hash, Archive, Trash2, Copy, Layers, BarChart3, GitBranch,
  FileText, User, UserPlus, Type, CheckSquare, Square, Tag, Send,
  Play, Pause, Circle, AlertCircle, Activity, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Board, ColumnDef, Group } from "@shared/schema";

interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerField?: string;
  triggerValue?: string;
  actionType: string;
  actionConfig: Record<string, any>;
  isActive: boolean;
  runCount?: number;
  lastRun?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface TriggerDef {
  id: string;
  label: string;
  icon: typeof Zap;
  color: string;
  category: string;
  sentence: string;
  configFields?: ConfigField[];
}

interface ActionDef {
  id: string;
  label: string;
  icon: typeof Zap;
  color: string;
  category: string;
  sentence: string;
  configFields?: ConfigField[];
}

interface ConfigField {
  key: string;
  type: "column" | "status_value" | "group" | "board" | "text" | "person";
  label: string;
}

const TRIGGER_CATEGORIES = [
  { id: "most_used", label: "Most used" },
  { id: "column_change", label: "Column change" },
  { id: "item_moved", label: "Item moved or changed" },
  { id: "subitem", label: "Subitem" },
  { id: "recurring", label: "Recurring" },
  { id: "ai_powered", label: "AI-powered" },
];

const TRIGGERS: TriggerDef[] = [
  { id: "status_changed", label: "status changes to something", icon: CheckSquare, color: "bg-amber-500", category: "most_used", sentence: "When {column} changes to {value}", configFields: [{ key: "triggerField", type: "column", label: "status" }, { key: "triggerValue", type: "status_value", label: "something" }] },
  { id: "item_created", label: "item created", icon: Plus, color: "bg-green-500", category: "most_used", sentence: "When an item is created", configFields: [] },
  { id: "column_changed", label: "column changes", icon: Square, color: "bg-blue-500", category: "most_used", sentence: "When {column} changes", configFields: [{ key: "triggerField", type: "column", label: "column" }] },
  { id: "due_date_approaching", label: "date arrives", icon: Calendar, color: "bg-teal-500", category: "most_used", sentence: "When {column} arrives", configFields: [{ key: "triggerField", type: "column", label: "date" }] },
  { id: "schedule", label: "every time period", icon: Clock, color: "bg-purple-500", category: "most_used", sentence: "Every time period" },
  { id: "button_clicked", label: "button clicked", icon: Square, color: "bg-yellow-500", category: "column_change", sentence: "When button is clicked" },
  { id: "person_assigned", label: "person assigned", icon: User, color: "bg-green-600", category: "column_change", sentence: "When a person is assigned", configFields: [{ key: "triggerField", type: "column", label: "person column" }] },
  { id: "email_activity", label: "email changes", icon: Mail, color: "bg-blue-600", category: "column_change", sentence: "When an email changes" },
  { id: "update_created", label: "update created", icon: MessageSquare, color: "bg-violet-500", category: "item_moved", sentence: "When an update is created" },
  { id: "name_changed", label: "item name changed", icon: Type, color: "bg-pink-500", category: "item_moved", sentence: "When item name changes" },
  { id: "item_moved_to_group", label: "item moved to group", icon: ArrowRight, color: "bg-orange-500", category: "item_moved", sentence: "When item is moved to {group}", configFields: [{ key: "triggerValue", type: "group", label: "group" }] },
  { id: "item_moved", label: "item moved to board", icon: ArrowRight, color: "bg-orange-500", category: "item_moved", sentence: "When item is moved to this board" },
  { id: "subitem_created", label: "subitem created", icon: Plus, color: "bg-amber-600", category: "subitem", sentence: "When a subitem is created" },
  { id: "due_date_passed", label: "date has passed", icon: AlertCircle, color: "bg-green-700", category: "recurring", sentence: "When {column} has passed", configFields: [{ key: "triggerField", type: "column", label: "date" }] },
  { id: "ai_detect_language", label: "Detect language with AI", icon: Sparkles, color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", category: "ai_powered", sentence: "When language is detected by AI" },
];

const ACTION_CATEGORIES = [
  { id: "most_used", label: "Most used" },
  { id: "featured", label: "Featured" },
  { id: "item", label: "Item" },
  { id: "item_actions", label: "Item actions" },
  { id: "assign", label: "Assign" },
  { id: "date_time", label: "Date and time" },
  { id: "numbers", label: "Numbers" },
  { id: "board_group", label: "Board and group" },
  { id: "ai_powered", label: "AI-powered" },
];

const ACTIONS: ActionDef[] = [
  { id: "move_to_group", label: "move item to group", icon: ArrowRight, color: "bg-orange-500", category: "most_used", sentence: "move item to {group}", configFields: [{ key: "targetGroup", type: "group", label: "group" }] },
  { id: "send_notification", label: "notify", icon: Bell, color: "bg-yellow-500", category: "most_used", sentence: "notify {person}", configFields: [{ key: "notifyPerson", type: "person", label: "person" }] },
  { id: "change_status", label: "change status", icon: CheckSquare, color: "bg-blue-500", category: "most_used", sentence: "set {column} to {value}", configFields: [{ key: "targetColumn", type: "column", label: "status" }, { key: "targetValue", type: "status_value", label: "something" }] },
  { id: "create_subtask", label: "create subitem", icon: Plus, color: "bg-green-500", category: "most_used", sentence: "create a subitem" },
  { id: "set_date", label: "set date", icon: Calendar, color: "bg-teal-500", category: "most_used", sentence: "set {column} to today", configFields: [{ key: "targetColumn", type: "column", label: "date column" }] },
  { id: "ai_categorize", label: "Assign label with AI", icon: Sparkles, color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", category: "featured", sentence: "assign label with AI to {column}", configFields: [{ key: "targetColumn", type: "column", label: "column" }] },
  { id: "ai_summarize", label: "Summarize text with AI", icon: Sparkles, color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", category: "featured", sentence: "summarize text with AI into {column}", configFields: [{ key: "targetColumn", type: "column", label: "column" }] },
  { id: "create_connect", label: "create item in board & connect boards", icon: Plus, color: "bg-green-600", category: "item", sentence: "create item in {board} and connect boards", configFields: [{ key: "targetBoard", type: "board", label: "board" }] },
  { id: "create_item", label: "create item in board", icon: Plus, color: "bg-green-500", category: "item", sentence: "create item in {board}", configFields: [{ key: "targetBoard", type: "board", label: "board" }] },
  { id: "move_item", label: "move item to board", icon: ArrowRight, color: "bg-orange-500", category: "item", sentence: "move item to {board}", configFields: [{ key: "targetBoard", type: "board", label: "board" }] },
  { id: "create_item_same", label: "create item", icon: Plus, color: "bg-green-500", category: "item", sentence: "create an item in this board" },
  { id: "duplicate_item", label: "duplicate item", icon: Copy, color: "bg-gray-500", category: "item", sentence: "duplicate item" },
  { id: "archive_item", label: "archive item", icon: Archive, color: "bg-green-700", category: "item_actions", sentence: "archive item" },
  { id: "delete_item", label: "delete item", icon: Trash2, color: "bg-red-500", category: "item_actions", sentence: "delete item" },
  { id: "create_update", label: "create update", icon: MessageSquare, color: "bg-blue-600", category: "item_actions", sentence: "create an update" },
  { id: "clear_column", label: "clear column", icon: Square, color: "bg-blue-500", category: "item_actions", sentence: "clear {column}", configFields: [{ key: "targetColumn", type: "column", label: "column" }] },
  { id: "assign_person", label: "assign person", icon: User, color: "bg-green-600", category: "assign", sentence: "assign {person}", configFields: [{ key: "targetPerson", type: "person", label: "person" }] },
  { id: "assign_creator", label: "assign creator", icon: UserPlus, color: "bg-green-600", category: "assign", sentence: "assign creator as person" },
  { id: "assign_team", label: "assign team", icon: Users, color: "bg-green-600", category: "assign", sentence: "assign team" },
  { id: "clear_assignees", label: "clear assignees", icon: Users, color: "bg-green-600", category: "assign", sentence: "clear assignees" },
  { id: "push_date", label: "push date", icon: Calendar, color: "bg-teal-600", category: "date_time", sentence: "push {column} by some days", configFields: [{ key: "targetColumn", type: "column", label: "date column" }] },
  { id: "time_tracking_start", label: "start time tracking", icon: Play, color: "bg-teal-500", category: "date_time", sentence: "start time tracking" },
  { id: "time_tracking_stop", label: "stop time tracking", icon: Pause, color: "bg-teal-500", category: "date_time", sentence: "stop time tracking" },
  { id: "set_hour_current", label: "set hour to current time", icon: Clock, color: "bg-teal-500", category: "date_time", sentence: "set hour to current time" },
  { id: "set_number", label: "set number to", icon: Hash, color: "bg-blue-500", category: "numbers", sentence: "set {column} to a number", configFields: [{ key: "targetColumn", type: "column", label: "number column" }] },
  { id: "change_number", label: "Increase / decrease number value", icon: BarChart3, color: "bg-blue-600", category: "numbers", sentence: "increase/decrease {column}", configFields: [{ key: "targetColumn", type: "column", label: "number column" }] },
  { id: "create_board_template", label: "create board from template", icon: Plus, color: "bg-green-500", category: "board_group", sentence: "create board from template" },
  { id: "create_group", label: "create group", icon: Plus, color: "bg-green-500", category: "board_group", sentence: "create a group" },
  { id: "duplicate_group", label: "duplicate group", icon: Copy, color: "bg-gray-500", category: "board_group", sentence: "duplicate group" },
  { id: "ai_fill", label: "Custom AI prompt", icon: Sparkles, color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", category: "ai_powered", sentence: "run custom AI prompt on {column}", configFields: [{ key: "targetColumn", type: "column", label: "column" }] },
  { id: "ai_language", label: "Detect language with AI", icon: Sparkles, color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", category: "ai_powered", sentence: "detect language with AI in {column}", configFields: [{ key: "targetColumn", type: "column", label: "column" }] },
  { id: "ai_sentiment", label: "Detect sentiment with AI", icon: Sparkles, color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", category: "ai_powered", sentence: "detect sentiment with AI in {column}", configFields: [{ key: "targetColumn", type: "column", label: "column" }] },
  { id: "ai_extract", label: "Extract with AI", icon: Sparkles, color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", category: "ai_powered", sentence: "extract info with AI from {column}", configFields: [{ key: "targetColumn", type: "column", label: "column" }] },
  { id: "ai_improve", label: "Improve text with AI", icon: Sparkles, color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", category: "ai_powered", sentence: "improve text with AI in {column}", configFields: [{ key: "targetColumn", type: "column", label: "column" }] },
  { id: "ai_translate", label: "Translate text with AI", icon: Sparkles, color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", category: "ai_powered", sentence: "translate text with AI in {column}", configFields: [{ key: "targetColumn", type: "column", label: "column" }] },
  { id: "ai_write", label: "Write with AI", icon: Sparkles, color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", category: "ai_powered", sentence: "write with AI into {column}", configFields: [{ key: "targetColumn", type: "column", label: "column" }] },
];

function TriggerIcon({ trigger, size = "sm" }: { trigger: TriggerDef; size?: "sm" | "md" }) {
  const Icon = trigger.icon;
  const sizeClass = size === "md" ? "w-7 h-7 p-1" : "w-5 h-5 p-0.5";
  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div className={`${sizeClass} rounded-md ${trigger.color} flex items-center justify-center shrink-0`}>
      <Icon className={`${iconSize} text-white`} />
    </div>
  );
}

function ActionIcon({ action, size = "sm" }: { action: ActionDef; size?: "sm" | "md" }) {
  const Icon = action.icon;
  const sizeClass = size === "md" ? "w-7 h-7 p-1" : "w-5 h-5 p-0.5";
  const iconSize = size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  return (
    <div className={`${sizeClass} rounded-md ${action.color} flex items-center justify-center shrink-0`}>
      <Icon className={`${iconSize} text-white`} />
    </div>
  );
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

function buildSentence(trigger?: TriggerDef, action?: ActionDef, config?: Record<string, any>): string {
  let sentence = "";
  if (trigger) {
    sentence = "When " + trigger.label;
  }
  if (action) {
    sentence += " " + action.sentence;
  }
  return sentence;
}

function ColumnSelector({ columns, value, onChange, label, onCreateColumn }: {
  columns: ColumnDef[];
  value?: string;
  onChange: (colId: string) => void;
  label: string;
  onCreateColumn?: (name: string, type: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newColName, setNewColName] = useState("");
  const selectedCol = columns.find(c => c.id === value);

  const inferredType = label.toLowerCase().includes("date") ? "date"
    : label.toLowerCase().includes("number") ? "number"
    : label.toLowerCase().includes("status") ? "status"
    : label.toLowerCase().includes("person") ? "person"
    : "text";

  return (
    <span data-selector="column" onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setShowCreate(false); setNewColName(""); } }}>
        <PopoverTrigger asChild>
          <button className="text-primary underline decoration-dotted underline-offset-4 font-semibold cursor-pointer" data-testid="button-select-column">
            {selectedCol?.title || label}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          {showCreate ? (
            <div className="space-y-2 p-1">
              <p className="text-xs text-muted-foreground px-1">Create a new {inferredType} column</p>
              <Input
                placeholder="Column name..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newColName.trim() && onCreateColumn) {
                    onCreateColumn(newColName.trim(), inferredType);
                    setNewColName("");
                    setShowCreate(false);
                    setOpen(false);
                  }
                }}
                data-testid="input-new-column-name"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={!newColName.trim()} onClick={() => {
                  if (onCreateColumn && newColName.trim()) {
                    onCreateColumn(newColName.trim(), inferredType);
                    setNewColName("");
                    setShowCreate(false);
                    setOpen(false);
                  }
                }} data-testid="button-confirm-create-column">
                  Create
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)} data-testid="button-cancel-create-column">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2 px-2">Select a column</p>
              <div className="space-y-0.5">
                {columns.map(col => (
                  <button
                    key={col.id}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover-elevate"
                    onClick={() => { onChange(col.id); setOpen(false); }}
                    data-testid={`column-option-${col.id}`}
                  >
                    <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
                    {col.title}
                  </button>
                ))}
              </div>
              {onCreateColumn && (
                <button
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover-elevate mt-1 border-t pt-2 text-primary"
                  onClick={() => setShowCreate(true)}
                  data-testid="button-create-new-column"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create new column
                </button>
              )}
            </>
          )}
        </PopoverContent>
      </Popover>
    </span>
  );
}

function GroupSelector({ groups, value, onChange, label }: {
  groups: Group[];
  value?: string;
  onChange: (groupId: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedGroup = groups.find(g => g.id === value);
  return (
    <span data-selector="group" onClick={(e) => e.stopPropagation()}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-primary underline decoration-dotted underline-offset-4 font-semibold cursor-pointer" data-testid="button-select-group">
          {selectedGroup?.title || label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <p className="text-xs text-muted-foreground mb-2 px-2">Select a group</p>
        <div className="space-y-0.5">
          {groups.map(group => (
            <button
              key={group.id}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover-elevate"
              onClick={() => { onChange(group.id); setOpen(false); }}
              data-testid={`group-option-${group.id}`}
            >
              <Circle className="h-3 w-3" style={{ color: group.color }} />
              {group.title}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
    </span>
  );
}

function BoardSelector({ boards, value, onChange, label }: {
  boards: Board[];
  value?: string;
  onChange: (boardId: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedBoard = boards.find(b => b.id === value);
  const filtered = boards.filter(b => b.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <span data-selector="board" onClick={(e) => e.stopPropagation()}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-primary underline decoration-dotted underline-offset-4 font-semibold cursor-pointer" data-testid="button-select-board">
          {selectedBoard?.name || label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          placeholder="Search board"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
          data-testid="input-search-board"
        />
        <ScrollArea className="max-h-48">
          <div className="space-y-0.5">
            {filtered.map(board => (
              <button
                key={board.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover-elevate"
                onClick={() => { onChange(board.id); setOpen(false); }}
                data-testid={`board-option-${board.id}`}
              >
                <div className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: board.color || "#6366f1" }}>
                  {board.name.charAt(0).toUpperCase()}
                </div>
                {board.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
    </span>
  );
}

function StatusValueSelector({ columns, columnId, value, onChange, label }: {
  columns: ColumnDef[];
  columnId?: string;
  value?: string;
  onChange: (val: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const col = columns.find(c => c.id === columnId);
  const options = col?.options || col?.statusLabels?.map(l => l.label) || [];
  return (
    <span data-selector="status_value" onClick={(e) => e.stopPropagation()}>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="text-green-400 underline decoration-dotted underline-offset-4 font-semibold cursor-pointer" data-testid="button-select-status-value">
          {value || label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        {!columnId ? (
          <p className="text-xs text-muted-foreground px-2 py-1">Select a status column first</p>
        ) : options.length === 0 ? (
          <div className="space-y-1 p-1">
            <p className="text-xs text-muted-foreground px-1">Type a value</p>
            <Input
              placeholder="Enter value..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onChange((e.target as HTMLInputElement).value);
                  setOpen(false);
                }
              }}
              data-testid="input-status-value"
            />
          </div>
        ) : (
          <div className="space-y-0.5">
            {options.map(opt => (
              <button
                key={opt}
                className="w-full text-left px-2 py-1.5 rounded-md text-sm hover-elevate"
                onClick={() => { onChange(opt); setOpen(false); }}
                data-testid={`status-option-${opt}`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
    </span>
  );
}

function InlineSentence({ trigger, action, config, setConfig, columns, groups, boards, onSentenceClick, onCreateColumn }: {
  trigger?: TriggerDef;
  action?: ActionDef;
  config: Record<string, any>;
  setConfig: (c: Record<string, any>) => void;
  columns: ColumnDef[];
  groups: Group[];
  boards: Board[];
  onSentenceClick?: () => void;
  onCreateColumn?: (name: string, type: string) => void;
}) {
  if (!trigger && !action) return null;

  const renderConfiguredSentence = (def: TriggerDef | ActionDef, prefix: string) => {
    const fields = def.configFields || [];
    const usedFieldKeys = new Set<string>();
    const TOKEN_TYPE_MAP: Record<string, string> = {
      column: "column",
      value: "status_value",
      group: "group",
      board: "board",
      person: "person",
    };
    const parts = def.sentence.split(/(\{[^}]+\})/g);
    return parts.map((part, i) => {
      const match = part.match(/^\{(\w+)\}$/);
      if (!match) return <span key={i}>{part}</span>;
      const token = match[1];
      const expectedType = TOKEN_TYPE_MAP[token];
      const field = fields.find(f => f.label === token || f.key === token)
        || (expectedType ? fields.find(f => f.type === expectedType && !usedFieldKeys.has(f.key)) : undefined);
      if (!field) return <span key={i} className="font-semibold">{token}</span>;
      usedFieldKeys.add(field.key);

      if (field.type === "column") {
        return (
          <ColumnSelector
            key={i}
            columns={columns}
            value={config[field.key]}
            onChange={(v) => setConfig({ ...config, [field.key]: v })}
            label={field.label}
            onCreateColumn={onCreateColumn}
          />
        );
      }
      if (field.type === "status_value") {
        const usedColumnKeys = Array.from(usedFieldKeys).filter(k => fields.find(f => f.key === k && f.type === "column"));
        const pairedColKey = usedColumnKeys.length > 0
          ? usedColumnKeys[usedColumnKeys.length - 1]
          : fields.find(f => f.type === "column")?.key;
        return (
          <StatusValueSelector
            key={i}
            columns={columns}
            columnId={pairedColKey ? config[pairedColKey] : undefined}
            value={config[field.key]}
            onChange={(v) => setConfig({ ...config, [field.key]: v })}
            label={field.label}
          />
        );
      }
      if (field.type === "group") {
        return (
          <GroupSelector
            key={i}
            groups={groups}
            value={config[field.key]}
            onChange={(v) => setConfig({ ...config, [field.key]: v })}
            label={field.label}
          />
        );
      }
      if (field.type === "board") {
        return (
          <BoardSelector
            key={i}
            boards={boards}
            value={config[field.key]}
            onChange={(v) => setConfig({ ...config, [field.key]: v })}
            label={field.label}
          />
        );
      }
      return <span key={i} className="text-primary underline font-semibold">{field.label}</span>;
    });
  };

  const handleSentenceTextClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-selector]')) return;
    onSentenceClick?.();
  };

  return (
    <div className="space-y-4">
      {trigger && (
        <p
          className={`text-xl font-light ${onSentenceClick ? "cursor-pointer" : ""}`}
          data-testid="text-trigger-sentence"
          onClick={handleSentenceTextClick}
        >
          {trigger.configFields && trigger.configFields.length > 0
            ? <>When {renderConfiguredSentence(trigger, "trigger")}</>
            : <>{trigger.sentence.startsWith("When") ? trigger.sentence : `When ${trigger.label}`}</>
          }
        </p>
      )}
      {trigger && action && (
        <div className="flex items-center gap-2">
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      {action && (
        <p
          className={`text-xl font-light ${onSentenceClick ? "cursor-pointer" : ""}`}
          data-testid="text-action-sentence"
          onClick={handleSentenceTextClick}
        >
          Then {action.configFields && action.configFields.length > 0
            ? renderConfiguredSentence(action, "action")
            : action.sentence
          }
        </p>
      )}
    </div>
  );
}

interface AutomationRun {
  id: string;
  ruleId: string;
  boardId?: string;
  taskId?: string;
  taskTitle?: string;
  triggerType?: string;
  actionType?: string;
  ruleName?: string;
  explanation?: string;
  conditionsEvaluated?: any[];
  fieldsChanged?: any[];
  status: string;
  error?: string;
  executedAt: string;
  completedAt?: string;
}

function RunHistoryPanel({ boardId }: { boardId: string }) {
  const { data: runs = [], isLoading } = useQuery<AutomationRun[]>({
    queryKey: [`/api/boards/${boardId}/automation-runs?limit=50`],
    refetchInterval: 15000,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        <Activity className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">No automation runs yet.</p>
        <p className="text-muted-foreground text-xs">Runs will appear here as automations fire on this board.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-2 p-1">
        {runs.map(run => (
          <Card key={run.id} className={`${run.status === "failed" ? "border-destructive/40" : ""}`} data-testid={`card-automation-run-${run.id}`}>
            <CardContent className="p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  {run.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  ) : run.status === "failed" ? (
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-medium truncate" data-testid={`text-run-rule-${run.id}`}>{run.ruleName || "Unknown Rule"}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0" data-testid={`text-run-time-${run.id}`}>
                  {run.executedAt ? formatRelativeTime(run.executedAt) : ""}
                </span>
              </div>

              {run.explanation && (
                <p className="text-xs text-muted-foreground leading-relaxed pl-6" data-testid={`text-run-explanation-${run.id}`}>{run.explanation}</p>
              )}

              {run.taskTitle && (
                <div className="flex items-center gap-1.5 pl-6">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground" data-testid={`text-run-task-${run.id}`}>{run.taskTitle}</span>
                </div>
              )}

              {run.fieldsChanged && (run.fieldsChanged as any[]).length > 0 && (
                <div className="flex flex-wrap gap-1 pl-6">
                  {(run.fieldsChanged as any[]).map((fc: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs" data-testid={`badge-field-change-${run.id}-${i}`}>
                      {fc.field} {fc.newValue ? `\u2192 ${fc.newValue}` : ""}
                    </Badge>
                  ))}
                </div>
              )}

              {run.error && (
                <p className="text-xs text-destructive pl-6" data-testid={`text-run-error-${run.id}`}>{run.error}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export interface AutomationPrefill {
  triggerId?: string;
  actionId?: string;
  config?: Record<string, any>;
}

interface AutomationsPanelProps {
  boardId: string;
  open: boolean;
  onClose: () => void;
  prefill?: AutomationPrefill | null;
}

type PanelView = "list" | "builder";
type BuilderStep = "idle" | "selecting_trigger" | "selecting_action" | "configuring";

export function AutomationsPanel({ boardId, open, onClose, prefill }: AutomationsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<PanelView>("list");
  const [activeTab, setActiveTab] = useState<"automations" | "run_history">("automations");
  const [searchQuery, setSearchQuery] = useState("");
  const [triggerSearch, setTriggerSearch] = useState("");
  const [actionSearch, setActionSearch] = useState("");

  const [builderStep, setBuilderStep] = useState<BuilderStep>("idle");
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerDef | undefined>();
  const [selectedAction, setSelectedAction] = useState<ActionDef | undefined>();
  const [builderConfig, setBuilderConfig] = useState<Record<string, any>>({});
  const [dryRunResult, setDryRunResult] = useState<{
    matchCount: number;
    matches: Array<{ taskId: string; taskTitle: string; predictedChanges: any[] }>;
    conflicts: Array<{ ruleId: string; ruleName: string; type: string; description: string }>;
  } | null>(null);
  const [showDryRun, setShowDryRun] = useState(false);

  const dryRunMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTrigger || !selectedAction) throw new Error("Select trigger and action first");
      const res = await apiRequest("POST", `/api/boards/${boardId}/automations/dry-run`, {
        triggerType: selectedTrigger.id,
        triggerField: builderConfig.targetColumn || null,
        triggerValue: builderConfig.targetValue || null,
        actionType: selectedAction.id,
        actionConfig: builderConfig,
        conditions: [],
      });
      return res.json();
    },
    onSuccess: (data) => {
      setDryRunResult(data);
      setShowDryRun(true);
    },
    onError: () => {
      toast({ title: "Dry run failed", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (open && prefill) {
      const trigger = prefill.triggerId ? TRIGGERS.find(t => t.id === prefill.triggerId) : undefined;
      const action = prefill.actionId ? ACTIONS.find(a => a.id === prefill.actionId) : undefined;
      setSelectedTrigger(trigger);
      setSelectedAction(action);
      setBuilderConfig(prefill.config || {});
      setView("builder");
      if (trigger && action) {
        setBuilderStep("configuring");
      } else if (trigger && !action) {
        setBuilderStep("selecting_action");
      } else if (!trigger && action) {
        setBuilderStep("selecting_trigger");
      } else {
        setBuilderStep("idle");
      }
    } else if (open) {
      setView("list");
      setActiveTab("automations");
    }
  }, [open, prefill]);

  const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/boards", boardId, "automations"],
    enabled: open && !!boardId,
  });

  const { data: board } = useQuery<Board>({
    queryKey: ["/api/boards", boardId],
    enabled: open && !!boardId,
  });

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ["/api/boards", boardId, "groups"],
    enabled: open && !!boardId,
  });

  const { data: allBoards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
    enabled: open && view === "builder",
  });

  const columns = board?.columns || [];

  const toggleRuleMutation = useMutation({
    mutationFn: (rule: AutomationRule) =>
      apiRequest("PATCH", `/api/automations/${rule.id}`, { isActive: !rule.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "automations"] });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (data: Record<string, any>) =>
      apiRequest("POST", `/api/boards/${boardId}/automations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "automations"] });
      toast({ title: "Automation created successfully" });
      resetBuilder();
      setView("list");
    },
    onError: () => {
      toast({ title: "Failed to create automation", variant: "destructive" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId: string) =>
      apiRequest("DELETE", `/api/automations/${ruleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "automations"] });
      toast({ title: "Automation deleted" });
    },
  });

  const handleCreateColumn = (name: string, type: string) => {
    if (!board) return;
    const newCol: ColumnDef = {
      id: `col_${Date.now()}`,
      title: name,
      type: type as any,
      visible: true,
      order: board.columns.length,
      width: 150,
    };
    const updatedColumns = [...board.columns, newCol];
    apiRequest("PATCH", `/api/boards/${boardId}`, { columns: updatedColumns })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId] });
        setBuilderConfig(prev => {
          const triggerFields = selectedTrigger?.configFields?.filter(f => f.type === "column") || [];
          const actionFields = selectedAction?.configFields?.filter(f => f.type === "column") || [];
          const allColFields = [...triggerFields, ...actionFields];
          const unsetField = allColFields.find(f => !prev[f.key]);
          if (unsetField) {
            return { ...prev, [unsetField.key]: newCol.id };
          }
          return prev;
        });
        toast({ title: `Column "${name}" created`, description: `A new ${type} column has been added to the board.` });
      })
      .catch(() => {
        toast({ title: "Failed to create column", variant: "destructive" });
      });
  };

  const resetBuilder = () => {
    setSelectedTrigger(undefined);
    setSelectedAction(undefined);
    setBuilderConfig({});
    setBuilderStep("idle");
    setTriggerSearch("");
    setActionSearch("");
  };

  const handleCreateAutomation = () => {
    if (!selectedTrigger || !selectedAction) return;

    const triggerDef = selectedTrigger;
    const actionDef = selectedAction;

    const triggerCol = columns.find(c => c.id === builderConfig.triggerField);
    const targetCol = columns.find(c => c.id === builderConfig.targetColumn);
    const targetGroup = groups.find(g => g.id === (builderConfig.targetGroup || builderConfig.triggerValue));
    const targetBoard = allBoards.find(b => b.id === builderConfig.targetBoard);

    let name = `When ${triggerDef.label}`;
    if (triggerCol) name = name.replace(triggerDef.label, `${triggerCol.title} changes`);
    if (builderConfig.triggerValue && !targetGroup) name += ` to ${builderConfig.triggerValue}`;
    name += ` ${actionDef.label}`;
    if (targetCol) name += ` in ${targetCol.title}`;
    if (targetGroup) name += ` to ${targetGroup.title}`;
    if (targetBoard) name += ` in ${targetBoard.name}`;

    createRuleMutation.mutate({
      name,
      description: name,
      triggerType: triggerDef.id,
      triggerField: builderConfig.triggerField,
      triggerValue: builderConfig.triggerValue,
      actionType: actionDef.id,
      actionConfig: builderConfig,
      isActive: true,
    });
  };

  const filteredRules = rules.filter(r =>
    !searchQuery || r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTriggers = useMemo(() =>
    TRIGGERS.filter(t => !triggerSearch || t.label.toLowerCase().includes(triggerSearch.toLowerCase())),
    [triggerSearch]
  );

  const filteredActions = useMemo(() =>
    ACTIONS.filter(a => !actionSearch || a.label.toLowerCase().includes(actionSearch.toLowerCase())),
    [actionSearch]
  );

  if (!open) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0" data-testid="panel-automations">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <DialogTitle className="text-xl font-normal" data-testid="text-panel-title">
              {view === "builder" ? "Create automation" : "Manage your board automations"}
            </DialogTitle>
            <DialogDescription className="sr-only">Automation management for this board</DialogDescription>
            {view === "list" && (
              <div className="flex items-center gap-2">
                <Button onClick={() => { resetBuilder(); setView("builder"); }} data-testid="button-create-automation">
                  <Plus className="h-4 w-4 mr-1" />
                  Create automation
                </Button>
              </div>
            )}
            {view === "builder" && (
              <Button variant="ghost" size="sm" onClick={() => { resetBuilder(); setView("list"); }} data-testid="button-back-to-list">
                Back to list
              </Button>
            )}
          </div>
        </DialogHeader>

        {view === "list" && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-6 pb-4 pt-2 flex items-center gap-4 border-b flex-wrap">
              <div className="flex gap-1">
                <button
                  className={`px-3 py-1.5 text-sm border-b-2 transition-colors ${activeTab === "automations" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground"}`}
                  onClick={() => setActiveTab("automations")}
                  data-testid="tab-automations"
                >
                  Automations
                </button>
                <button
                  className={`px-3 py-1.5 text-sm border-b-2 transition-colors ${activeTab === "run_history" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground"}`}
                  onClick={() => setActiveTab("run_history")}
                  data-testid="tab-run-history"
                >
                  Run history
                </button>
              </div>
            </div>

            {activeTab === "automations" && (
              <>
                <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
                  <div className="relative w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search"
                      className="pl-8 h-8"
                      data-testid="input-search-automations"
                    />
                  </div>
                  <Button variant="ghost" size="sm">
                    <Zap className="h-3.5 w-3.5 mr-1" />
                    Filter
                  </Button>
                </div>

                <ScrollArea className="flex-1 px-6 pb-6">
                  <div className="space-y-2">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : filteredRules.length === 0 ? (
                      <div className="text-center py-12">
                        <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground mb-4">
                          No automations yet. Create your first to streamline your workflow.
                        </p>
                        <Button onClick={() => { resetBuilder(); setView("builder"); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create automation
                        </Button>
                      </div>
                    ) : (
                      filteredRules.map((rule) => {
                        const trigger = TRIGGERS.find(t => t.id === rule.triggerType);
                        const action = ACTIONS.find(a => a.id === rule.actionType);
                        return (
                          <Card
                            key={rule.id}
                            className={`${!rule.isActive ? "opacity-50" : ""}`}
                            data-testid={`automation-card-${rule.id}`}
                          >
                            <CardContent className="px-4 py-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium mb-1.5" data-testid={`text-rule-name-${rule.id}`}>
                                    <RuleSentence rule={rule} columns={columns} groups={groups} />
                                  </p>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <BarChart3 className="h-3 w-3" />
                                      Minor
                                    </span>
                                    <span>Updated {timeAgo(rule.updatedAt || rule.createdAt)}</span>
                                    <span className="flex items-center gap-1">
                                      Owner
                                      <User className="h-3 w-3" />
                                    </span>
                                    <span className="text-muted-foreground/60">Description</span>
                                    <span className="text-muted-foreground/60">Add description</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Switch
                                    checked={rule.isActive}
                                    onCheckedChange={() => toggleRuleMutation.mutate(rule)}
                                    data-testid={`toggle-automation-${rule.id}`}
                                  />
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" data-testid={`button-more-${rule.id}`}>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => deleteRuleMutation.mutate(rule.id)}
                                        data-testid={`button-delete-automation-${rule.id}`}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </>
            )}

            {activeTab === "run_history" && (
              <RunHistoryPanel boardId={boardId} />
            )}
          </div>
        )}

        {view === "builder" && (
          <div className="flex-1 flex flex-col min-h-0 p-6 pt-4">
            {builderStep === "idle" && !selectedTrigger && !selectedAction && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <button
                  className="text-2xl font-light text-muted-foreground underline decoration-dotted underline-offset-4 cursor-pointer transition-colors"
                  onClick={() => setBuilderStep("selecting_trigger")}
                  data-testid="button-when-this-happens"
                >
                  When this happens
                </button>
                <ArrowDown className="h-5 w-5 text-muted-foreground my-1" />
                <button
                  className="text-2xl font-light text-muted-foreground underline decoration-dotted underline-offset-4 cursor-pointer transition-colors"
                  onClick={() => {
                    if (!selectedTrigger) {
                      toast({ title: "Select a trigger first", variant: "destructive" });
                      setBuilderStep("selecting_trigger");
                    } else {
                      setBuilderStep("selecting_action");
                    }
                  }}
                  data-testid="button-then-do-this"
                >
                  Then do this
                </button>
                <Button className="mt-6" disabled data-testid="button-create-automation-submit">
                  Create automation
                </Button>
              </div>
            )}

            {(selectedTrigger || selectedAction) && builderStep !== "selecting_trigger" && builderStep !== "selecting_action" && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2">
                <div className="w-full max-w-lg space-y-4">
                  {selectedTrigger ? (
                    <InlineSentence
                      trigger={selectedTrigger}
                      config={builderConfig}
                      setConfig={setBuilderConfig}
                      columns={columns}
                      groups={groups}
                      boards={allBoards}
                      onSentenceClick={() => setBuilderStep("selecting_trigger")}
                      onCreateColumn={handleCreateColumn}
                    />
                  ) : (
                    <button
                      className="text-2xl font-light text-muted-foreground underline decoration-dotted underline-offset-4 cursor-pointer"
                      onClick={() => setBuilderStep("selecting_trigger")}
                      data-testid="button-when-placeholder"
                    >
                      When this happens
                    </button>
                  )}

                  <div className="flex items-center">
                    <ArrowDown className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {selectedAction ? (
                    <InlineSentence
                      action={selectedAction}
                      config={builderConfig}
                      setConfig={setBuilderConfig}
                      columns={columns}
                      groups={groups}
                      boards={allBoards}
                      onSentenceClick={() => setBuilderStep("selecting_action")}
                      onCreateColumn={handleCreateColumn}
                    />
                  ) : (
                    <button
                      className="text-2xl font-light text-muted-foreground underline decoration-dotted underline-offset-4 cursor-pointer"
                      onClick={() => setBuilderStep("selecting_action")}
                      data-testid="button-then-placeholder"
                    >
                      Then do this
                    </button>
                  )}

                  <div className="flex gap-2 mt-4 flex-wrap">
                    <Button
                      variant="outline"
                      disabled={!selectedTrigger || !selectedAction || dryRunMutation.isPending}
                      onClick={() => dryRunMutation.mutate()}
                      data-testid="button-test-rule"
                    >
                      {dryRunMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Test Rule
                    </Button>
                    <Button
                      disabled={!selectedTrigger || !selectedAction || createRuleMutation.isPending}
                      onClick={handleCreateAutomation}
                      data-testid="button-create-automation-submit"
                    >
                      {createRuleMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Create automation
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {builderStep === "selecting_trigger" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground mb-2">Select a trigger</p>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={triggerSearch}
                      onChange={(e) => setTriggerSearch(e.target.value)}
                      placeholder="Search"
                      className="pl-8 h-8"
                      autoFocus
                      data-testid="input-search-triggers"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-4 pb-4">
                    {triggerSearch ? (
                      <div className="space-y-0.5">
                        {filteredTriggers.length === 0 ? (
                          <p className="text-sm text-muted-foreground px-2 py-4">No triggers found</p>
                        ) : (
                          filteredTriggers.map(trigger => (
                            <button
                              key={trigger.id}
                              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm hover-elevate"
                              onClick={() => {
                                setSelectedTrigger(trigger);
                                setBuilderStep(selectedAction ? "configuring" : "idle");
                                setTriggerSearch("");
                              }}
                              data-testid={`trigger-option-${trigger.id}`}
                            >
                              <TriggerIcon trigger={trigger} size="md" />
                              <span>{trigger.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : (
                      TRIGGER_CATEGORIES.map(cat => {
                        const items = filteredTriggers.filter(t => t.category === cat.id);
                        if (items.length === 0) return null;
                        return (
                          <div key={cat.id}>
                            <p className="text-xs text-muted-foreground mb-1 px-1">{cat.label}</p>
                            <div className="space-y-0.5">
                              {items.map(trigger => (
                                <button
                                  key={trigger.id}
                                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm hover-elevate"
                                  onClick={() => {
                                    setSelectedTrigger(trigger);
                                    setBuilderStep(selectedAction ? "configuring" : "idle");
                                    setTriggerSearch("");
                                  }}
                                  data-testid={`trigger-option-${trigger.id}`}
                                >
                                  <TriggerIcon trigger={trigger} size="md" />
                                  <span>{trigger.label}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {builderStep === "selecting_action" && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground mb-2">Select an action</p>
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={actionSearch}
                      onChange={(e) => setActionSearch(e.target.value)}
                      placeholder="Search"
                      className="pl-8 h-8"
                      autoFocus
                      data-testid="input-search-actions"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-4 pb-4">
                    {actionSearch ? (
                      <div className="space-y-0.5">
                        {filteredActions.length === 0 ? (
                          <p className="text-sm text-muted-foreground px-2 py-4">No actions found</p>
                        ) : (
                          filteredActions.map(action => (
                            <button
                              key={action.id}
                              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm hover-elevate"
                              onClick={() => {
                                setSelectedAction(action);
                                setBuilderStep("configuring");
                                setActionSearch("");
                              }}
                              data-testid={`action-option-${action.id}`}
                            >
                              <ActionIcon action={action} size="md" />
                              <span>{action.label}</span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : (
                    ACTION_CATEGORIES.map(cat => {
                      const items = filteredActions.filter(a => a.category === cat.id);
                      if (items.length === 0) return null;
                      return (
                        <div key={cat.id}>
                          <p className="text-xs text-muted-foreground mb-1 px-1">{cat.label}</p>
                          <div className="space-y-0.5">
                            {items.map(action => (
                              <button
                                key={action.id}
                                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-sm hover-elevate"
                                onClick={() => {
                                  setSelectedAction(action);
                                  setBuilderStep("configuring");
                                  setActionSearch("");
                                }}
                                data-testid={`action-option-${action.id}`}
                              >
                                <ActionIcon action={action} size="md" />
                                <span>{action.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>

    <Dialog open={showDryRun} onOpenChange={setShowDryRun}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Dry Run Results
          </DialogTitle>
          <DialogDescription>
            Simulation of what this rule would do against current board items.
          </DialogDescription>
        </DialogHeader>
        {dryRunResult && (
          <div className="space-y-4" data-testid="panel-dry-run-results">
            <div className="flex items-center gap-4">
              <div className="flex-1 p-3 rounded-md bg-muted text-center">
                <p className="text-2xl font-bold" data-testid="text-dry-run-match-count">{dryRunResult.matchCount}</p>
                <p className="text-xs text-muted-foreground">items would match</p>
              </div>
              <div className="flex-1 p-3 rounded-md bg-muted text-center">
                <p className="text-2xl font-bold" data-testid="text-dry-run-conflict-count">{dryRunResult.conflicts.length}</p>
                <p className="text-xs text-muted-foreground">conflicts found</p>
              </div>
            </div>

            {dryRunResult.conflicts.length > 0 && (
              <div className="space-y-2" data-testid="section-dry-run-conflicts">
                <h4 className="text-sm font-medium flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  Conflicts Detected
                </h4>
                {dryRunResult.conflicts.map((c, i) => (
                  <div key={i} className="p-2.5 rounded-md border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-1" data-testid={`card-conflict-${i}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {c.type === "potential_loop" ? "Loop Risk" : "Competing Write"}
                      </Badge>
                      <span className="text-xs font-medium">{c.ruleName}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.description}</p>
                  </div>
                ))}
              </div>
            )}

            {dryRunResult.matches.length > 0 && (
              <div className="space-y-2" data-testid="section-dry-run-matches">
                <h4 className="text-sm font-medium">Matching Items</h4>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1">
                    {dryRunResult.matches.map((m, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50" data-testid={`card-match-${i}`}>
                        <span className="text-sm truncate">{m.taskTitle}</span>
                        {m.predictedChanges.length > 0 && (
                          <div className="flex gap-1 shrink-0">
                            {m.predictedChanges.map((pc: any, j: number) => (
                              <Badge key={j} variant="secondary" className="text-xs">
                                {pc.field} {pc.newValue ? `\u2192 ${pc.newValue}` : ""}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

function RuleSentence({ rule, columns, groups }: { rule: AutomationRule; columns: ColumnDef[]; groups: Group[] }) {
  const trigger = TRIGGERS.find(t => t.id === rule.triggerType);
  const action = ACTIONS.find(a => a.id === rule.actionType);

  let parts: Array<{ text: string; bold: boolean }> = [];

  if (trigger) {
    const triggerCol = columns.find(c => c.id === rule.triggerField);
    const triggerColName = triggerCol?.title;

    if (triggerColName && rule.triggerValue) {
      parts.push({ text: "When ", bold: false });
      parts.push({ text: triggerColName, bold: true });
      parts.push({ text: " changes to ", bold: false });
      parts.push({ text: rule.triggerValue, bold: true });
    } else if (triggerColName) {
      parts.push({ text: "When ", bold: false });
      parts.push({ text: triggerColName, bold: true });
      parts.push({ text: " changes", bold: false });
    } else if (rule.triggerValue) {
      parts.push({ text: `When ${trigger.label} to `, bold: false });
      parts.push({ text: rule.triggerValue, bold: true });
    } else {
      parts.push({ text: `When ${trigger.label}`, bold: false });
    }
  } else {
    parts.push({ text: rule.name || rule.description || "Automation", bold: false });
    return <span>{parts.map((p, i) => p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>)}</span>;
  }

  if (action) {
    const actionConfig = rule.actionConfig || {};
    const targetGroup = groups.find(g => g.id === actionConfig.targetGroup);
    const targetCol = columns.find(c => c.id === actionConfig.targetColumn);

    parts.push({ text: " ", bold: false });

    if (action.id === "move_to_group" && targetGroup) {
      parts.push({ text: "move ", bold: false });
      parts.push({ text: "item", bold: true });
      parts.push({ text: " to ", bold: false });
      parts.push({ text: targetGroup.title, bold: true });
    } else if (action.id === "change_status" && targetCol) {
      parts.push({ text: "set ", bold: false });
      parts.push({ text: targetCol.title, bold: true });
      if (actionConfig.targetValue) {
        parts.push({ text: " to ", bold: false });
        parts.push({ text: actionConfig.targetValue, bold: true });
      }
    } else if (action.id === "set_date" && targetCol) {
      parts.push({ text: "set ", bold: false });
      parts.push({ text: targetCol.title, bold: true });
      parts.push({ text: " to today", bold: false });
    } else {
      parts.push({ text: action.label, bold: false });
    }
  }

  return (
    <span>
      {parts.map((p, i) => p.bold ? <strong key={i}>{p.text}</strong> : <span key={i}>{p.text}</span>)}
    </span>
  );
}
