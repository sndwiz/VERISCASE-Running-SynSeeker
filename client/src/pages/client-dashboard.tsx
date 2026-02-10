import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Users,
  Briefcase,
  Search,
  Building2,
  Phone,
  Mail,
  ArrowRight,
  Calendar,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Loader2,
  Gavel,
  MapPin,
  Eye,
  TrendingUp,
  Scale,
  ChevronRight,
} from "lucide-react";
import type { Client, Matter, CalendarEvent, Board } from "@shared/schema";

type CalendarEventType = "court-date" | "hearing" | "deadline" | "meeting" | "deposition" | "filing" | "reminder" | "other";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Active", color: "bg-green-500", icon: CheckCircle2 },
  pending: { label: "Pending", color: "bg-amber-500", icon: Clock },
  "on-hold": { label: "On Hold", color: "bg-blue-500", icon: PauseCircle },
  closed: { label: "Closed", color: "bg-gray-500", icon: XCircle },
};

const eventTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  "court-date": { label: "Court Date", color: "text-red-600 dark:text-red-400", icon: Gavel },
  hearing: { label: "Hearing", color: "text-orange-600 dark:text-orange-400", icon: Gavel },
  deadline: { label: "Deadline", color: "text-amber-600 dark:text-amber-400", icon: Clock },
  meeting: { label: "Meeting", color: "text-blue-600 dark:text-blue-400", icon: Users },
  deposition: { label: "Deposition", color: "text-purple-600 dark:text-purple-400", icon: Users },
  filing: { label: "Filing", color: "text-green-600 dark:text-green-400", icon: FileText },
  reminder: { label: "Reminder", color: "text-teal-600 dark:text-teal-400", icon: Calendar },
  other: { label: "Other", color: "text-gray-600 dark:text-gray-400", icon: Calendar },
};

function ContextDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isFuture(dateStr: string): boolean {
  return daysUntil(dateStr) >= 0;
}

export default function ClientDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [contextItem, setContextItem] = useState<{ type: string; data: any } | null>(null);

  const { data: clients = [], isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });
  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
  });

  const today = new Date().toISOString().split("T")[0];

  const clientSummaries = useMemo(() => {
    return clients.map((client) => {
      const clientMatters = matters.filter((m) => m.clientId === client.id);
      const activeMatters = clientMatters.filter((m) => m.status === "active");
      const pendingMatters = clientMatters.filter((m) => m.status === "pending");
      const closedMatters = clientMatters.filter((m) => m.status === "closed");
      const onHoldMatters = clientMatters.filter((m) => m.status === "on-hold");

      const matterIds = clientMatters.map((m) => m.id);
      const clientEvents = events.filter((e) => e.matterId && matterIds.includes(e.matterId));
      const futureEvents = clientEvents.filter((e) => isFuture(e.startDate)).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
      const futureFilings = futureEvents.filter((e) => e.eventType === "filing");
      const nextEvent = futureEvents[0];
      const upcomingDeadlines = futureEvents.filter((e) => e.eventType === "deadline" || e.eventType === "court-date" || e.eventType === "hearing");

      let healthStatus: "good" | "warning" | "critical" = "good";
      if (upcomingDeadlines.some((d) => daysUntil(d.startDate) <= 3)) healthStatus = "critical";
      else if (upcomingDeadlines.some((d) => daysUntil(d.startDate) <= 7)) healthStatus = "warning";

      return {
        client,
        totalMatters: clientMatters.length,
        activeMatters: activeMatters.length,
        pendingMatters: pendingMatters.length,
        closedMatters: closedMatters.length,
        onHoldMatters: onHoldMatters.length,
        futureEvents,
        futureFilings,
        nextEvent,
        upcomingDeadlines,
        healthStatus,
        matters: clientMatters,
      };
    });
  }, [clients, matters, events]);

  const filtered = useMemo(() => {
    if (!searchQuery) return clientSummaries;
    const q = searchQuery.toLowerCase();
    return clientSummaries.filter(
      (s) =>
        s.client.name.toLowerCase().includes(q) ||
        s.client.email?.toLowerCase().includes(q) ||
        s.client.company?.toLowerCase().includes(q)
    );
  }, [clientSummaries, searchQuery]);

  const totalActiveMatters = matters.filter((m) => m.status === "active").length;
  const totalFutureFilings = events.filter((e) => e.eventType === "filing" && isFuture(e.startDate)).length;
  const criticalClients = clientSummaries.filter((s) => s.healthStatus === "critical").length;

  if (loadingClients) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderEventContext = (event: CalendarEvent) => {
    const cfg = eventTypeConfig[event.eventType] || eventTypeConfig.other;
    const Icon = cfg.icon;
    const matter = matters.find((m) => m.id === event.matterId);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${cfg.color}`} />
          <Badge variant="outline">{cfg.label}</Badge>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Date</span>
            <span className="font-medium">{formatDate(event.startDate)}</span>
          </div>
          {event.endDate && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">End Date</span>
              <span className="font-medium">{formatDate(event.endDate)}</span>
            </div>
          )}
          {event.location && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{event.location}</span>
            </div>
          )}
          {matter && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Matter</span>
              <span className="font-medium">{matter.name}</span>
            </div>
          )}
          {event.description && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">Description</span>
              <p className="mt-1">{event.description}</p>
            </div>
          )}
          {event.attendees && event.attendees.length > 0 && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">Attendees</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {event.attendees.map((a, i) => (
                  <Badge key={i} variant="secondary">{a}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {daysUntil(event.startDate) === 0
              ? "Today"
              : daysUntil(event.startDate) > 0
              ? `In ${daysUntil(event.startDate)} days`
              : `${Math.abs(daysUntil(event.startDate))} days ago`}
          </span>
        </div>
      </div>
    );
  };

  const renderMatterContext = (matter: Matter) => {
    const statusCfg = statusConfig[matter.status] || statusConfig.active;
    const StatusIcon = statusCfg.icon;
    const matterEvents = events
      .filter((e) => e.matterId === matter.id && isFuture(e.startDate))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusCfg.color}`} />
          <Badge variant="outline">{statusCfg.label}</Badge>
          {matter.caseNumber && (
            <Badge variant="secondary">#{matter.caseNumber}</Badge>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Practice Area</span>
            <span className="font-medium">{matter.practiceArea}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Type</span>
            <span className="font-medium">{matter.matterType}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Opened</span>
            <span className="font-medium">{formatDate(matter.openedDate)}</span>
          </div>
          {matter.courtName && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Court</span>
              <span className="font-medium">{matter.courtName}</span>
            </div>
          )}
          {matter.judgeAssigned && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Judge</span>
              <span className="font-medium">{matter.judgeAssigned}</span>
            </div>
          )}
          {matter.opposingCounsel && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Opposing Counsel</span>
              <span className="font-medium">{matter.opposingCounsel}</span>
            </div>
          )}
          {matter.description && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">Description</span>
              <p className="mt-1">{matter.description}</p>
            </div>
          )}
        </div>
        {matterEvents.length > 0 && (
          <div className="pt-2 border-t">
            <span className="text-xs font-semibold text-muted-foreground">Upcoming Events ({matterEvents.length})</span>
            <div className="space-y-1.5 mt-1.5">
              {matterEvents.slice(0, 5).map((ev) => {
                const cfg = eventTypeConfig[ev.eventType] || eventTypeConfig.other;
                const Icon = cfg.icon;
                return (
                  <div key={ev.id} className="flex items-center gap-2 text-xs">
                    <Icon className={`h-3 w-3 shrink-0 ${cfg.color}`} />
                    <span className="truncate flex-1">{ev.title}</span>
                    <span className="text-muted-foreground shrink-0">{formatDate(ev.startDate)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="pt-2 border-t">
          <Link href={`/client-dashboard/${matters.find((m) => m.id === matter.id)?.clientId}`}>
            <Button variant="outline" className="w-full" data-testid={`button-view-client-${matter.clientId}`}>
              <Eye className="h-4 w-4 mr-2" />
              View Client Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  };

  const renderClientContext = (summary: typeof clientSummaries[0]) => (
    <div className="space-y-3">
      <div className="space-y-2 text-sm">
        {summary.client.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{summary.client.email}</span>
          </div>
        )}
        {summary.client.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{summary.client.phone}</span>
          </div>
        )}
        {summary.client.company && (
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{summary.client.company}</span>
          </div>
        )}
        {summary.client.address && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{summary.client.address}</span>
          </div>
        )}
      </div>
      <div className="pt-2 border-t space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Total Matters</span>
          <span className="font-medium">{summary.totalMatters}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Active</span>
          <span className="font-medium text-green-600 dark:text-green-400">{summary.activeMatters}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Pending</span>
          <span className="font-medium text-amber-600 dark:text-amber-400">{summary.pendingMatters}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Client Since</span>
          <span className="font-medium">{formatDate(summary.client.createdAt)}</span>
        </div>
      </div>
      {summary.client.notes && (
        <div className="pt-2 border-t">
          <span className="text-xs text-muted-foreground">Notes</span>
          <p className="text-sm mt-1">{summary.client.notes}</p>
        </div>
      )}
    </div>
  );

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6" data-testid="page-client-dashboard">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Client Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of all clients, cases, and upcoming activities</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="stat-total-clients">{clients.length}</div>
                <div className="text-xs text-muted-foreground">Total Clients</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-500/10">
                <Briefcase className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="stat-active-matters">{totalActiveMatters}</div>
                <div className="text-xs text-muted-foreground">Active Matters</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-purple-500/10">
                <FileText className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="stat-future-filings">{totalFutureFilings}</div>
                <div className="text-xs text-muted-foreground">Upcoming Filings</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className="p-2 rounded-md bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold" data-testid="stat-critical-clients">{criticalClients}</div>
                <div className="text-xs text-muted-foreground">Needs Attention</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-clients"
          />
        </div>

        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No clients found</p>
            </div>
          )}

          {filtered.map((summary) => {
            const healthColor =
              summary.healthStatus === "critical"
                ? "border-red-500/50"
                : summary.healthStatus === "warning"
                ? "border-amber-500/50"
                : "";

            return (
              <Card key={summary.client.id} className={healthColor} data-testid={`client-card-${summary.client.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {summary.client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            className="font-semibold text-sm hover:underline text-left"
                            onClick={() => setContextItem({ type: "client", data: summary })}
                            data-testid={`button-client-info-${summary.client.id}`}
                          >
                            {summary.client.name}
                          </button>
                          {summary.healthStatus === "critical" && (
                            <Badge variant="destructive" className="text-[10px]">Urgent</Badge>
                          )}
                          {summary.healthStatus === "warning" && (
                            <Badge className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30" variant="outline">
                              Attention
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          {summary.client.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {summary.client.company}
                            </span>
                          )}
                          {summary.client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {summary.client.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/client-dashboard/${summary.client.id}`}>
                        <Button variant="outline" data-testid={`button-view-dashboard-${summary.client.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Cases
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">{summary.activeMatters}</div>
                      <div className="text-[10px] text-muted-foreground">Active</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{summary.pendingMatters}</div>
                      <div className="text-[10px] text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.onHoldMatters}</div>
                      <div className="text-[10px] text-muted-foreground">On Hold</div>
                    </div>
                    <div className="text-center p-2 rounded-md bg-muted/50">
                      <div className="text-lg font-bold">{summary.closedMatters}</div>
                      <div className="text-[10px] text-muted-foreground">Closed</div>
                    </div>
                  </div>

                  {(summary.futureFilings.length > 0 || summary.nextEvent) && (
                    <div className="mt-3 flex items-center gap-4 flex-wrap text-xs">
                      {summary.nextEvent && (
                        <button
                          className="flex items-center gap-1.5 hover:underline"
                          onClick={() => setContextItem({ type: "event", data: summary.nextEvent })}
                          data-testid={`button-next-event-${summary.client.id}`}
                        >
                          <Calendar className="h-3 w-3 text-blue-500" />
                          <span className="text-muted-foreground">Next:</span>
                          <span className="font-medium">{summary.nextEvent.title}</span>
                          <span className="text-muted-foreground">({formatDate(summary.nextEvent.startDate)})</span>
                        </button>
                      )}
                      {summary.futureFilings.length > 0 && (
                        <button
                          className="flex items-center gap-1.5 hover:underline"
                          onClick={() => setContextItem({ type: "filings", data: { filings: summary.futureFilings, clientName: summary.client.name } })}
                          data-testid={`button-filings-${summary.client.id}`}
                        >
                          <FileText className="h-3 w-3 text-green-500" />
                          <span className="font-medium">{summary.futureFilings.length} upcoming filing{summary.futureFilings.length !== 1 ? "s" : ""}</span>
                        </button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <ContextDialog
          open={contextItem !== null}
          onClose={() => setContextItem(null)}
          title={
            contextItem?.type === "client"
              ? contextItem.data.client.name
              : contextItem?.type === "event"
              ? contextItem.data.title
              : contextItem?.type === "matter"
              ? contextItem.data.name
              : contextItem?.type === "filings"
              ? `Upcoming Filings — ${contextItem.data.clientName}`
              : "Details"
          }
        >
          {contextItem?.type === "client" && renderClientContext(contextItem.data)}
          {contextItem?.type === "event" && renderEventContext(contextItem.data)}
          {contextItem?.type === "matter" && renderMatterContext(contextItem.data)}
          {contextItem?.type === "filings" && (
            <div className="space-y-2">
              {contextItem.data.filings.map((f: CalendarEvent) => (
                <div key={f.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                  <FileText className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <button
                      className="text-sm font-medium hover:underline text-left truncate block w-full"
                      onClick={() => setContextItem({ type: "event", data: f })}
                      data-testid={`button-filing-detail-${f.id}`}
                    >
                      {f.title}
                    </button>
                    {f.description && <p className="text-xs text-muted-foreground truncate">{f.description}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(f.startDate)}</span>
                </div>
              ))}
            </div>
          )}
        </ContextDialog>
      </div>
    </ScrollArea>
  );
}
