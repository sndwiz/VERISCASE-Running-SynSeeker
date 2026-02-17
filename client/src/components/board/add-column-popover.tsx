import { useState, useMemo } from "react";
import { Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ColumnType } from "@shared/schema";

interface QuickColumnDef {
  type: ColumnType;
  label: string;
  color: string;
  category: "essentials" | "super-useful";
}

const QUICK_COLUMNS: QuickColumnDef[] = [
  { type: "status", label: "Status", color: "#22c55e", category: "essentials" },
  { type: "dropdown", label: "Dropdown", color: "#22c55e", category: "essentials" },
  { type: "text", label: "Text", color: "#f43f5e", category: "essentials" },
  { type: "date", label: "Date", color: "#22c55e", category: "essentials" },
  { type: "person", label: "People", color: "#3b82f6", category: "essentials" },
  { type: "number", label: "Numbers", color: "#eab308", category: "essentials" },

  { type: "files", label: "Files", color: "#06b6d4", category: "super-useful" },
  { type: "checkbox", label: "Checkbox", color: "#eab308", category: "super-useful" },
  { type: "long-text", label: "Doc", color: "#ec4899", category: "super-useful" },
  { type: "formula", label: "Formula", color: "#6366f1", category: "super-useful" },
  { type: "dependency", label: "Connect boards", color: "#6366f1", category: "super-useful" },
  { type: "ai-extract", label: "Extract info", color: "#gradient", category: "super-useful" },
  { type: "timeline", label: "Timeline", color: "#a855f7", category: "super-useful" },
  { type: "priority", label: "Priority", color: "#eab308", category: "super-useful" },
];

function QuickColumnIcon({ color, label }: { color: string; label: string }) {
  const isGradient = color === "#gradient";
  return (
    <div
      className="h-6 w-6 rounded flex items-center justify-center shrink-0"
      style={isGradient ? { background: "linear-gradient(135deg, #8b5cf6, #ec4899, #f97316)" } : { backgroundColor: color }}
    >
      <span className="text-white text-[10px] font-bold leading-none">
        {label.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

interface AddColumnPopoverProps {
  onAddColumn: (type: ColumnType, title: string) => void;
  onOpenMoreColumns: () => void;
}

export function AddColumnPopover({ onAddColumn, onOpenMoreColumns }: AddColumnPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return QUICK_COLUMNS;
    const q = search.toLowerCase();
    return QUICK_COLUMNS.filter(c => c.label.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [search]);

  const essentials = filtered.filter(c => c.category === "essentials");
  const superUseful = filtered.filter(c => c.category === "super-useful");

  const handleAdd = (col: QuickColumnDef) => {
    onAddColumn(col.type, col.label);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(""); }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          data-testid="button-add-column-plus"
          title="Add column"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        className="w-[340px] p-0"
        data-testid="popover-add-column"
      >
        <div className="p-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search or describe your column"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              data-testid="input-quick-column-search"
              autoFocus
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearch("")}
                data-testid="button-clear-quick-column-search"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[360px]">
          <div className="px-3 pb-3 space-y-3">
            {essentials.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Essentials</p>
                <div className="grid grid-cols-2 gap-1">
                  {essentials.map(col => (
                    <button
                      key={col.type}
                      onClick={() => handleAdd(col)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover-elevate text-left"
                      data-testid={`quick-add-${col.type}`}
                    >
                      <QuickColumnIcon color={col.color} label={col.label} />
                      <span className="truncate">{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {superUseful.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Super useful</p>
                <div className="grid grid-cols-2 gap-1">
                  {superUseful.map(col => (
                    <button
                      key={col.type}
                      onClick={() => handleAdd(col)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover-elevate text-left"
                      data-testid={`quick-add-${col.type}`}
                    >
                      <QuickColumnIcon color={col.color} label={col.label} />
                      <span className="truncate">{col.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No columns match your search</p>
            )}
          </div>
        </ScrollArea>

        <div className="border-t px-3 py-2">
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => { setOpen(false); setSearch(""); onOpenMoreColumns(); }}
            data-testid="button-more-columns"
          >
            More columns
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
