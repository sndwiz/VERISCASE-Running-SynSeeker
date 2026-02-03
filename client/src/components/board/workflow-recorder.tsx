import { useState, useEffect, useCallback } from "react";
import { Circle, Square, Play, Zap, Save, X, ChevronDown, ChevronUp, RefreshCw, Gauge, Pencil, Plus, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface RecordedAction {
  id: string;
  timestamp: Date;
  type: "status_change" | "priority_change" | "field_update" | "task_create" | "task_delete" | "assignment";
  taskId?: string;
  taskTitle?: string;
  field?: string;
  previousValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

export interface DetectedPattern {
  id: string;
  description: string;
  trigger: string;
  action: string;
  frequency: number;
  actions: RecordedAction[];
}

interface WorkflowRecorderProps {
  boardId: string;
  onActionRecorded?: (action: RecordedAction) => void;
}

export function WorkflowRecorder({ boardId, onActionRecorded }: WorkflowRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [recordedActions, setRecordedActions] = useState<RecordedAction[]>([]);
  const [detectedPatterns, setDetectedPatterns] = useState<DetectedPattern[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<DetectedPattern | null>(null);
  const [automationName, setAutomationName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createAutomationMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/boards/${boardId}/automations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "automations"] });
      toast({ title: "Automation created from recording!" });
      setSaveDialogOpen(false);
      setSelectedPattern(null);
      setAutomationName("");
    },
    onError: () => {
      toast({ title: "Failed to create automation", variant: "destructive" });
    },
  });

  const recordAction = useCallback((action: Omit<RecordedAction, "id" | "timestamp">) => {
    if (!isRecording) return;
    
    const newAction: RecordedAction = {
      ...action,
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    
    setRecordedActions(prev => [...prev, newAction]);
    onActionRecorded?.(newAction);
  }, [isRecording, onActionRecorded]);

  useEffect(() => {
    (window as any).__workflowRecorder = {
      recordAction,
      isRecording: () => isRecording,
    };
    
    return () => {
      delete (window as any).__workflowRecorder;
    };
  }, [recordAction, isRecording]);

  useEffect(() => {
    if (recordedActions.length >= 2) {
      const patterns = detectPatterns(recordedActions);
      setDetectedPatterns(patterns);
    }
  }, [recordedActions]);

  const detectPatterns = (actions: RecordedAction[]): DetectedPattern[] => {
    const patterns: DetectedPattern[] = [];
    const actionSequences = new Map<string, RecordedAction[]>();
    
    for (let i = 0; i < actions.length - 1; i++) {
      const current = actions[i];
      const next = actions[i + 1];
      
      if (current.type === "status_change" && next.type === "status_change") {
        const key = `status:${current.newValue}->status:${next.newValue}`;
        if (!actionSequences.has(key)) {
          actionSequences.set(key, []);
        }
        actionSequences.get(key)!.push(current, next);
      }
      
      if (current.type === "status_change" && next.type === "priority_change") {
        const key = `status:${current.newValue}->priority:${next.newValue}`;
        if (!actionSequences.has(key)) {
          actionSequences.set(key, []);
        }
        actionSequences.get(key)!.push(current, next);
      }
      
      if (current.type === "status_change" && next.type === "assignment") {
        const key = `status:${current.newValue}->assign`;
        if (!actionSequences.has(key)) {
          actionSequences.set(key, []);
        }
        actionSequences.get(key)!.push(current, next);
      }
    }
    
    const statusChangeCounts = new Map<string, number>();
    actions.filter(a => a.type === "status_change").forEach(a => {
      const key = `${a.previousValue}->${a.newValue}`;
      statusChangeCounts.set(key, (statusChangeCounts.get(key) || 0) + 1);
    });
    
    statusChangeCounts.forEach((count, transition) => {
      if (count >= 2) {
        const [from, to] = transition.split("->"); 
        patterns.push({
          id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          description: `Status change from "${from}" to "${to}" (${count} times)`,
          trigger: `When status changes to "${from}"`,
          action: `Change status to "${to}"`,
          frequency: count,
          actions: actions.filter(a => a.type === "status_change" && a.previousValue === from && a.newValue === to),
        });
      }
    });
    
    actionSequences.forEach((seqActions, key) => {
      if (seqActions.length >= 2) {
        const parts = key.split("->");
        const triggerPart = parts[0];
        const actionPart = parts[1];
        
        let description = "";
        let trigger = "";
        let action = "";
        
        if (triggerPart.startsWith("status:")) {
          const statusValue = triggerPart.replace("status:", "");
          trigger = `When status changes to "${statusValue}"`;
          
          if (actionPart.startsWith("status:")) {
            const nextStatus = actionPart.replace("status:", "");
            action = `Change status to "${nextStatus}"`;
            description = `After setting status to "${statusValue}", you often change it to "${nextStatus}"`;
          } else if (actionPart.startsWith("priority:")) {
            const priority = actionPart.replace("priority:", "");
            action = `Set priority to "${priority}"`;
            description = `After setting status to "${statusValue}", you often set priority to "${priority}"`;
          } else if (actionPart === "assign") {
            action = `Assign to team member`;
            description = `After setting status to "${statusValue}", you often assign to someone`;
          }
        }
        
        if (description) {
          patterns.push({
            id: `pattern-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            description,
            trigger,
            action,
            frequency: seqActions.length / 2,
            actions: seqActions,
          });
        }
      }
    });
    
    return patterns.sort((a, b) => b.frequency - a.frequency);
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordedActions([]);
    setDetectedPatterns([]);
    setIsPanelOpen(true);
    toast({ title: "Recording started", description: "Your actions are now being tracked" });
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordedActions.length > 0) {
      toast({ 
        title: "Recording stopped", 
        description: `Captured ${recordedActions.length} actions. ${detectedPatterns.length} patterns detected.` 
      });
    } else {
      toast({ title: "Recording stopped", description: "No actions were captured" });
    }
  };

  const clearRecording = () => {
    setRecordedActions([]);
    setDetectedPatterns([]);
  };

  const savePatternAsAutomation = (pattern: DetectedPattern) => {
    setSelectedPattern(pattern);
    setAutomationName(pattern.description.substring(0, 50));
    setSaveDialogOpen(true);
  };

  const createQuickAutomation = () => {
    if (!selectedPattern || !automationName.trim()) return;
    
    let triggerType = "status_change";
    let triggerValue = "";
    let actionType = "change_status";
    let actionConfig: Record<string, any> = {};
    
    if (selectedPattern.trigger.includes("status changes to")) {
      triggerType = "status_change";
      const match = selectedPattern.trigger.match(/\"([^\"]+)\"/);
      if (match) triggerValue = match[1];
    }
    
    if (selectedPattern.action.includes("Change status to")) {
      actionType = "change_status";
      const match = selectedPattern.action.match(/\"([^\"]+)\"/);
      if (match) actionConfig = { status: match[1] };
    } else if (selectedPattern.action.includes("Set priority to")) {
      actionType = "change_priority";
      const match = selectedPattern.action.match(/\"([^\"]+)\"/);
      if (match) actionConfig = { priority: match[1] };
    } else if (selectedPattern.action.includes("Assign")) {
      actionType = "assign_person";
      actionConfig = { assignToOwner: true };
    }
    
    createAutomationMutation.mutate({
      name: automationName,
      description: `Auto-generated from workflow recording: ${selectedPattern.description}`,
      triggerType,
      triggerValue,
      actionType,
      actionConfig,
      isActive: true,
    });
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "status_change": return <RefreshCw className="w-3 h-3 text-blue-500" />;
      case "priority_change": return <Gauge className="w-3 h-3 text-orange-500" />;
      case "field_update": return <Pencil className="w-3 h-3 text-green-500" />;
      case "task_create": return <Plus className="w-3 h-3 text-emerald-500" />;
      case "task_delete": return <Trash2 className="w-3 h-3 text-red-500" />;
      case "assignment": return <User className="w-3 h-3 text-purple-500" />;
      default: return <Pencil className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {isPanelOpen && (
          <Card className="w-80 shadow-lg animate-in slide-in-from-bottom-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  {isRecording && <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />}
                  Workflow Recorder
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => setIsPanelOpen(false)}
                    data-testid="button-collapse-recorder"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button 
                    size="sm" 
                    onClick={startRecording} 
                    className="flex-1"
                    data-testid="button-start-recording"
                  >
                    <Circle className="w-3 h-3 mr-1 fill-current" />
                    Start Recording
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={stopRecording} 
                    className="flex-1"
                    data-testid="button-stop-recording"
                  >
                    <Square className="w-3 h-3 mr-1 fill-current" />
                    Stop
                  </Button>
                )}
                {recordedActions.length > 0 && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={clearRecording}
                    data-testid="button-clear-recording"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              
              {recordedActions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {recordedActions.length} action{recordedActions.length !== 1 ? "s" : ""} captured
                    </span>
                  </div>
                  <ScrollArea className="h-32 rounded border p-2">
                    <div className="space-y-1">
                      {recordedActions.slice(-10).reverse().map(action => (
                        <div key={action.id} className="text-xs flex items-start gap-2">
                          <span>{getActionIcon(action.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="truncate">
                              {action.taskTitle || "Task"}: {action.type.replace("_", " ")}
                            </div>
                            <div className="text-muted-foreground">
                              {action.previousValue && `${action.previousValue} → `}{action.newValue}
                            </div>
                          </div>
                          <span className="text-muted-foreground shrink-0">
                            {formatTime(action.timestamp)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
              
              {detectedPatterns.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs font-medium">Detected Patterns</span>
                  </div>
                  <ScrollArea className="h-40 rounded border p-2">
                    <div className="space-y-2">
                      {detectedPatterns.map(pattern => (
                        <div key={pattern.id} className="p-2 rounded bg-muted/50 space-y-1">
                          <div className="text-xs font-medium">{pattern.description}</div>
                          <div className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-[10px]">
                              {pattern.frequency}x
                            </Badge>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full h-7 text-xs"
                            onClick={() => savePatternAsAutomation(pattern)}
                            data-testid={`button-save-pattern-${pattern.id}`}
                          >
                            <Save className="w-3 h-3 mr-1" />
                            Create Automation
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        <Button
          size="lg"
          variant={isRecording ? "destructive" : "default"}
          className="rounded-full shadow-lg"
          onClick={() => {
            if (!isPanelOpen) {
              setIsPanelOpen(true);
            } else if (isRecording) {
              stopRecording();
            } else {
              startRecording();
            }
          }}
          data-testid="button-workflow-recorder"
        >
          {isRecording ? (
            <>
              <Square className="w-4 h-4 mr-2 fill-current" />
              Recording...
            </>
          ) : (
            <>
              <Circle className="w-4 h-4 mr-2" />
              Record Workflow
            </>
          )}
        </Button>
      </div>
      
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Automation from Pattern</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedPattern && (
              <div className="p-3 rounded bg-muted space-y-2">
                <div className="text-sm font-medium">{selectedPattern.description}</div>
                <div className="text-xs text-muted-foreground">
                  <div><strong>Trigger:</strong> {selectedPattern.trigger}</div>
                  <div><strong>Action:</strong> {selectedPattern.action}</div>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="automation-name">Automation Name</Label>
              <Input
                id="automation-name"
                value={automationName}
                onChange={(e) => setAutomationName(e.target.value)}
                placeholder="Enter automation name..."
                data-testid="input-automation-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createQuickAutomation}
              disabled={!automationName.trim() || createAutomationMutation.isPending}
              data-testid="button-create-automation"
            >
              {createAutomationMutation.isPending ? "Creating..." : "Create Automation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useWorkflowRecorder() {
  const recordAction = useCallback((action: Omit<RecordedAction, "id" | "timestamp">) => {
    const recorder = (window as any).__workflowRecorder;
    if (recorder?.isRecording?.()) {
      recorder.recordAction(action);
    }
  }, []);
  
  return { recordAction };
}
