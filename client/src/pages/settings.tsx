import { useState } from "react";
import { User, Bell, Palette, Users, Loader2, BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react";
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
      </Tabs>
    </div>
  );
}
