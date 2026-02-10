import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Shield, Lock, AlertTriangle, Eye, Check } from "lucide-react";

interface KillSwitchState {
  active: boolean;
  activatedAt: string | null;
  activatedBy: string | null;
  reason: string;
  log: Array<{ time: string; action: string; userId?: string }>;
}

export function KillSwitch() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [recoveryKeyResult, setRecoveryKeyResult] = useState<string | null>(null);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [showLog, setShowLog] = useState(false);

  const { data: state } = useQuery<KillSwitchState>({
    queryKey: ["/api/security/kill-switch"],
    refetchInterval: isAuthenticated ? 5000 : false,
    enabled: isAuthenticated,
  });

  const activateMutation = useMutation({
    mutationFn: async (reason: string | undefined) => {
      const res = await apiRequest("POST", "/api/security/kill-switch/activate", { reason });
      return res.json();
    },
    onSuccess: (data: { recoveryKey: string }) => {
      setRecoveryKeyResult(data.recoveryKey);
      queryClient.invalidateQueries({ queryKey: ["/api/security/kill-switch"] });
      toast({ title: "Kill switch activated", description: "System is now in lockdown mode." });
    },
    onError: (error: Error) => {
      toast({ title: "Activation failed", description: error.message, variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (recoveryKey: string) => {
      const res = await apiRequest("POST", "/api/security/kill-switch/deactivate", { recoveryKey });
      return res.json();
    },
    onSuccess: () => {
      setRecoveryKeyInput("");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/security/kill-switch"] });
      toast({ title: "Kill switch deactivated", description: "Normal operations resumed." });
    },
    onError: (error: Error) => {
      toast({ title: "Deactivation failed", description: error.message, variant: "destructive" });
    },
  });

  const isActive = state?.active ?? false;

  const handleOpen = () => {
    setDialogOpen(true);
    setConfirmed(false);
    setRecoveryKeyResult(null);
    setRecoveryKeyInput("");
    setShowLog(false);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setConfirmed(false);
    setRecoveryKeyResult(null);
    setRecoveryKeyInput("");
    setShowLog(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleOpen}
        data-testid="button-kill-switch"
        className={isActive ? "text-destructive animate-pulse" : "text-muted-foreground"}
      >
        <Shield className="h-5 w-5" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent data-testid="dialog-kill-switch">
          {isActive ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-destructive" />
                  System Lockdown Active
                </DialogTitle>
                <DialogDescription>
                  The kill switch was activated
                  {state?.activatedBy ? ` by ${state.activatedBy}` : ""}
                  {state?.activatedAt
                    ? ` on ${new Date(state.activatedAt).toLocaleString()}`
                    : ""}
                  . Reason: {state?.reason || "No reason provided"}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">Enter recovery key to deactivate</span>
                    </div>
                    <Input
                      placeholder="Recovery key (6 characters)"
                      value={recoveryKeyInput}
                      onChange={(e) => setRecoveryKeyInput(e.target.value.toUpperCase())}
                      maxLength={6}
                      data-testid="input-recovery-key"
                    />
                    <Button
                      className="w-full"
                      variant="destructive"
                      onClick={() => deactivateMutation.mutate(recoveryKeyInput)}
                      disabled={recoveryKeyInput.length !== 6 || deactivateMutation.isPending}
                      data-testid="button-deactivate"
                    >
                      {deactivateMutation.isPending ? "Deactivating..." : "Deactivate Kill Switch"}
                    </Button>
                  </CardContent>
                </Card>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowLog(!showLog)}
                  data-testid="button-toggle-log"
                >
                  <Eye className="h-4 w-4" />
                  {showLog ? "Hide Security Log" : "View Security Log"}
                </Button>

                {showLog && state?.log && state.log.length > 0 && (
                  <Card>
                    <CardContent className="pt-4 space-y-2 max-h-60 overflow-y-auto">
                      {state.log.map((entry, i) => (
                        <div key={i} className="flex flex-wrap items-start gap-2 text-sm" data-testid={`log-entry-${i}`}>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {new Date(entry.time).toLocaleTimeString()}
                          </Badge>
                          <span className="text-muted-foreground">{entry.action}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : recoveryKeyResult ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-destructive" />
                  Kill Switch Activated
                </DialogTitle>
                <DialogDescription>
                  The system is now in emergency lockdown. Save the recovery key below. You will need it to deactivate the kill switch.
                </DialogDescription>
              </DialogHeader>

              <Card>
                <CardContent className="pt-4 flex flex-col items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground">Recovery Key</span>
                  <span
                    className="text-3xl font-mono font-bold tracking-widest"
                    data-testid="text-recovery-key"
                  >
                    {recoveryKeyResult}
                  </span>
                  <span className="text-xs text-destructive font-medium">
                    Save this key now. It will not be shown again.
                  </span>
                </CardContent>
              </Card>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose} data-testid="button-close-recovery">
                  I have saved the key
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  File Kill Switch
                </DialogTitle>
                <DialogDescription>
                  Emergency lockdown for the entire system. Activating will immediately stop all
                  processing, lock matter permissions, enable security auditing, and deploy honeypot
                  documents. Only use in case of a security breach or data compromise.
                </DialogDescription>
              </DialogHeader>

              {!confirmed ? (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        <span>All document processing will be stopped</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4 text-destructive shrink-0" />
                        <span>Matter permissions will be locked</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Eye className="h-4 w-4 text-destructive shrink-0" />
                        <span>Full audit logging will be activated</span>
                      </div>
                    </CardContent>
                  </Card>

                  <DialogFooter>
                    <Button variant="outline" onClick={handleClose} data-testid="button-cancel-kill-switch">
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setConfirmed(true)}
                      data-testid="button-confirm-kill-switch"
                    >
                      I understand, continue
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-destructive font-medium">
                        Are you sure you want to activate the kill switch? This action will
                        immediately lock down the entire system. A recovery key will be generated
                        that you must save to restore normal operations.
                      </p>
                    </CardContent>
                  </Card>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmed(false)} data-testid="button-go-back">
                      Go back
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => activateMutation.mutate(undefined)}
                      disabled={activateMutation.isPending}
                      data-testid="button-activate-kill-switch"
                    >
                      {activateMutation.isPending ? "Activating..." : "Activate Kill Switch"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
