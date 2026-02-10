import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Clock, Plus, Trash2, DollarSign, Calendar, FileText, Filter, TrendingUp } from "lucide-react";
import type { TimeEntry, Matter } from "@shared/schema";

export default function TimeTrackingPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterMatterId, setFilterMatterId] = useState<string>("");
  const [formData, setFormData] = useState({
    matterId: "",
    date: new Date().toISOString().split("T")[0],
    hours: "",
    description: "",
    billableStatus: "billable" as const,
    hourlyRate: "",
    activityCode: "",
  });

  const { data: timeEntries = [], isLoading } = useQuery<TimeEntry[]>({
    queryKey: ["/api/time-entries", filterMatterId],
    queryFn: async () => {
      const effectiveMatterId = filterMatterId && filterMatterId !== "__all__" ? filterMatterId : "";
      const url = effectiveMatterId ? `/api/time-entries?matterId=${effectiveMatterId}` : "/api/time-entries";
      const res = await fetch(url);
      return res.json();
    },
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/time-entries", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Time entry created" });
    },
    onError: () => {
      toast({ title: "Failed to create time entry", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/time-entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      toast({ title: "Time entry deleted" });
    },
  });

  const resetForm = () => {
    setFormData({
      matterId: "",
      date: new Date().toISOString().split("T")[0],
      hours: "",
      description: "",
      billableStatus: "billable",
      hourlyRate: "",
      activityCode: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      hours: parseFloat(formData.hours),
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
    });
  };

  const totalHours = timeEntries.reduce((acc, e) => acc + e.hours, 0);
  const billableHours = timeEntries.filter(e => e.billableStatus === "billable").reduce((acc, e) => acc + e.hours, 0);
  const totalValue = timeEntries.reduce((acc, e) => {
    if (e.billableStatus === "billable" && e.hourlyRate) {
      return acc + (e.hours * e.hourlyRate);
    }
    return acc;
  }, 0);

  const getMatterName = (matterId: string) => {
    const matter = matters.find(m => m.id === matterId);
    return matter?.name || "Unknown Matter";
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="p-6 space-y-6" data-testid="time-tracking-page">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Time Tracking</h1>
          <p className="text-muted-foreground">Log and manage billable hours</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button data-testid="button-add-time-entry">
                  <Plus className="h-4 w-4 mr-2" />
                  Log Time
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Create a new time entry for billable work</TooltipContent>
          </Tooltip>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Log Time Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Matter *</Label>
                <Select value={formData.matterId} onValueChange={(v) => setFormData(prev => ({ ...prev, matterId: v }))}>
                  <SelectTrigger data-testid="select-matter">
                    <SelectValue placeholder="Select a matter" />
                  </SelectTrigger>
                  <SelectContent>
                    {matters.map(matter => (
                      <SelectItem key={matter.id} value={matter.id}>{matter.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    data-testid="input-date"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hours *</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    placeholder="1.5"
                    value={formData.hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                    data-testid="input-hours"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Describe the work performed..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="input-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing Status</Label>
                  <Select value={formData.billableStatus} onValueChange={(v: any) => setFormData(prev => ({ ...prev, billableStatus: v }))}>
                    <SelectTrigger data-testid="select-billing-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="billable">Billable</SelectItem>
                      <SelectItem value="non-billable">Non-Billable</SelectItem>
                      <SelectItem value="no-charge">No Charge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hourly Rate</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="350.00"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: e.target.value }))}
                    data-testid="input-hourly-rate"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Activity Code</Label>
                <Input
                  placeholder="e.g., L100, A110"
                  value={formData.activityCode}
                  onChange={(e) => setFormData(prev => ({ ...prev, activityCode: e.target.value }))}
                  data-testid="input-activity-code"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!formData.matterId || !formData.hours || !formData.description || createMutation.isPending} data-testid="button-submit-time-entry">
                  Log Time
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-help">
              <CardHeader className="pb-2">
                <CardDescription>Total Hours</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Clock className="h-6 w-6 text-primary" />
                  {formatHours(totalHours)}
                </CardTitle>
              </CardHeader>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Total time logged across all entries</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-help">
              <CardHeader className="pb-2">
                <CardDescription>Billable Hours</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  {formatHours(billableHours)}
                </CardTitle>
              </CardHeader>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Hours marked as billable to clients</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-help">
              <CardHeader className="pb-2">
                <CardDescription>Total Value</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <DollarSign className="h-6 w-6 text-amber-500" />
                  ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </CardTitle>
              </CardHeader>
            </Card>
          </TooltipTrigger>
          <TooltipContent>Total billable value (hours × hourly rate)</TooltipContent>
        </Tooltip>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Time Entries</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterMatterId} onValueChange={setFilterMatterId}>
                    <SelectTrigger className="w-[200px]" data-testid="select-filter-matter">
                      <SelectValue placeholder="All Matters" />
                    </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Matters</SelectItem>
                  {matters.map(matter => (
                    <SelectItem key={matter.id} value={matter.id}>{matter.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent>Filter time entries by matter</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : timeEntries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No time entries yet</h3>
              <p className="text-muted-foreground mb-4">Start logging your billable hours</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => setIsDialogOpen(true)} data-testid="button-empty-log-time">
                    <Plus className="h-4 w-4 mr-2" />
                    Log Time
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Create your first time entry</TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-3">
              {timeEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between gap-2 p-4 border rounded-lg hover-elevate"
                  data-testid={`time-entry-${entry.id}`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatHours(entry.hours)}</span>
                      <Badge variant={entry.billableStatus === "billable" ? "default" : "secondary"}>
                        {entry.billableStatus}
                      </Badge>
                      {entry.activityCode && (
                        <Badge variant="outline">{entry.activityCode}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{entry.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {getMatterName(entry.matterId)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.date).toLocaleDateString()}
                      </span>
                      {entry.hourlyRate && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          ${(entry.hours * entry.hourlyRate).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        data-testid={`button-delete-${entry.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete this time entry</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
