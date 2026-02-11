import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles, Loader2, Check, X, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ColumnDef, Board } from "@shared/schema";

interface AIAutofillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: Board;
  targetColumn: ColumnDef;
}

interface Prediction {
  taskId: string;
  taskTitle: string;
  label: string;
  confidence: number;
  currentValue: string;
  selected: boolean;
}

type Step = "configure" | "preview" | "done";

function getLabelsForColumn(column: ColumnDef): string[] {
  if (column.type === "status" && column.statusLabels) {
    return column.statusLabels.map((s) => s.label);
  }
  if (column.options) {
    return column.options;
  }
  return [];
}

function getTextColumns(board: Board): ColumnDef[] {
  const textTypes = ["text", "long-text", "tags"];
  return [
    { id: "description", title: "Description", type: "text" as any, width: 0, visible: true, order: -2 },
    { id: "notes", title: "Notes", type: "long-text" as any, width: 0, visible: true, order: -1 },
    ...board.columns.filter((c) => textTypes.includes(c.type) && c.visible),
  ];
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-green-500";
  if (confidence >= 0.5) return "text-yellow-500";
  return "text-red-500";
}

export function AIAutofillDialog({
  open,
  onOpenChange,
  board,
  targetColumn,
}: AIAutofillDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("configure");
  const [sourceColumnId, setSourceColumnId] = useState<string>("");
  const [selectedLabels, setSelectedLabels] = useState<string[]>(getLabelsForColumn(targetColumn));
  const [instructions, setInstructions] = useState("");
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const availableLabels = getLabelsForColumn(targetColumn);
  const textColumns = getTextColumns(board);

  const previewMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/boards/${board.id}/ai-autofill`, {
        sourceColumnId,
        targetColumnId: targetColumn.id,
        labels: selectedLabels,
        instructions: instructions || undefined,
        includeEmpty,
        previewOnly: true,
      }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      setPredictions(
        (data.predictions || []).map((p: any) => ({ ...p, selected: true }))
      );
      setStep("preview");
    },
    onError: (err: any) => {
      toast({
        title: "AI preview failed",
        description: err.message || "Could not generate predictions",
        variant: "destructive",
      });
    },
  });

  const applyAllMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/boards/${board.id}/ai-autofill`, {
        sourceColumnId,
        targetColumnId: targetColumn.id,
        labels: selectedLabels,
        instructions: instructions || undefined,
        includeEmpty,
        previewOnly: false,
      }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      const allPredictions: Prediction[] = (data.predictions || []).map((p: any) => ({
        ...p,
        selected: true,
      }));
      if (allPredictions.length === 0) {
        toast({ title: "No items to classify" });
        return;
      }
      await applyPredictions(allPredictions);
    },
    onError: (err: any) => {
      toast({
        title: "AI autofill failed",
        description: err.message || "Could not generate predictions",
        variant: "destructive",
      });
    },
  });

  const applyMutation = useMutation({
    mutationFn: (assignments: Array<{ taskId: string; label: string }>) =>
      apiRequest("POST", `/api/boards/${board.id}/ai-autofill/apply`, {
        targetColumnId: targetColumn.id,
        assignments,
      }),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", board.id, "tasks"] });
      toast({ title: `Updated ${data.updated} item${data.updated !== 1 ? "s" : ""}` });
      setStep("done");
    },
    onError: (err: any) => {
      toast({
        title: "Failed to apply changes",
        description: err.message || "Could not update tasks",
        variant: "destructive",
      });
    },
  });

  async function applyPredictions(preds: Prediction[]) {
    const selected = preds.filter((p) => p.selected);
    if (selected.length === 0) {
      toast({ title: "No items selected" });
      return;
    }
    applyMutation.mutate(
      selected.map((p) => ({ taskId: p.taskId, label: p.label }))
    );
  }

  function toggleLabel(label: string) {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  }

  function togglePrediction(taskId: string) {
    setPredictions((prev) =>
      prev.map((p) => (p.taskId === taskId ? { ...p, selected: !p.selected } : p))
    );
  }

  function handleClose() {
    setStep("configure");
    setSourceColumnId("");
    setSelectedLabels(getLabelsForColumn(targetColumn));
    setInstructions("");
    setIncludeEmpty(false);
    setPredictions([]);
    onOpenChange(false);
  }

  const isProcessing = previewMutation.isPending || applyAllMutation.isPending || applyMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-autofill-title">
            <Sparkles className="h-5 w-5 text-primary" />
            Autofill with AI
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground font-normal">{targetColumn.title}</span>
          </DialogTitle>
        </DialogHeader>

        {step === "configure" && (
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label>Text to analyze</Label>
              <Select value={sourceColumnId} onValueChange={setSourceColumnId}>
                <SelectTrigger data-testid="select-source-column">
                  <SelectValue placeholder="Select a source column..." />
                </SelectTrigger>
                <SelectContent>
                  {textColumns.map((col) => (
                    <SelectItem key={col.id} value={col.id}>
                      {col.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Labels to assign</Label>
              <div className="flex flex-wrap gap-2">
                {availableLabels.map((label) => {
                  const isSelected = selectedLabels.includes(label);
                  return (
                    <Badge
                      key={label}
                      variant={isSelected ? "default" : "outline"}
                      className={`cursor-pointer toggle-elevate ${isSelected ? "toggle-elevated" : ""}`}
                      onClick={() => toggleLabel(label)}
                      data-testid={`badge-label-${label}`}
                    >
                      {isSelected && <X className="h-3 w-3 mr-1" />}
                      {!isSelected && <span className="mr-1">+</span>}
                      {label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Additional instructions{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value.slice(0, 1000))}
                placeholder='For example, "categorize these items by legal practice area"'
                className="min-h-[80px] text-sm"
                data-testid="textarea-instructions"
              />
              <div className="text-xs text-muted-foreground text-right">
                {instructions.length}/1000
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="include-empty"
                checked={includeEmpty}
                onCheckedChange={(c) => setIncludeEmpty(!!c)}
                data-testid="checkbox-include-empty"
              />
              <Label htmlFor="include-empty" className="text-sm font-normal cursor-pointer">
                Apply also to empty existing items
              </Label>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Preview of how AI will classify the first items. Review and apply.
            </p>
            {predictions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No items to classify
              </p>
            ) : (
              <div className="rounded-md border max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Assigned Label</TableHead>
                      <TableHead className="w-16">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {predictions.map((pred) => (
                      <TableRow key={pred.taskId} data-testid={`row-prediction-${pred.taskId}`}>
                        <TableCell>
                          <Checkbox
                            checked={pred.selected}
                            onCheckedChange={() => togglePrediction(pred.taskId)}
                            data-testid={`checkbox-prediction-${pred.taskId}`}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{pred.taskTitle}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{pred.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-mono ${confidenceColor(pred.confidence)}`}>
                            {Math.round(pred.confidence * 100)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              AI autofill applied successfully
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step === "configure" && (
            <>
              <Button variant="outline" onClick={handleClose} data-testid="button-autofill-cancel">
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => previewMutation.mutate()}
                disabled={!sourceColumnId || selectedLabels.length === 0 || isProcessing}
                data-testid="button-autofill-preview"
              >
                {previewMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Preview AI Results
              </Button>
              <Button
                onClick={() => applyAllMutation.mutate()}
                disabled={!sourceColumnId || selectedLabels.length === 0 || isProcessing}
                data-testid="button-autofill-apply-all"
              >
                {applyAllMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Apply to All
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("configure")} data-testid="button-autofill-back">
                Back
              </Button>
              <Button
                onClick={() => applyPredictions(predictions)}
                disabled={predictions.filter((p) => p.selected).length === 0 || isProcessing}
                data-testid="button-autofill-apply-selected"
              >
                {applyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Apply {predictions.filter((p) => p.selected).length} Selected
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={handleClose} data-testid="button-autofill-done">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
