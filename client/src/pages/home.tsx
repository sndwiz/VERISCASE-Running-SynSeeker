import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutGrid,
  Plus,
  Briefcase,
  Clock,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dashboard } from "@/components/board/dashboard-widgets";
import type { Board, Task } from "@shared/schema";

interface DashboardStats {
  activeMatters: number;
  hoursLogged: number;
  documents: number;
  activeClients: number;
}

export default function HomePage() {
  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
  });

  const { data: recentTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks/recent"],
  });

  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const stats = [
    {
      title: "Active Matters",
      value: String(dashboardStats?.activeMatters ?? 0),
      change: "Active cases",
      icon: Briefcase,
      color: "text-blue-500",
    },
    {
      title: "Hours Logged",
      value: String(dashboardStats?.hoursLogged ?? 0),
      change: "This month",
      icon: Clock,
      color: "text-green-500",
    },
    {
      title: "Documents",
      value: String(dashboardStats?.documents ?? 0),
      change: "Total filed",
      icon: FileText,
      color: "text-purple-500",
    },
    {
      title: "Active Clients",
      value: String(dashboardStats?.activeClients ?? 0),
      change: "Total clients",
      icon: Users,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold" data-testid="text-welcome">
            Welcome to VERICASE
          </h1>
          <p className="text-muted-foreground mt-1">
            Your legal practice management dashboard
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" data-testid="button-quick-time">
            <Clock className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Log Time</span>
          </Button>
          <Button data-testid="button-new-matter">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">New Matter</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold" data-testid={`stat-value-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Boards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Your Boards</CardTitle>
              <CardDescription>Quick access to your work boards</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/boards" data-testid="link-view-all-boards">
                View All
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {boards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No boards yet</p>
                <p className="text-sm">Create your first board to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {boards.slice(0, 4).map((board) => (
                  <Link
                    key={board.id}
                    href={`/boards/${board.id}`}
                    className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer"
                    data-testid={`link-board-home-${board.id}`}
                  >
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center"
                      style={{ backgroundColor: board.color }}
                    >
                      <LayoutGrid className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{board.name}</p>
                      {board.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {board.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg">Recent Tasks</CardTitle>
              <CardDescription>Your latest task updates</CardDescription>
            </div>
            <Badge variant="secondary">
              <TrendingUp className="h-3 w-3 mr-1" />
              Active
            </Badge>
          </CardHeader>
          <CardContent>
            {recentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No tasks yet</p>
                <p className="text-sm">Tasks will appear here as you add them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-md"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        task.status === "done"
                          ? "bg-green-500"
                          : task.status === "stuck"
                          ? "bg-red-500"
                          : task.status === "working-on-it"
                          ? "bg-amber-500"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="flex-1 truncate text-sm">{task.title}</span>
                    <Progress value={task.progress} className="w-16 h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-3 md:py-4 flex flex-col gap-2">
              <Calendar className="h-5 w-5" />
              <span>Schedule Meeting</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 md:py-4 flex flex-col gap-2">
              <FileText className="h-5 w-5" />
              <span>Draft Document</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 md:py-4 flex flex-col gap-2">
              <Users className="h-5 w-5" />
              <span>Add Client</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 md:py-4 flex flex-col gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Set Deadline</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Task Analytics Dashboard */}
      {recentTasks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4" data-testid="text-analytics-heading">Task Analytics</h2>
          <Dashboard tasks={recentTasks} />
        </div>
      )}
    </div>
  );
}
