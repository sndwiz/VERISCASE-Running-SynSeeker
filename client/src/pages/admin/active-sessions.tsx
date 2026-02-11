import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Monitor, LogOut, Globe, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ActiveSession {
  sid: string;
  userId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  lastActivity: string | null;
  lastIp: string | null;
  initialIp: string | null;
  ipHistory: Array<{ ip: string; timestamp: string }>;
  expiresAt: string;
  isCurrent: boolean;
}

const AVATAR_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1"
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return "??";
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getActivityStatus(lastActivity: string | null): "active" | "idle" | "inactive" {
  if (!lastActivity) return "inactive";
  const diffMs = Date.now() - new Date(lastActivity).getTime();
  const diffMins = diffMs / 60000;
  if (diffMins < 15) return "active";
  if (diffMins < 60) return "idle";
  return "inactive";
}

export default function ActiveSessionsPage() {
  const { toast } = useToast();

  const { data: sessions, isLoading, refetch } = useQuery<ActiveSession[]>({
    queryKey: ["/api/admin/sessions"],
    refetchInterval: 30000,
  });

  const terminateMutation = useMutation({
    mutationFn: (sid: string) =>
      apiRequest("DELETE", `/api/admin/sessions/${sid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sessions"] });
      toast({ title: "Session terminated" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to terminate session",
        description: error?.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const uniqueUsers = sessions
    ? Array.from(new Map(sessions.map(s => [s.userId, s])).values())
    : [];

  const activeCount = sessions?.filter(s => getActivityStatus(s.lastActivity) === "active").length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Active Sessions
            </CardTitle>
            <CardDescription className="mt-1">
              Monitor who is currently logged in and manage their sessions
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh-sessions"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">
                {activeCount} active now
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
              <span className="text-sm text-muted-foreground">
                {uniqueUsers.length} unique user{uniqueUsers.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
              <span className="text-sm text-muted-foreground">
                {sessions?.length ?? 0} total session{(sessions?.length ?? 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No active sessions found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const status = getActivityStatus(session.lastActivity);
                    const displayName = session.firstName && session.lastName
                      ? `${session.firstName} ${session.lastName}`
                      : session.email || session.userId;
                    return (
                      <TableRow key={session.sid} data-testid={`row-session-${session.sid}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback
                                style={{ backgroundColor: getColorForUser(session.userId), color: "white", fontSize: "0.7rem" }}
                              >
                                {getInitials(session.firstName, session.lastName, session.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2 font-medium text-sm" data-testid={`text-session-user-${session.sid}`}>
                                {displayName}
                                {session.isCurrent && (
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                )}
                              </div>
                              {session.email && session.firstName && (
                                <div className="text-xs text-muted-foreground">
                                  {session.email}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {status === "active" && (
                            <Badge variant="default" data-testid={`badge-status-${session.sid}`}>
                              <div className="h-1.5 w-1.5 rounded-full bg-green-300 mr-1.5" />
                              Active
                            </Badge>
                          )}
                          {status === "idle" && (
                            <Badge variant="secondary" data-testid={`badge-status-${session.sid}`}>
                              <div className="h-1.5 w-1.5 rounded-full bg-yellow-400 mr-1.5" />
                              Idle
                            </Badge>
                          )}
                          {status === "inactive" && (
                            <Badge variant="outline" data-testid={`badge-status-${session.sid}`}>
                              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 mr-1.5" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTimeAgo(session.lastActivity)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-mono">
                            <Globe className="h-3.5 w-3.5" />
                            {session.lastIp || "Unknown"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(session.expiresAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          {session.isCurrent ? (
                            <span className="text-xs text-muted-foreground">Current</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => terminateMutation.mutate(session.sid)}
                              disabled={terminateMutation.isPending}
                              data-testid={`button-terminate-${session.sid}`}
                            >
                              <LogOut className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
