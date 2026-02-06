import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Eye,
  Lock,
  Globe,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  Database,
  Fingerprint,
  Network,
  Gauge,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  critical: "bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200",
};

const ACTION_ICONS: Record<string, typeof Shield> = {
  auth_login: Lock,
  auth_logout: Lock,
  auth_login_failed: ShieldAlert,
  view_evidence: Eye,
  create_evidence: FileText,
  view_documents: FileText,
  create_boards: Database,
  delete_boards: AlertTriangle,
  view_clients: Users,
  create_clients: Users,
  view_matters: FileText,
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function SecurityDashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [auditPage, setAuditPage] = useState(0);
  const [auditFilter, setAuditFilter] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: securityStatus, isLoading: statusLoading } = useQuery<{
    features: Record<string, boolean>;
    stats: {
      totalAuditLogs: number;
      unresolvedSecurityEvents: number;
      recentEvents: any[];
      recentLogs: any[];
    };
  }>({
    queryKey: ["/api/security/status"],
  });

  const { data: auditData, isLoading: auditLoading } = useQuery<{
    logs: any[];
    total: number;
  }>({
    queryKey: ["/api/security/audit-logs", auditPage, actionFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("offset", String(auditPage * 20));
      if (actionFilter && actionFilter !== "all") params.set("action", actionFilter);
      const res = await fetch(`/api/security/audit-logs?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  const { data: securityEvents } = useQuery<any[]>({
    queryKey: ["/api/security/events"],
  });

  const { data: sessionInfo } = useQuery<{
    initialIp: string | null;
    lastIp: string | null;
    lastActivity: string | null;
    currentIp: string;
    ipHistory: Array<{ ip: string; timestamp: string }>;
  }>({
    queryKey: ["/api/security/session-info"],
  });

  const resolveEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await apiRequest("PATCH", `/api/security/events/${eventId}/resolve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/security/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/security/status"] });
      toast({ title: "Event resolved" });
    },
  });

  const features = securityStatus?.features || {};
  const stats = securityStatus?.stats;

  const featureGroups = [
    {
      title: "Network Security",
      icon: Globe,
      items: [
        { name: "Security Headers (Helmet)", key: "securityHeaders", description: "HSTS, CSP, X-Frame-Options, X-Content-Type-Options" },
        { name: "Rate Limiting", key: "rateLimiting", description: "Global API rate limits + stricter auth limits" },
        { name: "CORS Protection", key: "corsProtection", description: "Origin whitelist for cross-origin requests" },
        { name: "SSRF Protection", key: "ssrfProtection", description: "Gateway URL validation for external connections" },
      ],
    },
    {
      title: "Authentication & Sessions",
      icon: Lock,
      items: [
        { name: "Role-Based Access Control", key: "rbacEnabled", description: "Admin, Member, Viewer role tiers" },
        { name: "Encrypted Sessions", key: "encryptedSessions", description: "PostgreSQL-backed session storage" },
        { name: "HTTPOnly Cookies", key: "httpOnlyCookies", description: "Prevents client-side cookie access" },
        { name: "Secure Cookies", key: "secureCookies", description: "Cookies only sent over HTTPS" },
        { name: "SameSite Cookies", key: "sameSiteCookies", description: "Cross-site request protection" },
        { name: "Session IP Tracking", key: "sessionIpTracking", description: "Monitors IP changes per session" },
      ],
    },
    {
      title: "Data Protection",
      icon: Database,
      items: [
        { name: "XSS Sanitization", key: "xssSanitization", description: "Input sanitization for request bodies" },
        { name: "Input Validation", key: "inputValidation", description: "Zod schema validation on all API endpoints" },
        { name: "Audit Logging", key: "auditLogging", description: "Comprehensive user action tracking" },
        { name: "Evidence Chain of Custody", key: "evidenceChainOfCustody", description: "SHA-256 hash verification for evidence files" },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-security-title">Security Center</h1>
            <p className="text-sm text-muted-foreground">Monitor security features, audit logs, and threat events</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Security Features</p>
                    <p className="text-2xl font-bold" data-testid="text-features-active">
                      {Object.values(features).filter(Boolean).length}/{Object.keys(features).length}
                    </p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Audit Events</p>
                    <p className="text-2xl font-bold" data-testid="text-audit-count">
                      {stats?.totalAuditLogs ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Total logged</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Security Alerts</p>
                    <p className="text-2xl font-bold" data-testid="text-alerts-count">
                      {stats?.unresolvedSecurityEvents ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Unresolved</p>
                  </div>
                  <div className={`p-3 rounded-lg ${(stats?.unresolvedSecurityEvents ?? 0) > 0 ? "bg-yellow-100 dark:bg-yellow-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
                    {(stats?.unresolvedSecurityEvents ?? 0) > 0 
                      ? <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      : <CheckCircle2 className="h-5 w-5 text-green-600" />
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Session</p>
                    <p className="text-sm font-mono font-medium" data-testid="text-session-ip">
                      {sessionInfo?.currentIp || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sessionInfo?.lastActivity ? formatTimeAgo(sessionInfo.lastActivity) : "Active"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Fingerprint className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview" data-testid="tab-overview">
                <Gauge className="h-4 w-4 mr-1" />
                Security Features
              </TabsTrigger>
              <TabsTrigger value="audit" data-testid="tab-audit">
                <Activity className="h-4 w-4 mr-1" />
                Audit Log
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events">
                <ShieldAlert className="h-4 w-4 mr-1" />
                Security Events
              </TabsTrigger>
              <TabsTrigger value="session" data-testid="tab-session">
                <Network className="h-4 w-4 mr-1" />
                Session Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              {featureGroups.map((group) => (
                <Card key={group.title}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <group.icon className="h-4 w-4" />
                      {group.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {group.items.map((item) => {
                        const isActive = features[item.key];
                        return (
                          <div key={item.key} className="flex items-center justify-between gap-4" data-testid={`feature-${item.key}`}>
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {isActive ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{item.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                              </div>
                            </div>
                            <Badge variant={isActive ? "default" : "destructive"} className="shrink-0">
                              {isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="audit" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <CardTitle className="text-base">Audit Trail</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setAuditPage(0); }}>
                        <SelectTrigger className="w-[180px]" data-testid="select-action-filter">
                          <SelectValue placeholder="Filter by action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Actions</SelectItem>
                          <SelectItem value="auth_login">Login</SelectItem>
                          <SelectItem value="auth_logout">Logout</SelectItem>
                          <SelectItem value="create_boards">Create Board</SelectItem>
                          <SelectItem value="view_evidence">View Evidence</SelectItem>
                          <SelectItem value="create_evidence">Create Evidence</SelectItem>
                          <SelectItem value="view_documents">View Documents</SelectItem>
                          <SelectItem value="create_clients">Create Client</SelectItem>
                          <SelectItem value="delete_boards">Delete Board</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/security/audit-logs"] });
                        }}
                        data-testid="button-refresh-audit"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {auditLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {(auditData?.logs || []).length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No audit events recorded yet</p>
                            <p className="text-xs">Activity will appear here as users interact with the system</p>
                          </div>
                        ) : (
                          (auditData?.logs || []).map((log: any) => {
                            const IconComponent = ACTION_ICONS[log.action] || Activity;
                            return (
                              <div
                                key={log.id}
                                className="flex items-start gap-3 p-3 rounded-md border"
                                data-testid={`audit-log-${log.id}`}
                              >
                                <div className={`p-1.5 rounded-md ${SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.info}`}>
                                  <IconComponent className="h-3 w-3" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">{log.action}</span>
                                    {log.resourceType && (
                                      <Badge variant="outline" className="text-xs">
                                        {log.resourceType}{log.resourceId ? ` #${log.resourceId.substring(0, 8)}` : ""}
                                      </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                      {log.method}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                    <span>{log.userEmail || "System"}</span>
                                    <span>{log.ipAddress}</span>
                                    <span>{formatDate(log.createdAt)}</span>
                                    {log.statusCode && (
                                      <span className={log.statusCode >= 400 ? "text-red-500" : ""}>
                                        HTTP {log.statusCode}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {(auditData?.total ?? 0) > 20 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                          <p className="text-sm text-muted-foreground">
                            Showing {auditPage * 20 + 1}-{Math.min((auditPage + 1) * 20, auditData?.total ?? 0)} of {auditData?.total ?? 0}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={auditPage === 0}
                              onClick={() => setAuditPage((p) => Math.max(0, p - 1))}
                              data-testid="button-audit-prev"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={(auditPage + 1) * 20 >= (auditData?.total ?? 0)}
                              onClick={() => setAuditPage((p) => p + 1)}
                              data-testid="button-audit-next"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Security Events</CardTitle>
                </CardHeader>
                <CardContent>
                  {(securityEvents || []).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No security events detected</p>
                      <p className="text-xs">The system is operating normally</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(securityEvents || []).map((event: any) => (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 p-3 rounded-md border"
                          data-testid={`security-event-${event.id}`}
                        >
                          <div className={`p-1.5 rounded-md ${SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.warning}`}>
                            <ShieldAlert className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{event.eventType}</span>
                              <Badge variant={event.resolved ? "secondary" : "destructive"} className="text-xs">
                                {event.resolved ? "Resolved" : "Active"}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {event.severity}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span>{event.ipAddress || "Unknown IP"}</span>
                              <span>{formatDate(event.createdAt)}</span>
                            </div>
                            {event.details && Object.keys(event.details).length > 0 && (
                              <div className="mt-2 p-2 rounded bg-muted/50 text-xs font-mono">
                                {JSON.stringify(event.details, null, 2)}
                              </div>
                            )}
                          </div>
                          {!event.resolved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resolveEventMutation.mutate(event.id)}
                              disabled={resolveEventMutation.isPending}
                              data-testid={`button-resolve-${event.id}`}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="session" className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Current Session Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Current IP Address</p>
                        <p className="text-sm font-mono" data-testid="text-current-ip">{sessionInfo?.currentIp || "Unknown"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Initial Login IP</p>
                        <p className="text-sm font-mono" data-testid="text-initial-ip">{sessionInfo?.initialIp || "Not tracked"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Last Activity</p>
                        <p className="text-sm" data-testid="text-last-activity">
                          {sessionInfo?.lastActivity ? formatDate(sessionInfo.lastActivity) : "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">IP Match Status</p>
                        <div className="flex items-center gap-2">
                          {sessionInfo?.initialIp === sessionInfo?.lastIp ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">Consistent</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm text-yellow-600">IP Changed</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {(sessionInfo?.ipHistory || []).length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">IP History</p>
                        <div className="space-y-1">
                          {(sessionInfo?.ipHistory || []).map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-xs p-2 rounded bg-muted/50">
                              <Network className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono">{entry.ip}</span>
                              <span className="text-muted-foreground">{formatDate(entry.timestamp)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Security Compliance Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: "AES-256 equivalent encryption at rest", status: true, note: "PostgreSQL with Neon infrastructure" },
                      { label: "TLS 1.2+ encryption in transit", status: true, note: "HTTPS enforced via HSTS" },
                      { label: "Multi-factor authentication", status: true, note: "Via OAuth/OIDC providers (Google, GitHub, Apple)" },
                      { label: "Role-based access control", status: true, note: "Admin, Member, Viewer tiers" },
                      { label: "Comprehensive audit logging", status: true, note: "All API actions logged with user, IP, timestamp" },
                      { label: "Session IP monitoring", status: true, note: "IP changes detected and logged" },
                      { label: "Rate limiting on auth endpoints", status: true, note: "20 attempts per 15 minutes" },
                      { label: "Content Security Policy", status: true, note: "Strict CSP headers via Helmet" },
                      { label: "XSS protection", status: true, note: "Input sanitization + security headers" },
                      { label: "CORS origin whitelist", status: true, note: "Only Replit domains allowed" },
                      { label: "Evidence chain of custody", status: true, note: "SHA-256 hash verification" },
                      { label: "Clickjacking protection", status: true, note: "X-Frame-Options: DENY" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
