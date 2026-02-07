import { useState } from "react";
import { User, Bell, Palette, Users, Loader2, BarChart3, CheckCircle2, Clock, TrendingUp, Server, Wifi, WifiOff, RefreshCw, Cpu, DollarSign, Zap, AlertTriangle, Activity } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: "admin" | "member" | "viewer";
  createdAt?: string;
}

interface CurrentUser {
  id: string;
  role: "admin" | "member" | "viewer";
}

interface UserMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  completionRate: number;
  totalHoursTracked: number;
  billableHours: number;
}

interface UserPerformance {
  userId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  metrics: UserMetrics;
}

interface TeamMetrics {
  totalMembers: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  notStartedTasks: number;
  teamCompletionRate: number;
  totalHoursTracked: number;
  totalBillableHours: number;
}

interface PerformanceData {
  teamMetrics: TeamMetrics;
  userPerformance: UserPerformance[];
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

function getInitials(firstName?: string, lastName?: string, email?: string): string {
  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return "??";
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    deadlines: true,
    updates: true,
  });

  const { data: currentUser } = useQuery<CurrentUser>({
    queryKey: ["/api/auth/user"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<AuthUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: currentUser?.role === "admin",
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery<PerformanceData>({
    queryKey: ["/api/admin/performance"],
    enabled: currentUser?.role === "admin",
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      toast({ title: "Role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const handleSave = () => {
    toast({ title: "Settings saved successfully" });
  };

  const isAdmin = currentUser?.role === "admin";

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" data-testid="text-settings-title">
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" data-testid="tab-general">
            <User className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" data-testid="tab-appearance">
            <Palette className="h-4 w-4 mr-2" />
            Appearance
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="team" data-testid="tab-team">
              <Users className="h-4 w-4 mr-2" />
              Team
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="dashboard" data-testid="tab-dashboard">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="synseekr" data-testid="tab-synseekr">
              <Server className="h-4 w-4 mr-2" />
              SynSeekr
            </TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="ai-ops" data-testid="tab-ai-ops">
              <Cpu className="h-4 w-4 mr-2" />
              AI Ops
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your profile details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Smith"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@lawfirm.com"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firm">Law Firm</Label>
                <Input
                  id="firm"
                  placeholder="Smith & Associates"
                  data-testid="input-firm"
                />
              </div>
              <Button onClick={handleSave} data-testid="button-save-profile">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                  data-testid="switch-email-notifications"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications in browser
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, push: checked })
                  }
                  data-testid="switch-push-notifications"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Deadline Reminders</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified about upcoming deadlines
                  </p>
                </div>
                <Switch
                  checked={notifications.deadlines}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, deadlines: checked })
                  }
                  data-testid="switch-deadline-notifications"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Task Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Notifications when tasks are updated
                  </p>
                </div>
                <Switch
                  checked={notifications.updates}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, updates: checked })
                  }
                  data-testid="switch-update-notifications"
                />
              </div>
              <Button onClick={handleSave} data-testid="button-save-notifications">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="font-medium mb-3">Theme</p>
                <div className="flex gap-3">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => setTheme("light")}
                    data-testid="button-theme-light"
                  >
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => setTheme("dark")}
                    data-testid="button-theme-dark"
                  >
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    onClick={() => setTheme("system")}
                    data-testid="button-theme-system"
                  >
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Management</CardTitle>
                <CardDescription>
                  Manage team members and their access levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !users || users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No team members found
                  </p>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-md border"
                        data-testid={`team-member-${user.id}`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback
                              className="text-white"
                              style={{ backgroundColor: getColorForUser(user.id) }}
                            >
                              {getInitials(user.firstName, user.lastName, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.email?.split("@")[0] || "User"}
                            </p>
                            {user.email && (
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {user.id === currentUser?.id ? (
                            <Badge variant="secondary">You</Badge>
                          ) : (
                            <Select
                              value={user.role}
                              onValueChange={(value) =>
                                updateRoleMutation.mutate({ userId: user.id, role: value })
                              }
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger
                                className="w-28"
                                data-testid={`select-role-${user.id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                                <SelectItem value="viewer">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Badge
                            variant={
                              user.role === "admin"
                                ? "default"
                                : user.role === "member"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="dashboard">
            <div className="space-y-6">
              {performanceLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : performanceData ? (
                <>
                  <div className="grid gap-4 md:grid-cols-4">
                    <Card data-testid="card-team-members">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-team-members-count">{performanceData.teamMetrics.totalMembers}</div>
                        <p className="text-xs text-muted-foreground">Active team members</p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-completion-rate">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-completion-rate">{performanceData.teamMetrics.teamCompletionRate}%</div>
                        <p className="text-xs text-muted-foreground">
                          {performanceData.teamMetrics.completedTasks} of {performanceData.teamMetrics.totalTasks} tasks
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-hours-tracked">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-sm font-medium">Hours Tracked</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-hours-tracked">{performanceData.teamMetrics.totalHoursTracked}h</div>
                        <p className="text-xs text-muted-foreground">
                          {performanceData.teamMetrics.totalBillableHours}h billable
                        </p>
                      </CardContent>
                    </Card>
                    <Card data-testid="card-in-progress">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold" data-testid="text-in-progress-count">{performanceData.teamMetrics.inProgressTasks}</div>
                        <p className="text-xs text-muted-foreground">
                          {performanceData.teamMetrics.notStartedTasks} not started
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card data-testid="card-individual-performance">
                    <CardHeader>
                      <CardTitle>Individual Performance</CardTitle>
                      <CardDescription>
                        Task completion and time tracking by team member
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {performanceData.userPerformance.map((user) => (
                          <div key={user.userId} className="space-y-3" data-testid={`row-user-performance-${user.userId}`}>
                            <div className="flex items-center gap-3 flex-wrap">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback
                                  className="text-white"
                                  style={{ backgroundColor: getColorForUser(user.userId) }}
                                >
                                  {getInitials(user.firstName, user.lastName, user.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <p className="font-medium" data-testid={`text-user-name-${user.userId}`}>
                                    {user.firstName && user.lastName
                                      ? `${user.firstName} ${user.lastName}`
                                      : user.email?.split("@")[0] || "User"}
                                  </p>
                                  <Badge variant="secondary">{user.role}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pl-12">
                              <div className="bg-muted/50 rounded-lg p-3" data-testid={`metric-tasks-${user.userId}`}>
                                <p className="text-xs text-muted-foreground">Tasks Assigned</p>
                                <p className="text-lg font-semibold">{user.metrics.totalTasks}</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3" data-testid={`metric-completed-${user.userId}`}>
                                <p className="text-xs text-muted-foreground">Completed</p>
                                <p className="text-lg font-semibold text-green-600 dark:text-green-400">{user.metrics.completedTasks}</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3" data-testid={`metric-rate-${user.userId}`}>
                                <p className="text-xs text-muted-foreground">Completion Rate</p>
                                <p className="text-lg font-semibold">{user.metrics.completionRate}%</p>
                              </div>
                              <div className="bg-muted/50 rounded-lg p-3" data-testid={`metric-hours-${user.userId}`}>
                                <p className="text-xs text-muted-foreground">Hours Tracked</p>
                                <p className="text-lg font-semibold">{user.metrics.totalHoursTracked}h</p>
                              </div>
                            </div>
                            
                            <div className="w-full bg-muted rounded-full h-2 ml-12" data-testid={`progress-bar-${user.userId}`}>
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${user.metrics.completionRate}%` }}
                              />
                            </div>
                            
                            <Separator />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Unable to load performance data
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="synseekr">
            <SynSeekrSettings />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="ai-ops">
            <AIOpsDashboard />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

interface SynSeekrConnectionConfig {
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  lastStatus?: string;
  lastChecked?: string;
  lastLatencyMs?: number;
}

interface SynSeekrHealthResult {
  status: "online" | "offline" | "error";
  latencyMs: number;
  version?: string;
  timestamp: string;
}

function SynSeekrSettings() {
  const { toast } = useToast();
  const [serverUrl, setServerUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<SynSeekrHealthResult | null>(null);

  const { data: config, isLoading } = useQuery<SynSeekrConnectionConfig>({
    queryKey: ["/api/synseekr/config"],
  });

  const { data: statusData } = useQuery<{ configured: boolean; enabled: boolean; status: string; lastChecked: string; latencyMs: number }>({
    queryKey: ["/api/synseekr/status"],
    refetchInterval: 30000,
  });

  const updateConfigMutation = useMutation({
    mutationFn: (data: Partial<SynSeekrConnectionConfig>) =>
      apiRequest("PATCH", "/api/synseekr/config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/synseekr/config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/synseekr/status"] });
      toast({ title: "SynSeekr configuration updated" });
    },
    onError: () => {
      toast({ title: "Failed to update configuration", variant: "destructive" });
    },
  });

  const handleSaveConfig = () => {
    const update: Partial<SynSeekrConnectionConfig> = {};
    if (serverUrl) update.baseUrl = serverUrl;
    if (apiKey) update.apiKey = apiKey;
    updateConfigMutation.mutate(update);
  };

  const handleToggleEnabled = (enabled: boolean) => {
    updateConfigMutation.mutate({ enabled });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const response = await apiRequest("POST", "/api/synseekr/test");
      const result = await response.json();
      setTestResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/synseekr/status"] });
      if (result.status === "online") {
        toast({ title: "SynSeekr connection successful" });
      } else {
        toast({ title: "SynSeekr connection failed", description: `Status: ${result.status}`, variant: "destructive" });
      }
    } catch {
      setTestResult({ status: "error", latencyMs: 0, timestamp: new Date().toISOString() });
      toast({ title: "Connection test failed", variant: "destructive" });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = statusData?.status === "online";
  const isConfigured = statusData?.configured ?? false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
                <Server className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle>SynSeekr Server Connection</CardTitle>
                <CardDescription>
                  Connect to your SynSeekr AI server for advanced document analysis, entity extraction, and investigation capabilities
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConfigured && (
                <Badge
                  variant={isConnected ? "default" : "secondary"}
                  className={isConnected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : ""}
                  data-testid="badge-synseekr-status"
                >
                  {isConnected ? (
                    <><Wifi className="h-3 w-3 mr-1" /> Online</>
                  ) : (
                    <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Enable SynSeekr Integration</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When enabled, automations and AI features will use SynSeekr for processing
              </p>
            </div>
            <Switch
              checked={config?.enabled ?? false}
              onCheckedChange={handleToggleEnabled}
              data-testid="switch-synseekr-enabled"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="synseekr-url">Server URL</Label>
              <Input
                id="synseekr-url"
                placeholder="https://api.synseekr.com or http://192.168.1.50:8000"
                defaultValue={config?.baseUrl || ""}
                onChange={(e) => setServerUrl(e.target.value)}
                data-testid="input-synseekr-url"
              />
              <p className="text-xs text-muted-foreground">
                The URL of your SynSeekr orchestrator API. Use a Cloudflare Tunnel URL for secure remote access.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="synseekr-key">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="synseekr-key"
                  type={showApiKey ? "text" : "password"}
                  placeholder="Enter your SynSeekr API key"
                  defaultValue=""
                  onChange={(e) => setApiKey(e.target.value)}
                  data-testid="input-synseekr-key"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowApiKey(!showApiKey)}
                  data-testid="button-toggle-key-visibility"
                >
                  {showApiKey ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                API key for authenticating with SynSeekr. Generated on your SynSeekr server.
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={handleSaveConfig}
                disabled={updateConfigMutation.isPending || (!serverUrl && !apiKey)}
                data-testid="button-save-synseekr"
              >
                {updateConfigMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  "Save Configuration"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting || !isConfigured}
                data-testid="button-test-synseekr"
              >
                {isTesting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" /> Test Connection</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection Test Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`h-2.5 w-2.5 rounded-full ${testResult.status === "online" ? "bg-emerald-500" : testResult.status === "error" ? "bg-red-500" : "bg-yellow-500"}`} />
                  <span className="text-sm font-medium capitalize" data-testid="text-test-status">{testResult.status}</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Latency</p>
                <p className="text-sm font-medium" data-testid="text-test-latency">{testResult.latencyMs}ms</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Version</p>
                <p className="text-sm font-medium" data-testid="text-test-version">{testResult.version || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SynSeekr Capabilities</CardTitle>
          <CardDescription>
            When connected, these features are powered by your local SynSeekr server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { name: "Document Analysis", desc: "Deep AI analysis with local LLMs", active: isConnected },
              { name: "Entity Extraction", desc: "GLiNER/GLiREL NER models", active: isConnected },
              { name: "Vector Search (RAG)", desc: "Qdrant + BGE-M3 embeddings", active: isConnected },
              { name: "Graph Intelligence", desc: "Neo4j knowledge graph queries", active: isConnected },
              { name: "Contradiction Detection", desc: "Cross-document conflict analysis", active: isConnected },
              { name: "Investigation Engine", desc: "Claims, evidence, credibility", active: isConnected },
              { name: "AI Agents", desc: "Riley, Elena, David, Judge Chen", active: isConnected },
              { name: "PII Protection", desc: "Presidio anonymization/redaction", active: isConnected },
            ].map((cap) => (
              <div key={cap.name} className="flex items-center gap-3 p-2 rounded-md">
                <div className={`h-2 w-2 rounded-full shrink-0 ${cap.active ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                <div>
                  <p className="text-sm font-medium">{cap.name}</p>
                  <p className="text-xs text-muted-foreground">{cap.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AIOpsRecord {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  operation: string;
  inputTokensEst: number;
  outputTokensEst: number;
  costEstUsd: number;
  latencyMs: number;
  status: "success" | "error";
  errorMessage?: string;
  caller: string;
}

interface AIOpsSum {
  totalCalls: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  successRate: number;
  byModel: Record<string, { calls: number; costUsd: number; avgLatencyMs: number; errorCount: number }>;
  byOperation: Record<string, { calls: number; costUsd: number; avgLatencyMs: number }>;
  recentErrors: Array<{ timestamp: string; model: string; operation: string; error: string }>;
  last24hCalls: number;
  last24hCostUsd: number;
}

function AIOpsDashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery<AIOpsSum>({
    queryKey: ["/api/ai-ops/summary"],
    refetchInterval: 15000,
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery<{ records: AIOpsRecord[] }>({
    queryKey: ["/api/ai-ops/records"],
    refetchInterval: 15000,
  });

  const records = recordsData?.records || [];

  if (summaryLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = summary || {
    totalCalls: 0, totalCostUsd: 0, avgLatencyMs: 0, successRate: 100,
    byModel: {}, byOperation: {}, recentErrors: [], last24hCalls: 0, last24hCostUsd: 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-ai-total-calls">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Total AI Calls</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-ai-total-calls">{s.totalCalls}</p>
            <p className="text-xs text-muted-foreground">{s.last24hCalls} in last 24h</p>
          </CardContent>
        </Card>

        <Card data-testid="card-ai-total-cost">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-ai-total-cost">${s.totalCostUsd.toFixed(4)}</p>
            <p className="text-xs text-muted-foreground">${s.last24hCostUsd.toFixed(4)} in last 24h</p>
          </CardContent>
        </Card>

        <Card data-testid="card-ai-avg-latency">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-ai-avg-latency">
              {s.avgLatencyMs > 1000 ? `${(s.avgLatencyMs / 1000).toFixed(1)}s` : `${s.avgLatencyMs}ms`}
            </p>
            <p className="text-xs text-muted-foreground">across all models</p>
          </CardContent>
        </Card>

        <Card data-testid="card-ai-success-rate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-ai-success-rate">{s.successRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">{s.totalCalls - Math.round(s.totalCalls * s.successRate / 100)} errors</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by Model</CardTitle>
            <CardDescription>Call count, cost, and latency per model</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(s.byModel).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No AI calls recorded yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(s.byModel)
                  .sort(([, a], [, b]) => b.calls - a.calls)
                  .map(([model, data]) => (
                    <div key={model} className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30" data-testid={`row-model-${model}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{model}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="secondary">{data.calls} calls</Badge>
                          <Badge variant="outline">${data.costUsd.toFixed(4)}</Badge>
                          <Badge variant="outline">{data.avgLatencyMs}ms avg</Badge>
                          {data.errorCount > 0 && (
                            <Badge variant="destructive">{data.errorCount} errors</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage by Operation</CardTitle>
            <CardDescription>Breakdown by AI operation type</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(s.byOperation).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No AI calls recorded yet</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(s.byOperation)
                  .sort(([, a], [, b]) => b.calls - a.calls)
                  .map(([op, data]) => (
                    <div key={op} className="flex items-center justify-between gap-3 p-2 rounded-md bg-muted/30" data-testid={`row-op-${op}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">{op.replace(/_/g, " ")}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="secondary">{data.calls} calls</Badge>
                          <Badge variant="outline">${data.costUsd.toFixed(4)}</Badge>
                          <Badge variant="outline">{data.avgLatencyMs}ms avg</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {s.recentErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {s.recentErrors.map((err, i) => (
                <div key={i} className="flex flex-wrap items-start gap-2 p-2 rounded-md bg-destructive/5 text-sm" data-testid={`row-error-${i}`}>
                  <Badge variant="destructive">{err.model}</Badge>
                  <Badge variant="outline">{err.operation}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(err.timestamp).toLocaleString()}</span>
                  <p className="w-full text-xs text-destructive">{err.error}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent AI Operations</CardTitle>
          <CardDescription>Last {records.length} tracked AI calls</CardDescription>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No AI operations recorded yet. Use Verbo or other AI features to see tracking data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">Time</th>
                    <th className="pb-2 font-medium">Model</th>
                    <th className="pb-2 font-medium">Operation</th>
                    <th className="pb-2 font-medium">Caller</th>
                    <th className="pb-2 font-medium text-right">Tokens</th>
                    <th className="pb-2 font-medium text-right">Cost</th>
                    <th className="pb-2 font-medium text-right">Latency</th>
                    <th className="pb-2 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 20).map((r) => (
                    <tr key={r.id} className="border-b last:border-0" data-testid={`row-record-${r.id}`}>
                      <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2 text-xs font-mono truncate max-w-[120px]">{r.model}</td>
                      <td className="py-2 text-xs capitalize">{r.operation.replace(/_/g, " ")}</td>
                      <td className="py-2 text-xs capitalize">{r.caller.replace(/_/g, " ")}</td>
                      <td className="py-2 text-xs text-right">{(r.inputTokensEst + r.outputTokensEst).toLocaleString()}</td>
                      <td className="py-2 text-xs text-right">${r.costEstUsd.toFixed(5)}</td>
                      <td className="py-2 text-xs text-right">
                        {r.latencyMs > 1000 ? `${(r.latencyMs / 1000).toFixed(1)}s` : `${r.latencyMs}ms`}
                      </td>
                      <td className="py-2 text-center">
                        {r.status === "success" ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 inline" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 text-destructive inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
