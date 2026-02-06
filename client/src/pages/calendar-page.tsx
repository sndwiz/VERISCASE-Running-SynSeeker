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
import { Calendar, Plus, Trash2, MapPin, Users, ChevronLeft, ChevronRight, Gavel, Clock, FileText, Bell } from "lucide-react";
import type { CalendarEvent, Matter, CalendarEventType } from "@shared/schema";

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

export default function CalendarPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/calendar-events", "POST", data);
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
      return apiRequest(`/api/calendar-events/${id}`, "DELETE");
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
      createdBy: "Current User",
    });
  };

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
    return events.filter(e => e.startDate.split("T")[0] === dateStr);
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

  const getMatterName = (matterId?: string) => {
    if (!matterId) return null;
    const matter = matters.find(m => m.id === matterId);
    return matter?.name;
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const upcomingEvents = events
    .filter(e => new Date(e.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 10);

  const selectedDateEvents = selectedDate ? events.filter(e => e.startDate.split("T")[0] === selectedDate) : [];

  return (
    <div className="p-6 space-y-6" data-testid="calendar-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Calendar</h1>
          <p className="text-muted-foreground">Schedule court dates, deadlines, and meetings</p>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
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
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map(event => {
                        const Icon = eventTypeIcons[event.eventType] || Calendar;
                        return (
                          <div
                            key={event.id}
                            className={`text-xs truncate rounded px-1 py-0.5 text-white ${eventTypeColors[event.eventType] || "bg-gray-500"}`}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">+{dayEvents.length - 2} more</div>
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
                  {new Date(selectedDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedDateEvents.map(event => {
                    const Icon = eventTypeIcons[event.eventType] || Calendar;
                    return (
                      <div key={event.id} className="flex items-start gap-3 p-2 border rounded" data-testid={`event-${event.id}`}>
                        <div className={`p-2 rounded ${eventTypeColors[event.eventType] || "bg-gray-500"}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-xs text-muted-foreground capitalize">{event.eventType.replace("-", " ")}</div>
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
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(event => {
                    const Icon = eventTypeIcons[event.eventType] || Calendar;
                    return (
                      <div key={event.id} className="flex items-center gap-3 p-2 border rounded hover-elevate" data-testid={`upcoming-event-${event.id}`}>
                        <div className={`p-1.5 rounded ${eventTypeColors[event.eventType] || "bg-gray-500"}`}>
                          <Icon className="h-3 w-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{event.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.startDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
