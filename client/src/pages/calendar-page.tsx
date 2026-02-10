import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar, Plus, Trash2, MapPin, Users, ChevronLeft, ChevronRight,
  Gavel, Clock, FileText, Bell, RefreshCw, Zap, DollarSign,
  CheckSquare, ClipboardList, Filter, Briefcase
} from "lucide-react";
import type { CalendarEvent, Matter, CalendarEventType } from "@shared/schema";

type SourceType = "efiling-deadline" | "efiling-action" | "efiling-filing" | "board-task" | "meeting" | "invoice" | "approval" | "manual";

const sourceTypeLabels: Record<SourceType, string> = {
  "efiling-deadline": "E-Filing Deadline",
  "efiling-action": "Case Action",
  "efiling-filing": "Filing",
  "board-task": "Board Task",
  "meeting": "Meeting",
  "invoice": "Invoice Due",
  "approval": "Approval",
  "manual": "Manual",
};

const sourceTypeColors: Record<SourceType, string> = {
  "efiling-deadline": "#f59e0b",
  "efiling-action": "#10b981",
  "efiling-filing": "#3b82f6",
  "board-task": "#8b5cf6",
  "meeting": "#06b6d4",
  "invoice": "#ef4444",
  "approval": "#f97316",
  "manual": "#6b7280",
};

const sourceTypeIcons: Record<SourceType, any> = {
  "efiling-deadline": Clock,
  "efiling-action": ClipboardList,
  "efiling-filing": FileText,
  "board-task": CheckSquare,
  "meeting": Users,
  "invoice": DollarSign,
  "approval": Gavel,
  "manual": Calendar,
};

const eventTypeColors: Record<CalendarEventType, string> = {
  "court-date": "bg-red-500",
  "hearing": "bg-orange-500",
  "deadline": "bg-amber-500",
  "meeting": "bg-blue-500",
  "deposition": "bg-purple-500",
  "filing": "bg-green-500",
  "reminder": "bg-teal-500",
  "other": "bg-gray-500",
};

const eventTypeIcons: Record<CalendarEventType, any> = {
  "court-date": Gavel,
  "hearing": Gavel,
  "deadline": Clock,
  "meeting": Users,
  "deposition": Users,
  "filing": FileText,
  "reminder": Bell,
  "other": Calendar,
};

function getEventColor(event: CalendarEvent): string {
  if (event.color) return event.color;
  const src = (event as any).sourceType as SourceType | undefined;
  if (src && sourceTypeColors[src]) return sourceTypeColors[src];
  return "#6b7280";
}

function getEventIcon(event: CalendarEvent) {
  const src = (event as any).sourceType as SourceType | undefined;
  if (src && sourceTypeIcons[src]) return sourceTypeIcons[src];
  return eventTypeIcons[event.eventType] || Calendar;
}

export default function CalendarPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [matterFilters, setMatterFilters] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [formData, setFormData] = useState({
    matterId: "",
    title: "",
    description: "",
    eventType: "meeting" as CalendarEventType,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    allDay: true,
    location: "",
    attendees: "",
  });

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/calendar-events/sync");
    },
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      toast({
        title: "Calendar synchronized",
        description: `${data.created || 0} added, ${data.updated || 0} updated across all sources`,
      });
    },
    onError: () => {
      toast({ title: "Sync failed", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/calendar-events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Event created" });
    },
    onError: () => {
      toast({ title: "Failed to create event", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/calendar-events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      toast({ title: "Event deleted" });
    },
  });

  const resetForm = () => {
    setFormData({
      matterId: "",
      title: "",
      description: "",
      eventType: "meeting",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      allDay: true,
      location: "",
      attendees: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      matterId: formData.matterId && formData.matterId !== "__none__" ? formData.matterId : undefined,
      endDate: formData.endDate || undefined,
      location: formData.location || undefined,
      attendees: formData.attendees ? formData.attendees.split(",").map(a => a.trim()) : [],
    });
  };

  const toggleFilter = (sourceType: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(sourceType)) {
        next.delete(sourceType);
      } else {
        next.add(sourceType);
      }
      return next;
    });
  };

  const toggleMatterFilter = (matterId: string) => {
    setMatterFilters(prev => {
      const next = new Set(prev);
      if (next.has(matterId)) {
        next.delete(matterId);
      } else {
        next.add(matterId);
      }
      return next;
    });
  };

  const filteredEvents = events.filter(e => {
    if (activeFilters.size > 0) {
      const src = (e as any).sourceType || "manual";
      if (!activeFilters.has(src)) return false;
    }
    if (matterFilters.size > 0) {
      const mid = e.matterId || "__no_matter__";
      if (!matterFilters.has(mid)) return false;
    }
    return true;
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDay; i++) {
      const prevDate = new Date(year, month, -startingDay + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return filteredEvents.filter(e => e.startDate.split("T")[0] === dateStr);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getMatterName = (matterId?: string | null) => {
    if (!matterId) return null;
    const matter = matters.find(m => m.id === matterId);
    return matter?.name;
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const upcomingEvents = filteredEvents
    .filter(e => new Date(e.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 10);

  const selectedDateEvents = selectedDate ? filteredEvents.filter(e => e.startDate.split("T")[0] === selectedDate) : [];

  const sourceCounts: Record<string, number> = {};
  for (const e of events) {
    const src = (e as any).sourceType || "manual";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  }

  const autoSyncedCount = events.filter(e => (e as any).autoSynced).length;
  const manualCount = events.length - autoSyncedCount;

  return (
    <div className="p-6 space-y-6" data-testid="calendar-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Unified Calendar</h1>
          <p className="text-muted-foreground">
            All dates across your practice in one view
            <span className="ml-2 text-xs">
              {events.length} events ({autoSyncedCount} synced, {manualCount} manual)
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                data-testid="button-sync-calendar"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                Sync All
              </Button>
            </TooltipTrigger>
            <TooltipContent>Pull dates from all sources (tasks, filings, meetings, invoices)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showFilters ? "default" : "outline"}
                size="icon"
                onClick={() => setShowFilters(v => !v)}
                data-testid="button-toggle-filters"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Filter by source type</TooltipContent>
          </Tooltip>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-event">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event
                  </Button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Schedule a new calendar event</TooltipContent>
            </Tooltip>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Calendar Event</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="Event title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    data-testid="input-title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Event Type *</Label>
                    <Select value={formData.eventType} onValueChange={(v: CalendarEventType) => setFormData(prev => ({ ...prev, eventType: v }))}>
                      <SelectTrigger data-testid="select-event-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="court-date">Court Date</SelectItem>
                        <SelectItem value="hearing">Hearing</SelectItem>
                        <SelectItem value="deadline">Deadline</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="deposition">Deposition</SelectItem>
                        <SelectItem value="filing">Filing</SelectItem>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Matter (optional)</Label>
                    <Select value={formData.matterId} onValueChange={(v) => setFormData(prev => ({ ...prev, matterId: v }))}>
                      <SelectTrigger data-testid="select-matter">
                        <SelectValue placeholder="Select matter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {matters.map(matter => (
                          <SelectItem key={matter.id} value={matter.id}>{matter.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.allDay}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, allDay: !!checked }))}
                    data-testid="checkbox-all-day"
                  />
                  <Label className="cursor-pointer">All day event</Label>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    placeholder="e.g., SF Superior Court, Room 302"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    data-testid="input-location"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attendees</Label>
                  <Input
                    placeholder="Comma-separated names"
                    value={formData.attendees}
                    onChange={(e) => setFormData(prev => ({ ...prev, attendees: e.target.value }))}
                    data-testid="input-attendees"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="input-description"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!formData.title || createMutation.isPending} data-testid="button-submit-event">
                    Create Event
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-4 pb-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground mr-1">Sources:</span>
              {(Object.keys(sourceTypeLabels) as SourceType[]).map(src => {
                const count = sourceCounts[src] || 0;
                const isActive = activeFilters.has(src);
                const Icon = sourceTypeIcons[src];
                return (
                  <Badge
                    key={src}
                    variant={isActive ? "default" : "outline"}
                    className={`cursor-pointer toggle-elevate ${isActive ? "toggle-elevated" : ""}`}
                    style={isActive ? { backgroundColor: sourceTypeColors[src], borderColor: sourceTypeColors[src] } : {}}
                    onClick={() => toggleFilter(src)}
                    data-testid={`filter-${src}`}
                  >
                    <Icon className="h-3 w-3 mr-1" />
                    {sourceTypeLabels[src]} ({count})
                  </Badge>
                );
              })}
            </div>
            {matters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground mr-1">Cases:</span>
                {matters.map(matter => {
                  const matterEventCount = events.filter(e => e.matterId === matter.id).length;
                  if (matterEventCount === 0) return null;
                  const isActive = matterFilters.has(matter.id);
                  return (
                    <Badge
                      key={matter.id}
                      variant={isActive ? "default" : "outline"}
                      className={`cursor-pointer toggle-elevate ${isActive ? "toggle-elevated" : ""}`}
                      onClick={() => toggleMatterFilter(matter.id)}
                      data-testid={`filter-matter-${matter.id}`}
                    >
                      <Briefcase className="h-3 w-3 mr-1" />
                      {matter.name} ({matterEventCount})
                    </Badge>
                  );
                })}
                {(() => {
                  const noMatterCount = events.filter(e => !e.matterId).length;
                  if (noMatterCount === 0) return null;
                  const isActive = matterFilters.has("__no_matter__");
                  return (
                    <Badge
                      variant={isActive ? "default" : "outline"}
                      className={`cursor-pointer toggle-elevate ${isActive ? "toggle-elevated" : ""}`}
                      onClick={() => toggleMatterFilter("__no_matter__")}
                      data-testid="filter-matter-none"
                    >
                      General ({noMatterCount})
                    </Badge>
                  );
                })()}
              </div>
            )}
            {(activeFilters.size > 0 || matterFilters.size > 0) && (
              <Button variant="ghost" size="sm" onClick={() => { setActiveFilters(new Set()); setMatterFilters(new Set()); }} data-testid="button-clear-filters">
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{monthName}</CardTitle>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} data-testid="button-prev-month">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Previous month</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} data-testid="button-today">
                      Today
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Jump to current date</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} data-testid="button-next-month">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Next month</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {days.map(({ date, isCurrentMonth }, idx) => {
                const dateStr = date.toISOString().split("T")[0];
                const dayEvents = getEventsForDate(date);
                const isSelected = selectedDate === dateStr;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`
                      min-h-[80px] p-1 border rounded cursor-pointer transition-colors
                      ${isCurrentMonth ? "bg-background" : "bg-muted/30 text-muted-foreground"}
                      ${isToday(date) ? "border-primary" : "border-border"}
                      ${isSelected ? "ring-2 ring-primary" : ""}
                      hover-elevate
                    `}
                    data-testid={`calendar-day-${dateStr}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isToday(date) ? "text-primary" : ""}`}>
                      {date.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map(event => (
                        <div
                          key={event.id}
                          className="text-xs truncate rounded px-1 py-0.5 text-white"
                          style={{ backgroundColor: getEventColor(event) }}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {selectedDate && selectedDateEvents.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedDateEvents.map(event => {
                    const Icon = getEventIcon(event);
                    const color = getEventColor(event);
                    const srcType = (event as any).sourceType as SourceType | undefined;
                    const isAutoSynced = (event as any).autoSynced;
                    return (
                      <div key={event.id} className="flex items-start gap-3 p-2 border rounded" data-testid={`event-${event.id}`}>
                        <div className="p-2 rounded" style={{ backgroundColor: color }}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{event.title}</div>
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {srcType && srcType !== "manual" && (
                              <Badge variant="outline" className="text-xs">
                                <Zap className="h-2.5 w-2.5 mr-0.5" />
                                {sourceTypeLabels[srcType] || srcType}
                              </Badge>
                            )}
                            {!srcType && (
                              <span className="text-xs text-muted-foreground capitalize">{event.eventType.replace("-", " ")}</span>
                            )}
                          </div>
                          {event.description && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</div>
                          )}
                          {event.location && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" /> {event.location}
                            </div>
                          )}
                          {getMatterName(event.matterId) && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <FileText className="h-3 w-3" /> {getMatterName(event.matterId)}
                            </div>
                          )}
                        </div>
                        {!isAutoSynced && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteMutation.mutate(event.id)}
                                data-testid={`button-delete-${event.id}`}
                              >
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete this event</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} data-testid="button-sync-empty">
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                    Sync from all sources
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingEvents.map(event => {
                    const Icon = getEventIcon(event);
                    const color = getEventColor(event);
                    const srcType = (event as any).sourceType as SourceType | undefined;
                    return (
                      <div key={event.id} className="flex items-center gap-3 p-2 border rounded hover-elevate" data-testid={`upcoming-event-${event.id}`}>
                        <div className="p-1.5 rounded" style={{ backgroundColor: color }}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{event.title}</div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.startDate).toLocaleDateString()}
                            </span>
                            {srcType && srcType !== "manual" && (
                              <span className="text-xs px-1 rounded" style={{ backgroundColor: color + "20", color }}>
                                {sourceTypeLabels[srcType]?.split(" ").pop() || srcType}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Source Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(Object.keys(sourceTypeLabels) as SourceType[]).map(src => {
                  const count = sourceCounts[src] || 0;
                  if (count === 0) return null;
                  const Icon = sourceTypeIcons[src];
                  return (
                    <div key={src} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded" style={{ backgroundColor: sourceTypeColors[src] }}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        <span>{sourceTypeLabels[src]}</span>
                      </div>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
                {Object.values(sourceCounts).every(c => c === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-2">No synced events yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
