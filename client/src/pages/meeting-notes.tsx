import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ListChecks,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
  X,
  CheckCircle2,
} from "lucide-react";
import type { Meeting, MeetingParticipant, MeetingTopic, TranscriptEntry } from "@shared/schema";

const PARTICIPANT_COLORS = ["#7C3AED", "#2563EB", "#059669", "#D97706", "#DC2626", "#EC4899"];

function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "summarized" ? "default" : "secondary";
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge variant={variant} data-testid={`badge-status-${status}`}>{label}</Badge>;
}

function ParticipantAvatars({ participants, max = 3 }: { participants: MeetingParticipant[]; max?: number }) {
  const shown = participants.slice(0, max);
  const remaining = participants.length - max;
  return (
    <div className="flex items-center -space-x-2" data-testid="participant-avatars">
      {shown.map((p, i) => (
        <Avatar key={i} className="h-7 w-7 border-2 border-background">
          <AvatarFallback
            className="text-xs text-white"
            style={{ backgroundColor: p.color || PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length] }}
          >
            {getInitials(p.name)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remaining > 0 && (
        <Avatar className="h-7 w-7 border-2 border-background">
          <AvatarFallback className="text-xs bg-muted text-muted-foreground">
            +{remaining}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function MeetingListView({ meetings, onSelect }: { meetings: Meeting[]; onSelect: (m: Meeting) => void }) {
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = meetings.filter(m =>
    m.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="meeting-list-view">
      <div
        className="relative rounded-md p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 overflow-hidden"
        data-testid="section-hero-banner"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/10 blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-300" />
            <span className="text-xs font-medium text-blue-300" data-testid="badge-ai-powered">AI-Powered</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-hero-title">AI Meeting Notetaker</h1>
            <p className="text-white/80 text-sm mt-1" data-testid="text-hero-subtitle">Turn discussions into results</p>
          </div>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2 text-white/70 text-sm" data-testid="text-hero-feature-1">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Automatic transcription and speaker detection
            </li>
            <li className="flex items-center gap-2 text-white/70 text-sm" data-testid="text-hero-feature-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              AI-generated summaries and action items
            </li>
            <li className="flex items-center gap-2 text-white/70 text-sm" data-testid="text-hero-feature-3">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Smart search across all your meetings
            </li>
          </ul>
          <div className="flex items-center gap-3 flex-wrap">
            <Button className="bg-white text-slate-900" data-testid="button-record-meeting">
              <Mic className="h-4 w-4 mr-2" />
              Record a Meeting
            </Button>
            <Button variant="outline" className="border-white/30 text-white bg-transparent" data-testid="button-learn-more">
              Learn More
            </Button>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            data-testid="input-search-meetings"
          />
        </div>
      </div>
      <Card>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[250px]">Meeting</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Recording</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {meetings.length === 0 ? "No meetings yet" : "No matching meetings"}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(meeting => (
              <TableRow
                key={meeting.id}
                className="cursor-pointer hover-elevate"
                onClick={() => onSelect(meeting)}
                data-testid={`row-meeting-${meeting.id}`}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium" data-testid={`text-meeting-title-${meeting.id}`}>
                      {meeting.title}
                    </span>
                    {meeting.tags && (meeting.tags as string[]).length > 0 && (
                      <div className="flex gap-1">
                        {(meeting.tags as string[]).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <ParticipantAvatars participants={(meeting.participants || []) as MeetingParticipant[]} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5" data-testid={`recording-indicator-${meeting.id}`}>
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-muted-foreground text-xs">{formatDuration(meeting.duration || 0)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDate(meeting.date)} {formatTime(meeting.date)}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDuration(meeting.duration || 0)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={meeting.status || "recorded"} />
                </TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" data-testid={`button-meeting-menu-${meeting.id}`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </Card>
    </div>
  );
}

function OverviewTab({ meeting }: { meeting: Meeting }) {
  return (
    <div className="space-y-4 md:space-y-6" data-testid="tab-overview">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">General Summary</CardTitle>
          </div>
          <Button size="icon" variant="ghost" data-testid="button-copy-summary">
            <Copy className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2" data-testid="text-summary-title">{meeting.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-summary-body">
              {meeting.summary || "No summary available yet."}
            </p>
          </div>
          {meeting.mainPoints && (meeting.mainPoints as string[]).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Main Points</h4>
              <ul className="space-y-1">
                {(meeting.mainPoints as string[]).map((point, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {meeting.topics && (meeting.topics as MeetingTopic[]).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Topics</h3>
          </div>
          {(meeting.topics as MeetingTopic[]).map((topic, i) => (
            <TopicCard key={i} topic={topic} />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicCard({ topic }: { topic: MeetingTopic }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Card className="cursor-pointer hover-elevate">
          <CardContent className="flex items-center justify-between p-4">
            <span className="font-medium text-sm" data-testid="text-topic-title">{topic.title}</span>
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </CardContent>
        </Card>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 py-3 text-sm text-muted-foreground leading-relaxed" data-testid="text-topic-content">
          {topic.content}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TranscriptTab({ transcript }: { transcript: TranscriptEntry[] }) {
  if (!transcript || transcript.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" data-testid="tab-transcript-empty">
        <Mic className="h-8 w-8 mb-2" />
        <p className="text-sm">No transcript available</p>
      </div>
    );
  }
  return (
    <div className="space-y-3" data-testid="tab-transcript">
      {transcript.map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 min-w-[60px]">{entry.timestamp}</div>
          <div>
            <span className="text-sm font-medium">{entry.speaker}</span>
            <p className="text-sm text-muted-foreground">{entry.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ParticipantsTab({ participants }: { participants: MeetingParticipant[] }) {
  if (!participants || participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" data-testid="tab-participants-empty">
        <Users className="h-8 w-8 mb-2" />
        <p className="text-sm">No participant data</p>
      </div>
    );
  }
  return (
    <div className="space-y-3" data-testid="tab-participants">
      {participants.map((p, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-muted/30">
          <Avatar className="h-9 w-9">
            <AvatarFallback
              className="text-sm text-white"
              style={{ backgroundColor: p.color || PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length] }}
            >
              {getInitials(p.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium" data-testid={`text-participant-name-${i}`}>{p.name}</p>
            {p.role && <p className="text-xs text-muted-foreground">{p.role}</p>}
            {p.email && <p className="text-xs text-muted-foreground">{p.email}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

const ACTION_SUGGESTIONS = [
  { icon: Search, text: "What was this meeting about?" },
  { icon: MessageSquare, text: "Generate meeting's follow up email" },
  { icon: ChevronRight, text: "What are the next steps?" },
  { icon: ChevronRight, text: "What should I know if I missed the meeting?" },
  { icon: ListChecks, text: "What are the action items?" },
];

function AiSidekick({ meeting }: { meeting: Meeting }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  const aiMutation = useMutation({
    mutationFn: async (q: string) => {
      const res = await apiRequest("POST", `/api/meetings/${meeting.id}/ai-query`, { query: q });
      return res.json();
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", text: data.response }]);
    },
    onError: (err: Error) => {
      setMessages(prev => [...prev, { role: "assistant", text: `Sorry, I couldn't process that. ${err.message}` }]);
    },
  });

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: "user", text }]);
    setQuery("");
    aiMutation.mutate(text);
  };

  return (
    <div className="flex flex-col h-full" data-testid="ai-sidekick-panel">
      <div className="flex items-center gap-2 p-3 border-b">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm">Sidekick</span>
      </div>
      <div className="px-3 py-2 text-xs text-muted-foreground border-b">
        Based on this meeting
      </div>

      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`text-sm ${msg.role === "user" ? "text-right" : ""}`}>
              <div className={`inline-block p-2 rounded-md max-w-full ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {aiMutation.isPending && (
            <div className="flex gap-1 p-2">
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Ask AI about this meeting..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend(query)}
            className="text-sm"
            data-testid="input-ai-query"
          />
          <Button size="icon" onClick={() => handleSend(query)} disabled={!query.trim() || aiMutation.isPending} data-testid="button-send-ai-query">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {messages.length === 0 && (
        <div className="p-3 border-t space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">Action suggestions</p>
          {ACTION_SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => handleSend(s.text)}
              className="flex items-center gap-2 w-full text-left p-2 rounded-md text-sm text-muted-foreground hover-elevate"
              data-testid={`button-suggestion-${i}`}
            >
              <s.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{s.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MeetingDetailView({ meeting, onBack }: { meeting: Meeting; onBack: () => void }) {
  const participants = (meeting.participants || []) as MeetingParticipant[];

  return (
    <div className="flex flex-col h-full" data-testid="meeting-detail-view">
      <div className="flex items-center gap-3 p-4 border-b flex-wrap">
        <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-back-to-list">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Mic className="h-4 w-4 text-muted-foreground shrink-0" />
            <h2 className="font-semibold truncate" data-testid="text-detail-title">{meeting.title}</h2>
            {meeting.tags && (meeting.tags as string[]).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(meeting.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(meeting.date)} · {formatDuration(meeting.duration || 0)}
            </span>
            <ParticipantAvatars participants={participants} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="overview" className="h-full">
            <TabsList className="mx-4 mt-3">
              <TabsTrigger value="overview" data-testid="tab-trigger-overview">Overview</TabsTrigger>
              <TabsTrigger value="transcript" data-testid="tab-trigger-transcript">Transcript</TabsTrigger>
              <TabsTrigger value="participants" data-testid="tab-trigger-participants">Participants</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="p-4">
              <OverviewTab meeting={meeting} />
            </TabsContent>
            <TabsContent value="transcript" className="p-4">
              <TranscriptTab transcript={(meeting.transcript || []) as TranscriptEntry[]} />
            </TabsContent>
            <TabsContent value="participants" className="p-4">
              <ParticipantsTab participants={participants} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden lg:block w-80 border-l bg-background">
          <AiSidekick meeting={meeting} />
        </div>
      </div>
    </div>
  );
}

export default function MeetingNotesPage() {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  const { data: meetings = [], isLoading, isError } = useQuery<Meeting[]>({
    queryKey: ["/api/meetings"],
  });

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  if (isLoading) {
    return (
      <div className="p-3 md:p-6 space-y-4" data-testid="meeting-notes-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-3 md:p-6 flex flex-col items-center justify-center text-center" data-testid="meeting-notes-error">
        <p className="text-muted-foreground">Failed to load meetings. Please try refreshing.</p>
      </div>
    );
  }

  if (selectedMeeting) {
    return (
      <MeetingDetailView
        meeting={selectedMeeting}
        onBack={() => setSelectedMeetingId(null)}
      />
    );
  }

  return (
    <MeetingListView
      meetings={meetings}
      onSelect={m => setSelectedMeetingId(m.id)}
    />
  );
}
