/**
 * VERICASE Email Intelligence Dashboard Component
 * 
 * Drop into client/src/components/email-intel-dashboard.tsx
 * Add to your sidebar nav and router in App.tsx
 */

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, AlertTriangle, Shield, Brain, Clock, Users, Search,
  ChevronRight, Bell, BellOff, Send, ArrowDownLeft, ArrowUpRight,
  Scale, Eye, FileText, BarChart3, XCircle, CheckCircle2,
  Zap, MessageSquareWarning, TrendingUp, Filter, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface EmailIntelStats {
  totalEmails: number;
  pendingAlerts: number;
  highRiskEmails: number;
  lawyerComms: number;
  totalContacts: number;
  sentimentBreakdown: Record<string, number>;
  recentEmails: any[];
  alerts: any[];
}

interface AlertsResponse {
  alerts: any[];
  pendingCount: number;
}

// ── API HOOKS ──

function useEmailIntelDashboard() {
  return useQuery<EmailIntelStats>({
    queryKey: ["/api/email-intel/dashboard"],
    refetchInterval: 15000,
  });
}

function useEmailIntelEmails(filter: string) {
  return useQuery<any[]>({
    queryKey: [`/api/email-intel/emails?filter=${filter}`],
  });
}

function useEmailIntelAlerts() {
  return useQuery<AlertsResponse>({
    queryKey: ["/api/email-intel/alerts"],
    refetchInterval: 10000,
  });
}

function useEmailIntelContacts() {
  return useQuery<any[]>({
    queryKey: ["/api/email-intel/contacts"],
  });
}

// ── SENTIMENT / RISK HELPERS ──

const sentimentColors: Record<string, string> = {
  hostile: "bg-red-500/20 text-red-400 border-red-500/30",
  angry: "bg-red-500/20 text-red-400 border-red-500/30",
  upset: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  problem: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  cooperative: "bg-green-500/20 text-green-400 border-green-500/30",
  positive: "bg-green-500/20 text-green-400 border-green-500/30",
  formal_neutral: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const riskColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const urgencyColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400",
  high: "bg-orange-500/20 text-orange-400",
  elevated: "bg-yellow-500/20 text-yellow-400",
  normal: "bg-slate-500/20 text-slate-400",
};

function SentimentBadge({ sentiment }: { sentiment: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] uppercase ${sentimentColors[sentiment] || sentimentColors.formal_neutral}`}>
      {sentiment.replace("_", " ")}
    </Badge>
  );
}

function RiskBadge({ risk }: { risk: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] uppercase ${riskColors[risk] || riskColors.low}`}>
      {risk}
    </Badge>
  );
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  return (
    <Badge variant="outline" className={`text-[10px] uppercase ${urgencyColors[urgency] || urgencyColors.normal}`}>
      {urgency}
    </Badge>
  );
}

function AlertListItem({ alert }: { alert: any }) {
  return (
    <div className="flex items-start gap-3 p-3 border-b last:border-b-0" data-testid={`alert-item-${alert.id}`}>
      <Badge variant="outline" className={`text-[10px] shrink-0 ${alert.priority === "critical" ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>
        {alert.priority?.toUpperCase()}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{alert.message}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {alert.senderName || alert.senderEmail} — {new Date(alert.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════

export default function EmailIntelDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [emailFilter, setEmailFilter] = useState("all");
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dashboard = useEmailIntelDashboard();
  const emails = useEmailIntelEmails(emailFilter);
  const alerts = useEmailIntelAlerts();

  const stats: EmailIntelStats = dashboard.data || { totalEmails: 0, pendingAlerts: 0, highRiskEmails: 0, lawyerComms: 0, totalContacts: 0, sentimentBreakdown: {}, recentEmails: [], alerts: [] };
  const pendingAlerts = stats.pendingAlerts || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Email Intelligence</h1>
            <p className="text-xs text-muted-foreground">Analyze • Link • Alert • Protect</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingAlerts > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="animate-pulse"
              onClick={() => setActiveTab("alerts")}
            >
              <Bell className="w-4 h-4 mr-1" />
              {pendingAlerts} Alert{pendingAlerts > 1 ? "s" : ""} for Lauren
            </Button>
          )}
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Mail className="w-4 h-4 mr-1" /> Analyze Email
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Analyze Email</DialogTitle>
              </DialogHeader>
              <AnalyzeEmailForm
                onSuccess={() => {
                  setComposeOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["/api/email-intel"] });
                  toast({ title: "Email analyzed", description: "Intelligence extracted successfully" });
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-6 pt-2 border-b">
          <TabsList className="bg-transparent p-0 h-auto gap-4">
            <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">
              <BarChart3 className="w-4 h-4 mr-1" /> Overview
            </TabsTrigger>
            <TabsTrigger value="inbox" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">
              <Mail className="w-4 h-4 mr-1" /> Inbox
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2 relative">
              <Bell className="w-4 h-4 mr-1" /> Lauren Alerts
              {pendingAlerts > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingAlerts}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 pb-2">
              <Users className="w-4 h-4 mr-1" /> Contacts
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── OVERVIEW TAB ── */}
        <TabsContent value="overview" className="flex-1 p-6 overflow-auto m-0">
          {/* Alert banner */}
          {pendingAlerts > 0 && (
            <div className="mb-4 p-4 rounded-lg border border-red-500/30 bg-red-500/5 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-400">
                  {pendingAlerts} Alert{pendingAlerts > 1 ? "s" : ""} Require Lauren's Attention
                </h3>
                <p className="text-sm text-muted-foreground">
                  Client communications need immediate review
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("alerts")}>
                View Alerts
              </Button>
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <StatCard icon={Mail} label="Emails Analyzed" value={stats.totalEmails || 0} />
            <StatCard icon={Bell} label="Pending Alerts" value={pendingAlerts} color="text-red-400" />
            <StatCard icon={Shield} label="High Risk" value={stats.highRiskEmails || 0} color="text-orange-400" />
            <StatCard icon={Scale} label="Lawyer Comms" value={stats.lawyerComms || 0} color="text-purple-400" />
            <StatCard icon={Users} label="Contacts" value={stats.totalContacts || 0} color="text-blue-400" />
          </div>

          {/* Recent + Alerts side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Recent Emails
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  {(stats.recentEmails || []).map((e: any) => (
                    <EmailListItem key={e.id} email={e} onClick={() => { setSelectedEmailId(e.id); setActiveTab("inbox"); }} />
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400" /> Latest Alerts for Lauren
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  {(stats.alerts || []).length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
                      No pending alerts ✓
                    </div>
                  ) : (
                    (stats.alerts || []).map((a: any) => (
                      <AlertListItem key={a.id} alert={a} />
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── INBOX TAB ── */}
        <TabsContent value="inbox" className="flex-1 m-0 overflow-hidden">
          <div className="flex h-full">
            {/* Email list */}
            <div className="w-[380px] border-r flex flex-col">
              <div className="p-3 border-b flex items-center gap-2">
                <Select value={emailFilter} onValueChange={setEmailFilter}>
                  <SelectTrigger className="h-8 text-xs w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="alerts">⚠ Alerts</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => emails.refetch()}>
                  <RefreshCw className="w-3 h-3" />
                </Button>
              </div>
              <ScrollArea className="flex-1">
                {(emails.data || []).map?.((e: any) => (
                  <EmailListItem
                    key={e.id}
                    email={e}
                    selected={selectedEmailId === e.id}
                    onClick={() => setSelectedEmailId(e.id)}
                  />
                )) || <div className="p-4 text-center text-muted-foreground text-sm">No emails yet</div>}
              </ScrollArea>
            </div>

            {/* Email detail */}
            <div className="flex-1 overflow-auto">
              {selectedEmailId ? (
                <EmailDetail emailId={selectedEmailId} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Mail className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Select an email to view intelligence</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── ALERTS TAB ── */}
        <TabsContent value="alerts" className="flex-1 p-6 overflow-auto m-0">
          <AlertsPanel />
        </TabsContent>

        {/* ── CONTACTS TAB ── */}
        <TabsContent value="contacts" className="flex-1 p-6 overflow-auto m-0">
          <ContactsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── SUBCOMPONENTS ──

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color?: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color || "text-muted-foreground"}`} />
        <div>
          <div className={`text-2xl font-bold font-mono ${color || ""}`}>{value}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailListItem({ email, selected, onClick }: { email: any; selected?: boolean; onClick: () => void }) {
  const isAlert = email.riskLevel === "high" || email.riskLevel === "critical";
  return (
    <div
      className={`px-4 py-3 border-b cursor-pointer transition-colors hover:bg-muted/50 ${
        selected ? "bg-muted border-l-2 border-l-primary" : ""
      } ${isAlert ? "border-l-2 border-l-red-500" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium truncate max-w-[200px]">{email.senderName || email.sender}</span>
        <span className="text-[10px] font-mono text-muted-foreground">
          {email.emailDate ? new Date(email.emailDate).toLocaleDateString() : ""}
        </span>
      </div>
      <div className="text-sm truncate mb-1">{email.subject}</div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <SentimentBadge sentiment={email.sentiment} />
        {email.urgency !== "normal" && <UrgencyBadge urgency={email.urgency} />}
        {email.isLawyerComm && (
          <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">
            LAWYER
          </Badge>
        )}
        {email.direction === "outbound" && (
          <Badge variant="outline" className="text-[10px]">
            <ArrowUpRight className="w-3 h-3 mr-0.5" /> SENT
          </Badge>
        )}
      </div>
    </div>
  );
}

function EmailDetail({ emailId }: { emailId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/email-intel/emails", emailId],
    queryFn: () => fetch(`/api/email-intel/emails/${emailId}`).then(r => r.json()),
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading analysis...</div>;
  if (!data?.email) return <div className="p-6 text-muted-foreground">Email not found</div>;

  const e = data.email;
  const profile = e.psychologicalProfile || {};

  return (
    <ScrollArea className="h-full">
      <div className="p-6">
        {/* Header */}
        <h2 className="text-lg font-semibold mb-1">{e.subject}</h2>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-4">
          <span>From: <strong className="text-foreground">{e.senderName || e.sender}</strong></span>
          <span>{e.emailDate ? new Date(e.emailDate).toLocaleString() : ""}</span>
          <span className="capitalize">{e.direction}</span>
        </div>

        {/* Intelligence badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <SentimentBadge sentiment={e.sentiment} />
          <UrgencyBadge urgency={e.urgency} />
          <RiskBadge risk={e.riskLevel} />
          {e.isLawyerComm && (
            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px]">
              ⚖ LAWYER COMMUNICATION
            </Badge>
          )}
          {e.deceptionScore > 0 && (
            <Badge variant="outline" className="bg-pink-500/10 text-pink-400 border-pink-500/30 text-[10px]">
              🎭 DECEPTION: {e.deceptionScore}/10
            </Badge>
          )}
        </div>

        {/* Admin alerts */}
        {data.alerts && data.alerts.length > 0 && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
              ⚠ Lauren Alert Triggered
            </h4>
            {data.alerts.map((a: any) => (
              <div key={a.id} className="flex items-start gap-2 text-sm mb-1">
                <Badge variant="outline" className={`text-[9px] ${a.priority === "critical" ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>
                  {a.priority}
                </Badge>
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-4" />

        {/* Email body */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground mb-6">
          {e.bodyText}
        </div>

        <Separator className="my-4" />

        {/* Intelligence panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Psych profile */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Brain className="w-4 h-4" /> Psychological Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <ProfileRow label="Style" value={profile.communicationStyle} />
              <ProfileRow label="Power" value={profile.powerDynamics} />
              <ProfileRow label="Emotion" value={profile.emotionalState} />
              <ProfileRow label="Manipulation" value={profile.manipulationRisk} />
              {(profile.behavioralNotes || []).map((n: string, i: number) => (
                <div key={i} className="text-xs text-muted-foreground bg-muted/50 rounded p-2"><FileText className="h-3 w-3 inline mr-1" />{n}</div>
              ))}
            </CardContent>
          </Card>

          {/* Extracted data */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <FileText className="w-4 h-4" /> Extracted Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {(e.caseNumbers || []).length > 0 && (
                <div><span className="text-muted-foreground text-xs">Case Numbers:</span> <span className="font-mono text-xs">{e.caseNumbers.join(", ")}</span></div>
              )}
              {(e.moneyAmounts || []).length > 0 && (
                <div><span className="text-muted-foreground text-xs">Money:</span> <span className="font-mono text-xs font-semibold">{e.moneyAmounts.join(", ")}</span></div>
              )}
              {(e.datesMentioned || []).length > 0 && (
                <div><span className="text-muted-foreground text-xs">Dates:</span> <span className="text-xs">{e.datesMentioned.join(", ")}</span></div>
              )}
              {(e.deadlines || []).length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs">Deadlines:</span>
                  {e.deadlines.map((d: any, i: number) => (
                    <div key={i} className="text-xs bg-red-500/5 border border-red-500/20 rounded p-2 mt-1">
                      <strong className="text-red-400">{d.date || "TBD"}</strong> — {d.keyword}
                    </div>
                  ))}
                </div>
              )}
              {(e.keyPhrases || []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {e.keyPhrases.map((p: string) => (
                    <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              )}
              {(e.actionItems || []).length > 0 && (
                <div>
                  <span className="text-muted-foreground text-xs">Action Items:</span>
                  {e.actionItems.map((a: string, i: number) => (
                    <div key={i} className="text-xs bg-blue-500/5 rounded p-2 mt-1">→ {a}</div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deception analysis */}
          {(e.deceptionFlags || []).length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader className="py-3">
                <CardTitle className="text-xs flex items-center gap-2 text-pink-400">
                  <MessageSquareWarning className="w-4 h-4" /> Deception Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {e.deceptionFlags.map((f: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 p-2 rounded bg-pink-500/5 border border-pink-500/15">
                      <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-400 border-pink-500/30 min-w-[100px] justify-center">
                        {f.tactic}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {f.indicators.join(", ")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Matter link */}
          {data.matter && (
            <Card className="md:col-span-2">
              <CardHeader className="py-3">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Scale className="w-4 h-4" /> Linked Matter
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="font-semibold">{data.matter.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{data.matter.caseNumber}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {data.matter.practiceArea} • {data.matter.status}
                  {e.autoLinked && <Badge variant="secondary" className="ml-2 text-[9px]">AUTO-LINKED</Badge>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-medium text-xs capitalize">{value.replace("_", " ")}</span>
    </div>
  );
}

function AlertsPanel() {
  const { data, isLoading, refetch } = useEmailIntelAlerts();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const ackMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/email-intel/alerts/${id}/acknowledge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/email-intel"] }); toast({ title: "Alert acknowledged" }); },
  });

  const ackAllMutation = useMutation({
    mutationFn: () => fetch("/api/email-intel/alerts/acknowledge-all", { method: "POST" }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/email-intel"] }); toast({ title: "All alerts acknowledged" }); },
  });

  const alerts = data?.alerts || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-400" /> Lauren — Admin Alerts
        </h2>
        {alerts.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => ackAllMutation.mutate()}>
            <CheckCircle2 className="w-4 h-4 mr-1" /> Acknowledge All
          </Button>
        )}
      </div>

      {alerts.length === 0 ? (
        <Card className="p-8 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <h3 className="font-semibold">All Clear</h3>
          <p className="text-sm text-muted-foreground mt-1">No pending alerts</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a: any) => (
            <Card key={a.id} className={a.priority === "critical" ? "bg-red-500/5 dark:bg-red-500/10" : "bg-orange-500/5 dark:bg-orange-500/10"}>
              <CardContent className="p-4 flex items-start gap-3">
                <Badge variant="outline" className={`text-[10px] ${a.priority === "critical" ? "bg-red-500/20 text-red-400" : "bg-orange-500/20 text-orange-400"}`}>
                  {a.priority.toUpperCase()}
                </Badge>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold">{a.message}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    From: <strong>{a.senderName || a.senderEmail}</strong> — "{a.emailSubject}"
                  </p>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(a.createdAt).toLocaleString()} • Triggers: {(a.triggers || []).join(", ")}
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => ackMutation.mutate(a.id)}>
                  <BellOff className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactsPanel() {
  const { data, isLoading } = useEmailIntelContacts();
  const contacts = data || [];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Users className="w-5 h-5" /> Contact Intelligence
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(Array.isArray(contacts) ? contacts : []).map((c: any) => (
          <Card key={c.id} className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-semibold">{(c.names || []).join(", ") || c.email}</div>
                  <div className="text-xs text-muted-foreground font-mono">{c.email}</div>
                </div>
                <RiskBadge risk={c.riskAssessment} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="secondary" className="text-[10px]">{c.totalEmails} emails</Badge>
                {c.isLawyer && (
                  <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-400 border-purple-500/30">LAWYER</Badge>
                )}
                {(c.matterIds || []).length > 1 && (
                  <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-400 border-orange-500/30">
                    MULTI-MATTER ({(c.matterIds || []).length})
                  </Badge>
                )}
                {c.dominantSentiment && <SentimentBadge sentiment={c.dominantSentiment} />}
                {c.alertCount > 0 && (
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/30">
                    {c.alertCount} alerts
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── ANALYZE EMAIL FORM ──

function AnalyzeEmailForm({ onSuccess }: { onSuccess: () => void }) {
  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState("");
  const [body, setBody] = useState("");
  const [direction, setDirection] = useState("inbound");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!body.trim()) {
      toast({ title: "Email body required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/email-intel/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, sender, body, direction, date }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const result = await res.json();
      if (result.alertsCreated > 0) {
        toast({
          title: `⚠ ${result.alertsCreated} Alert(s) Created`,
          description: "Lauren has been notified",
          variant: "destructive",
        });
      }
      onSuccess();
    } catch (err) {
      toast({ title: "Analysis failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Subject</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject" />
        </div>
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">From</Label>
          <Input value={sender} onChange={e => setSender(e.target.value)} placeholder="sender@example.com" />
        </div>
        <div>
          <Label className="text-xs">Direction</Label>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inbound">Inbound (received)</SelectItem>
              <SelectItem value="outbound">Outbound (sent)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Email Body</Label>
        <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Paste the full email content..." className="min-h-[200px]" />
      </div>
      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        {loading ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
        Analyze & Ingest
      </Button>
    </div>
  );
}
