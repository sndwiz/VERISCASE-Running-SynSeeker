import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { CustomStatusLabel } from "@shared/schema";
import { defaultStatusLabels } from "@shared/schema";

interface EditStatusLabelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusLabels: CustomStatusLabel[];
  onSave: (labels: CustomStatusLabel[]) => void;
}

const PRESET_COLORS = [
  "#6B7280", // Gray
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#EAB308", // Yellow
  "#84CC16", // Lime
  "#22C55E", // Green
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#A855F7", // Purple
  "#EC4899", // Pink
  "#F43F5E", // Rose
];

export function EditStatusLabelsDialog({
  open,
  onOpenChange,
  statusLabels,
  onSave,
}: EditStatusLabelsDialogProps) {
  const [labels, setLabels] = useState<CustomStatusLabel[]>([]);

  useEffect(() => {
    if (open) {
      setLabels(statusLabels.length > 0 ? [...statusLabels] : [...defaultStatusLabels]);
    }
  }, [open, statusLabels]);

  const handleAddLabel = () => {
    const newLabel: CustomStatusLabel = {
      id: Math.random().toString(36).substring(2, 9),
      label: "New Status",
      color: PRESET_COLORS[labels.length % PRESET_COLORS.length],
    };
    setLabels([...labels, newLabel]);
  };

  const handleUpdateLabel = (index: number, updates: Partial<CustomStatusLabel>) => {
    const newLabels = [...labels];
    newLabels[index] = { ...newLabels[index], ...updates };
    setLabels(newLabels);
  };

  const handleDeleteLabel = (index: number) => {
    if (labels.length <= 1) return;
    setLabels(labels.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(labels);
    onOpenChange(false);
  };

  const handleReset = () => {
    setLabels([...defaultStatusLabels]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Status Labels</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Customize your status labels and colors. These will be available for all tasks in this board.
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
            {labels.map((label, index) => (
              <div
                key={label.id}
                className="flex items-center gap-2 p-2 rounded-md border bg-card"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                
                <div className="relative">
                  <input
                    type="color"
                    value={label.color}
                    onChange={(e) => handleUpdateLabel(index, { color: e.target.value })}
                    className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                    data-testid={`color-input-${label.id}`}
                  />
                  <div
                    className="w-8 h-8 rounded-md border-2 border-border"
                    style={{ backgroundColor: label.color }}
                  />
                </div>

                <Input
                  value={label.label}
                  onChange={(e) => handleUpdateLabel(index, { label: e.target.value })}
                  className="flex-1 h-8"
                  placeholder="Status name"
                  data-testid={`label-input-${label.id}`}
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteLabel(index)}
                  disabled={labels.length <= 1}
                  className="text-muted-foreground hover:text-destructive"
                  data-testid={`button-delete-label-${label.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddLabel}
              className="flex-1"
              data-testid="button-add-label"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Label
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-muted-foreground"
              data-testid="button-reset-labels"
            >
              Reset to Default
            </Button>
          </div>

          <div className="border-t pt-4">
            <Label className="text-xs text-muted-foreground mb-2 block">Color Presets</Label>
            <div className="flex flex-wrap gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded-md border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    const firstEmptyOrSelected = labels.findIndex(l => !l.color);
                    if (firstEmptyOrSelected === -1 && labels.length > 0) {
                      handleUpdateLabel(labels.length - 1, { color });
                    }
                  }}
                  data-testid={`preset-color-${color}`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-labels">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-labels">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
