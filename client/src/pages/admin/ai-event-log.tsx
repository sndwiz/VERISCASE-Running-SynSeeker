import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Download, ChevronLeft, ChevronRight, Filter, Loader2, Zap, Hash, Clock, Cpu } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface AIEvent {
  id: string;
  action: string;
  modelId: string;
  modelProvider: string;
  inputTokenCount: number | null;
  outputTokenCount: number | null;
  durationMs: number | null;
  matterId: string | null;
  createdAt: string;
  userId: string;
  userEmail: string | null;
  isExternal: boolean;
  piiDetected: boolean;
  errorMessage: string | null;
}

interface AIEventStats {
  totalEvents: number;
  byProvider: Record<string, number>;
  byAction: Record<string, number>;
  totalInputTokens: number;
  totalOutputTokens: number;
}

interface AIEventsResponse {
  events: AIEvent[];
  total: number;
  limit: number;
  offset: number;
}

export default function AIEventLogPage() {
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const limit = 25;

  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  queryParams.set("offset", String(offset));
  if (actionFilter && actionFilter !== "all") queryParams.set("action", actionFilter);
  if (providerFilter && providerFilter !== "all") queryParams.set("provider", providerFilter);
  if (dateFrom) queryParams.set("dateFrom", dateFrom);
  if (dateTo) queryParams.set("dateTo", dateTo);

  const { data: eventsData, isLoading } = useQuery<AIEventsResponse>({
    queryKey: ["/api/ai-events", `?${queryParams.toString()}`],
  });

  const { data: stats } = useQuery<AIEventStats>({
    queryKey: ["/api/ai-events/stats"],
  });

  const events = eventsData?.events ?? [];
  const total = eventsData?.total ?? 0;

  const handlePrevious = () => {
    setOffset(Math.max(0, offset - limit));
  };

  const handleNext = () => {
    if (offset + limit < total) {
      setOffset(offset + limit);
    }
  };

  const handleApplyFilters = () => {
    setOffset(0);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-ai-event-log-title">
            AI Event Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor AI usage, token consumption, and model performance
          </p>
        </div>
        <Button variant="outline" asChild data-testid="button-export-csv">
          <a href="/api/ai-events?format=csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card data-testid="card-total-events">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-events">
              {stats?.totalEvents ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">All time AI operations</p>
          </CardContent>
        </Card>
        <Card data-testid="card-total-tokens">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tokens">
              {((stats?.totalInputTokens ?? 0) + (stats?.totalOutputTokens ?? 0)).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Input + output tokens</p>
          </CardContent>
        </Card>
        {stats?.byProvider && Object.entries(stats.byProvider).slice(0, 2).map(([provider, count]) => (
          <Card key={provider} data-testid={`card-provider-${provider}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <CardTitle className="text-sm font-medium">{provider}</CardTitle>
              <Cpu className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-provider-count-${provider}`}>
                {count}
              </div>
              <p className="text-xs text-muted-foreground">Events</p>
            </CardContent>
          </Card>
        ))}
        {(!stats?.byProvider || Object.keys(stats.byProvider).length === 0) && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Providers</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No provider data</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">Per request</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter} data-testid="select-action-filter">
                <SelectTrigger data-testid="select-action-filter-trigger">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="summarize">Summarize</SelectItem>
                  <SelectItem value="analyze">Analyze</SelectItem>
                  <SelectItem value="generate">Generate</SelectItem>
                  <SelectItem value="classify">Classify</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select value={providerFilter} onValueChange={setProviderFilter} data-testid="select-provider-filter">
                <SelectTrigger data-testid="select-provider-filter-trigger">
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="replit">Replit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="input-date-from"
              />
            </div>
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="input-date-to"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleApplyFilters} data-testid="button-apply-filters">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
          <CardDescription>
            {total} total event{total !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Zap className="h-10 w-10 mb-3" />
              <p>No AI events found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table data-testid="table-ai-events">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Tokens In</TableHead>
                      <TableHead>Tokens Out</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Matter ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event, index) => (
                      <TableRow key={event.id || index} data-testid={`row-event-${event.id || index}`}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDate(event.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {event.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{event.modelId}</TableCell>
                        <TableCell className="text-sm">{event.modelProvider}</TableCell>
                        <TableCell className="text-sm">{event.inputTokenCount?.toLocaleString() ?? "--"}</TableCell>
                        <TableCell className="text-sm">{event.outputTokenCount?.toLocaleString() ?? "--"}</TableCell>
                        <TableCell className="text-sm">{event.durationMs ? formatDuration(event.durationMs) : "--"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.matterId ? event.matterId.slice(0, 8) : "--"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
                <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                  Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevious}
                    disabled={offset === 0}
                    data-testid="button-previous-page"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNext}
                    disabled={offset + limit >= total}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}