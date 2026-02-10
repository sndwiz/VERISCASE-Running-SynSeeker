import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PlayCircle,
  Zap,
  FileText,
  Clock,
  ChevronRight,
  Trash2,
  Loader2,
  CircleDot,
  ArrowRight,
  ClipboardList,
  Download,
  CheckCircle2,
} from "lucide-react";

interface Recording {
  id: string;
  createdByUserId: string;
  scopeType: string;
  scopeId: string | null;
  title: string;
  startedAt: string;
  endedAt: string | null;
  status: string;
  eventCount: number;
  createdAt: string;
}

interface RecordingDetail extends Recording {
  events: Array<{
    id: string;
    eventType: string;
    payloadJson: any;
    ts: string;
  }>;
  conversions: Array<{
    id: string;
    outputType: string;
    generatedJson: any;
    status: string;
    createdAt: string;
  }>;
}

const statusColors: Record<string, string> = {
  recording: "text-red-500",
  draft: "text-yellow-500",
  converted: "text-green-500",
};

const outputTypeIcons: Record<string, any> = {
  automation_rule: Zap,
  macro: PlayCircle,
  sop: ClipboardList,
};

const outputTypeLabels: Record<string, string> = {
  automation_rule: "Automation Rule",
  macro: "Manual Macro",
  sop: "SOP / Playbook",
};

export default function ProcessRecorderPage() {
  const [selectedRecording, setSelectedRecording] = useState<RecordingDetail | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [convertRecordingId, setConvertRecordingId] = useState<string | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [installRecordingId, setInstallRecordingId] = useState<string | null>(null);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");
  const { toast } = useToast();

  const { data: boards = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["/api/boards"],
  });

  const { data: recordings = [], isLoading } = useQuery<Recording[]>({
    queryKey: ["/api/recordings"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/recordings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      setSelectedRecording(null);
      toast({ title: "Recording deleted" });
    },
  });

  const convertMutation = useMutation({
    mutationFn: ({ id, outputType }: { id: string; outputType: string }) =>
      apiRequest("POST", `/api/recordings/${id}/convert`, { outputType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      setShowConvertDialog(false);
      toast({ title: "Recording converted", description: "Your recording has been converted successfully." });
    },
    onError: () => toast({ title: "Conversion failed", variant: "destructive" }),
  });

  const installMutation = useMutation({
    mutationFn: ({ id, boardId }: { id: string; boardId: string }) =>
      apiRequest("POST", `/api/recordings/${id}/install`, { boardId }),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/recordings"] });
      setShowInstallDialog(false);
      setSelectedBoardId("");
      toast({
        title: "Automation installed",
        description: `${data.count} automation rule${data.count !== 1 ? "s" : ""} created and ready to run.`,
      });
      if (installRecordingId) fetchDetail(installRecordingId);
    },
    onError: () => toast({ title: "Installation failed", variant: "destructive" }),
  });

  const fetchDetail = async (id: string) => {
    const res = await fetch(`/api/recordings/${id}`);
    if (!res.ok) return;
    const detail: RecordingDetail = await res.json();
    setSelectedRecording(detail);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getDuration = (start: string, end: string | null) => {
    if (!end) return "In progress";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="flex flex-col h-full" data-testid="page-process-recorder">
      <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-recorder-title">Process Recorder</h1>
          <p className="text-sm text-muted-foreground">Capture workflows and convert to automations, macros, or playbooks</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 border-r flex flex-col">
          <div className="p-3 border-b">
            <p className="text-xs text-muted-foreground">{recordings.length} recording{recordings.length !== 1 ? "s" : ""}</p>
          </div>
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recordings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-muted-foreground gap-2">
                <CircleDot className="h-8 w-8" />
                <p className="text-sm text-center" data-testid="text-no-recordings">No recordings yet. Use the Record button in the header to capture a workflow.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {recordings.map(rec => (
                  <div
                    key={rec.id}
                    className={`p-3 border-b cursor-pointer hover-elevate ${selectedRecording?.id === rec.id ? "bg-muted" : ""}`}
                    onClick={() => fetchDetail(rec.id)}
                    data-testid={`recording-item-${rec.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{rec.title}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={`text-xs capitalize ${statusColors[rec.status] || ""}`}>
                        {rec.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{rec.eventCount} events</span>
                      <span className="text-xs text-muted-foreground">{getDuration(rec.startedAt, rec.endedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {selectedRecording ? (
            <div className="space-y-4 max-w-3xl">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold">{selectedRecording.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatTime(selectedRecording.startedAt)} - {getDuration(selectedRecording.startedAt, selectedRecording.endedAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedRecording.status === "draft" && (
                    <Button
                      onClick={() => { setConvertRecordingId(selectedRecording.id); setShowConvertDialog(true); }}
                      data-testid="button-convert-recording"
                    >
                      <ArrowRight className="h-4 w-4 mr-1" />
                      Convert
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => deleteMutation.mutate(selectedRecording.id)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-recording"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className={`capitalize ${statusColors[selectedRecording.status]}`}>{selectedRecording.status}</Badge>
                <Badge variant="outline">{selectedRecording.eventCount} events</Badge>
                <Badge variant="outline" className="capitalize">{selectedRecording.scopeType}</Badge>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium mb-2">Recorded Events</h3>
                {selectedRecording.events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events captured</p>
                ) : (
                  <div className="space-y-2">
                    {selectedRecording.events.map((evt, i) => (
                      <div key={evt.id} className="flex items-start gap-3 p-2 rounded-md border">
                        <Badge variant="outline" className="text-xs shrink-0 mt-0.5">{i + 1}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{evt.eventType}</p>
                          <p className="text-xs text-muted-foreground">{formatTime(evt.ts)}</p>
                          {evt.payloadJson && Object.keys(evt.payloadJson).length > 0 && (
                            <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-all">
                              {JSON.stringify(evt.payloadJson, null, 2)}
                            </pre>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedRecording.conversions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <h3 className="text-sm font-medium">Conversions</h3>
                      {selectedRecording.status !== "installed" && selectedRecording.conversions.some(c => c.outputType === "automation_rule" || c.outputType === "macro") && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setInstallRecordingId(selectedRecording.id);
                            setShowInstallDialog(true);
                          }}
                          data-testid="button-install-automation"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Install as Live Automation
                        </Button>
                      )}
                      {selectedRecording.status === "installed" && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Installed
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      {selectedRecording.conversions.map(conv => {
                        const Icon = outputTypeIcons[conv.outputType] || FileText;
                        return (
                          <Card key={conv.id}>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {outputTypeLabels[conv.outputType] || conv.outputType}
                                <Badge variant="outline" className={`capitalize ml-auto ${conv.status === "installed" ? "border-green-500 text-green-600 dark:text-green-400" : ""}`}>{conv.status}</Badge>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                                {JSON.stringify(conv.generatedJson, null, 2)}
                              </pre>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <CircleDot className="h-10 w-10" />
              <p className="text-sm">Select a recording to view details</p>
              <p className="text-xs">Use the Record button in the header to capture workflows</p>
            </div>
          )}
        </div>
      </div>

      {showInstallDialog && installRecordingId && (
        <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
          <DialogContent data-testid="dialog-install-automation">
            <DialogHeader>
              <DialogTitle>Install as Live Automation</DialogTitle>
              <DialogDescription>Choose which board to install the automation rules on. They will run automatically on that board.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Target Board</Label>
                <Select value={selectedBoardId} onValueChange={setSelectedBoardId}>
                  <SelectTrigger data-testid="select-install-board">
                    <SelectValue placeholder="Select a board..." />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map(board => (
                      <SelectItem key={board.id} value={board.id} data-testid={`board-option-${board.id}`}>
                        {board.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInstallDialog(false)} data-testid="button-cancel-install">
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedBoardId) {
                    toast({ title: "Please select a board", variant: "destructive" });
                    return;
                  }
                  installMutation.mutate({ id: installRecordingId, boardId: selectedBoardId });
                }}
                disabled={!selectedBoardId || installMutation.isPending}
                data-testid="button-confirm-install"
              >
                {installMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                Install
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showConvertDialog && convertRecordingId && (
        <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
          <DialogContent data-testid="dialog-convert-recording">
            <DialogHeader>
              <DialogTitle>Convert Recording</DialogTitle>
              <DialogDescription>Choose what to create from this recorded workflow</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              {(["automation_rule", "macro", "sop"] as const).map(type => {
                const Icon = outputTypeIcons[type];
                return (
                  <Card
                    key={type}
                    className="cursor-pointer hover-elevate"
                    onClick={() => convertMutation.mutate({ id: convertRecordingId, outputType: type })}
                    data-testid={`button-convert-${type}`}
                  >
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="rounded-md bg-muted p-2">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{outputTypeLabels[type]}</p>
                        <p className="text-xs text-muted-foreground">
                          {type === "automation_rule" && "Runs automatically when triggered"}
                          {type === "macro" && "Run on demand with one click"}
                          {type === "sop" && "Step-by-step checklist for training/onboarding"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {convertMutation.isPending && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
