import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Gavel,
  Loader2,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  Scale,
  Users,
  XCircle,
  AlertTriangle,
  Eye,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import type { Client, Matter, CalendarEvent, Board } from "@shared/schema";

type CalendarEventType = "court-date" | "hearing" | "deadline" | "meeting" | "deposition" | "filing" | "reminder" | "other";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  active: { label: "Active", color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500", icon: CheckCircle2 },
  pending: { label: "Pending", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500", icon: Clock },
  "on-hold": { label: "On Hold", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500", icon: PauseCircle },
  closed: { label: "Closed", color: "text-gray-500", bgColor: "bg-gray-500", icon: XCircle },
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

export default function ClientDetailDashboard() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const [contextItem, setContextItem] = useState<{ type: string; data: any } | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: client, isLoading: loadingClient } = useQuery<Client>({
    queryKey: ["/api/clients", clientId],
    enabled: !!clientId,
  });

  const { data: allMatters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
  });

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
  });

  const clientMatters = useMemo(() => allMatters.filter((m) => m.clientId === clientId), [allMatters, clientId]);

  const filteredMatters = useMemo(() => {
    if (statusFilter === "all") return clientMatters;
    return clientMatters.filter((m) => m.status === statusFilter);
  }, [clientMatters, statusFilter]);

  const matterIds = useMemo(() => clientMatters.map((m) => m.id), [clientMatters]);

  const clientEvents = useMemo(
    () => events.filter((e) => e.matterId && matterIds.includes(e.matterId)),
    [events, matterIds]
  );

  const futureEvents = useMemo(
    () =>
      clientEvents
        .filter((e) => isFuture(e.startDate))
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [clientEvents]
  );

  const futureFilings = useMemo(() => futureEvents.filter((e) => e.eventType === "filing"), [futureEvents]);
  const upcomingDeadlines = useMemo(
    () => futureEvents.filter((e) => e.eventType === "deadline" || e.eventType === "court-date" || e.eventType === "hearing"),
    [futureEvents]
  );

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, pending: 0, "on-hold": 0, closed: 0 };
    clientMatters.forEach((m) => {
      counts[m.status] = (counts[m.status] || 0) + 1;
    });
    return counts;
  }, [clientMatters]);

  if (loadingClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="client-not-found">
        <div className="text-center text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm" data-testid="text-not-found">Client not found</p>
          <Link href="/client-dashboard">
            <Button variant="outline" className="mt-4" data-testid="button-back-to-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderEventContext = (event: CalendarEvent) => {
    const cfg = eventTypeConfig[event.eventType] || eventTypeConfig.other;
    const Icon = cfg.icon;
    const matter = allMatters.find((m) => m.id === event.matterId);
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
    const sCfg = statusConfig[matter.status] || statusConfig.active;
    const StatusIcon = sCfg.icon;
    const matterEvents = events
      .filter((e) => e.matterId === matter.id && isFuture(e.startDate))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const matterBoard = boards.find((b) => b.matterId === matter.id);

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${sCfg.bgColor}`} />
          <Badge variant="outline">{sCfg.label}</Badge>
          {matter.caseNumber && <Badge variant="secondary">#{matter.caseNumber}</Badge>}
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
          {matter.closedDate && (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Closed</span>
              <span className="font-medium">{formatDate(matter.closedDate)}</span>
            </div>
          )}
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
          {matter.assignedAttorneys && matter.assignedAttorneys.length > 0 && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">Assigned Attorneys</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {matter.assignedAttorneys.map((a, i) => (
                  <Badge key={i} variant="secondary">{a.name || "Unknown"}</Badge>
                ))}
              </div>
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
                  <button
                    key={ev.id}
                    className="flex items-center gap-2 text-xs w-full hover:underline text-left"
                    onClick={() => setContextItem({ type: "event", data: ev })}
                    data-testid={`button-context-event-${ev.id}`}
                  >
                    <Icon className={`h-3 w-3 shrink-0 ${cfg.color}`} />
                    <span className="truncate flex-1">{ev.title}</span>
                    <span className="text-muted-foreground shrink-0">{formatDate(ev.startDate)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {matterBoard && (
          <div className="pt-2 border-t">
            <Link href={`/boards/${matterBoard.id}`}>
              <Button variant="outline" className="w-full" data-testid={`button-open-board-${matter.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                Open Case Board
              </Button>
            </Link>
          </div>
        )}
      </div>
    );
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 md:p-6 space-y-4 md:space-y-6" data-testid="page-client-detail-dashboard">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/client-dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back-dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-semibold truncate" data-testid="text-client-name">{client.name}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5 flex-wrap">
              {client.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {client.company}
                </span>
              )}
              {client.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {client.email}
                </span>
              )}
              {client.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {client.phone}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const StatusIcon = cfg.icon;
            return (
              <Card
                key={key}
                className={`cursor-pointer ${statusFilter === key ? "ring-2 ring-primary" : ""}`}
                onClick={() => setStatusFilter(statusFilter === key ? "all" : key)}
                data-testid={`filter-status-${key}`}
              >
                <CardContent className="pt-3 pb-3 flex items-center gap-3">
                  <StatusIcon className={`h-5 w-5 ${cfg.color} shrink-0`} />
                  <div>
                    <div className="text-xl font-bold">{statusCounts[key] || 0}</div>
                    <div className="text-[10px] text-muted-foreground">{cfg.label}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="cases" className="space-y-4">
          <TabsList>
            <TabsTrigger value="cases" data-testid="tab-cases">
              <Briefcase className="h-4 w-4 mr-2" />
              Cases ({filteredMatters.length})
            </TabsTrigger>
            <TabsTrigger value="filings" data-testid="tab-filings">
              <FileText className="h-4 w-4 mr-2" />
              Future Filings ({futureFilings.length})
            </TabsTrigger>
            <TabsTrigger value="dates" data-testid="tab-dates">
              <Calendar className="h-4 w-4 mr-2" />
              Key Dates ({futureEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases" className="space-y-4">
            {filteredMatters.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {statusFilter !== "all" ? `No ${statusConfig[statusFilter]?.label.toLowerCase()} matters` : "No matters for this client"}
                </p>
              </div>
            ) : (
              filteredMatters.map((matter) => {
                const sCfg = statusConfig[matter.status] || statusConfig.active;
                const StatusIcon = sCfg.icon;
                const matterEvents = events
                  .filter((e) => e.matterId === matter.id && isFuture(e.startDate))
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                const nextFiling = matterEvents.find((e) => e.eventType === "filing");
                const nextDeadline = matterEvents.find(
                  (e) => e.eventType === "deadline" || e.eventType === "court-date" || e.eventType === "hearing"
                );
                const matterBoard = boards.find((b) => b.matterId === matter.id);
                const urgentDeadline = nextDeadline && daysUntil(nextDeadline.startDate) <= 3;

                return (
                  <Card key={matter.id} className={urgentDeadline ? "border-red-500/50" : ""} data-testid={`matter-card-${matter.id}`}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              className="font-semibold text-sm hover:underline text-left"
                              onClick={() => setContextItem({ type: "matter", data: matter })}
                              data-testid={`button-matter-info-${matter.id}`}
                            >
                              {matter.name}
                            </button>
                            <Badge variant="outline" className="text-[10px]">
                              <StatusIcon className={`h-3 w-3 mr-1 ${sCfg.color}`} />
                              {sCfg.label}
                            </Badge>
                            {matter.caseNumber && (
                              <Badge variant="secondary" className="text-[10px]">#{matter.caseNumber}</Badge>
                            )}
                            {urgentDeadline && (
                              <Badge variant="destructive" className="text-[10px]">Urgent Deadline</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              {matter.practiceArea}
                            </span>
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {matter.matterType}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Opened {formatDate(matter.openedDate)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setContextItem({ type: "matter", data: matter })}
                            data-testid={`button-matter-context-${matter.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {matterBoard && (
                            <Link href={`/boards/${matterBoard.id}`}>
                              <Button variant="outline" data-testid={`button-open-board-${matter.id}`}>
                                Board
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {matter.courtName && (
                          <button
                            className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs hover-elevate text-left"
                            onClick={() => setContextItem({ type: "matter", data: matter })}
                            data-testid={`button-court-${matter.id}`}
                          >
                            <Gavel className="h-3.5 w-3.5 text-red-500 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-muted-foreground">Court</div>
                              <div className="font-medium truncate">{matter.courtName}</div>
                            </div>
                          </button>
                        )}

                        {nextDeadline && (
                          <button
                            className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs hover-elevate text-left"
                            onClick={() => setContextItem({ type: "event", data: nextDeadline })}
                            data-testid={`button-next-deadline-${matter.id}`}
                          >
                            <Clock className={`h-3.5 w-3.5 shrink-0 ${urgentDeadline ? "text-red-500" : "text-amber-500"}`} />
                            <div className="min-w-0">
                              <div className="text-muted-foreground">Next Deadline</div>
                              <div className="font-medium truncate">{nextDeadline.title}</div>
                              <div className="text-muted-foreground">{formatDate(nextDeadline.startDate)}</div>
                            </div>
                          </button>
                        )}

                        {nextFiling && (
                          <button
                            className="flex items-center gap-2 p-2 rounded-md bg-muted/50 text-xs hover-elevate text-left"
                            onClick={() => setContextItem({ type: "event", data: nextFiling })}
                            data-testid={`button-next-filing-${matter.id}`}
                          >
                            <FileText className="h-3.5 w-3.5 text-green-500 shrink-0" />
                            <div className="min-w-0">
                              <div className="text-muted-foreground">Next Filing</div>
                              <div className="font-medium truncate">{nextFiling.title}</div>
                              <div className="text-muted-foreground">{formatDate(nextFiling.startDate)}</div>
                            </div>
                          </button>
                        )}
                      </div>

                      {matterEvents.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-muted-foreground">Upcoming Events ({matterEvents.length})</span>
                          </div>
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {matterEvents.slice(0, 4).map((ev) => {
                              const cfg = eventTypeConfig[ev.eventType] || eventTypeConfig.other;
                              const Icon = cfg.icon;
                              return (
                                <button
                                  key={ev.id}
                                  className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-muted/30 hover-elevate shrink-0"
                                  onClick={() => setContextItem({ type: "event", data: ev })}
                                  data-testid={`button-event-${ev.id}`}
                                >
                                  <Icon className={`h-3 w-3 ${cfg.color}`} />
                                  <span className="truncate max-w-[120px]">{ev.title}</span>
                                  <span className="text-muted-foreground">{formatDate(ev.startDate)}</span>
                                </button>
                              );
                            })}
                            {matterEvents.length > 4 && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">+{matterEvents.length - 4} more</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="filings" className="space-y-3">
            {futureFilings.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No upcoming filings</p>
              </div>
            ) : (
              futureFilings.map((filing) => {
                const matter = allMatters.find((m) => m.id === filing.matterId);
                const urgent = daysUntil(filing.startDate) <= 3;
                return (
                  <Card key={filing.id} className={urgent ? "border-red-500/50" : ""} data-testid={`filing-card-${filing.id}`}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <button
                            className="font-semibold text-sm hover:underline text-left"
                            onClick={() => setContextItem({ type: "event", data: filing })}
                            data-testid={`button-filing-info-${filing.id}`}
                          >
                            {filing.title}
                          </button>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            {matter && (
                              <button
                                className="flex items-center gap-1 hover:underline"
                                onClick={() => setContextItem({ type: "matter", data: matter })}
                                data-testid={`button-filing-matter-${filing.id}`}
                              >
                                <Briefcase className="h-3 w-3" />
                                {matter.name}
                              </button>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(filing.startDate)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {urgent && <Badge variant="destructive" className="text-[10px]">Due Soon</Badge>}
                          <Badge variant="outline" className="text-[10px]">
                            {daysUntil(filing.startDate) === 0
                              ? "Today"
                              : `${daysUntil(filing.startDate)} day${daysUntil(filing.startDate) !== 1 ? "s" : ""}`}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setContextItem({ type: "event", data: filing })}
                            data-testid={`button-filing-context-${filing.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {filing.description && (
                        <p className="text-xs text-muted-foreground mt-2">{filing.description}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="dates" className="space-y-3">
            {futureEvents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No upcoming dates</p>
              </div>
            ) : (
              futureEvents.map((event) => {
                const matter = allMatters.find((m) => m.id === event.matterId);
                const cfg = eventTypeConfig[event.eventType] || eventTypeConfig.other;
                const Icon = cfg.icon;
                const urgent = (event.eventType === "deadline" || event.eventType === "court-date" || event.eventType === "hearing") && daysUntil(event.startDate) <= 3;
                return (
                  <Card key={event.id} className={urgent ? "border-red-500/50" : ""} data-testid={`date-card-${event.id}`}>
                    <CardContent className="p-3 md:p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-md bg-muted/50 shrink-0`}>
                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <div className="min-w-0">
                            <button
                              className="font-semibold text-sm hover:underline text-left"
                              onClick={() => setContextItem({ type: "event", data: event })}
                              data-testid={`button-date-info-${event.id}`}
                            >
                              {event.title}
                            </button>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <Badge variant="outline" className="text-[10px]">{cfg.label}</Badge>
                              {matter && (
                                <button
                                  className="flex items-center gap-1 hover:underline"
                                  onClick={() => setContextItem({ type: "matter", data: matter })}
                                  data-testid={`button-date-matter-${event.id}`}
                                >
                                  <Briefcase className="h-3 w-3" />
                                  {matter.name}
                                </button>
                              )}
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatDate(event.startDate)}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {daysUntil(event.startDate) === 0
                                ? "Today"
                                : `${daysUntil(event.startDate)} day${daysUntil(event.startDate) !== 1 ? "s" : ""} away`}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setContextItem({ type: "event", data: event })}
                            data-testid={`button-date-context-${event.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>

        <ContextDialog
          open={contextItem !== null}
          onClose={() => setContextItem(null)}
          title={
            contextItem?.type === "event"
              ? contextItem.data.title
              : contextItem?.type === "matter"
              ? contextItem.data.name
              : "Details"
          }
        >
          {contextItem?.type === "event" && renderEventContext(contextItem.data)}
          {contextItem?.type === "matter" && renderMatterContext(contextItem.data)}
        </ContextDialog>
      </div>
    </ScrollArea>
  );
}
