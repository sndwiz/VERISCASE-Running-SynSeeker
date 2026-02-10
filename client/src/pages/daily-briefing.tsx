import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Briefcase,
  ListTodo,
  Zap,
  ArrowRight,
  Flag,
  CircleDot,
  FileText,
  Bot
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { Task, Matter, AutomationRun } from "@shared/schema";

interface BriefingData {
  user: {
    id: string;
    name: string;
    email?: string;
  };
  greeting: string;
  date: string;
  summary: {
    totalActiveTasks: number;
    completedToday: number;
    overdue: number;
    dueToday: number;
    upcomingDeadlines: number;
    criticalItems: number;
    completionRate: number;
    activeMatters: number;
    totalMatters: number;
    totalClients: number;
  };
  tasks: {
    overdue: Task[];
    dueToday: Task[];
    upcoming: Task[];
    critical: Task[];
    highPriority: Task[];
    inProgress: Task[];
    pendingReview: Task[];
    recentlyCompleted: Task[];
  };
  matters: Matter[];
  recentAutomations: AutomationRun[];
}

const priorityColors = {
  critical: "bg-red-500 text-white",
  high: "bg-orange-500 text-white",
  medium: "bg-blue-500 text-white",
  low: "bg-gray-400 text-white",
};

const statusColors = {
  "not-started": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "working-on-it": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "stuck": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  "done": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "pending-review": "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

export default function DailyBriefingPage() {
  const { data: briefing, isLoading } = useQuery<BriefingData>({
    queryKey: ["/api/briefing"],
  });

  if (isLoading) {
    return <BriefingSkeleton />;
  }

  if (!briefing) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Unable to load briefing data</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-briefing-greeting">
            {briefing.greeting}, {briefing.user.name}
          </h1>
          <p className="text-muted-foreground" data-testid="text-briefing-date">
            {briefing.date}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Active Tasks"
            value={briefing.summary.totalActiveTasks}
            icon={<ListTodo className="h-5 w-5" />}
            color="bg-blue-500"
            testId="stat-active-tasks"
          />
          <StatCard
            title="Overdue"
            value={briefing.summary.overdue}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="bg-red-500"
            alert={briefing.summary.overdue > 0}
            testId="stat-overdue"
          />
          <StatCard
            title="Due Today"
            value={briefing.summary.dueToday}
            icon={<Clock className="h-5 w-5" />}
            color="bg-amber-500"
            testId="stat-due-today"
          />
          <StatCard
            title="Completion Rate"
            value={`${briefing.summary.completionRate}%`}
            icon={<TrendingUp className="h-5 w-5" />}
            color="bg-green-500"
            testId="stat-completion-rate"
          />
        </div>

        {briefing.summary.criticalItems > 0 && (
          <Card className="border-red-500 border-2 bg-red-50 dark:bg-red-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Critical Items Requiring Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {briefing.tasks.critical.map((task) => (
                  <TaskRow key={task.id} task={task} showPriority />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {briefing.tasks.overdue.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Overdue Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {briefing.tasks.overdue.map((task) => (
                  <TaskRow key={task.id} task={task} showDueDate />
                ))}
              </CardContent>
            </Card>
          )}

          {briefing.tasks.dueToday.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Due Today
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {briefing.tasks.dueToday.map((task) => (
                  <TaskRow key={task.id} task={task} showPriority />
                ))}
              </CardContent>
            </Card>
          )}

          {briefing.tasks.inProgress.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <CircleDot className="h-4 w-4 text-blue-500" />
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {briefing.tasks.inProgress.map((task) => (
                  <TaskRow key={task.id} task={task} showPriority />
                ))}
              </CardContent>
            </Card>
          )}

          {briefing.tasks.pendingReview.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-purple-500" />
                  Pending Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {briefing.tasks.pendingReview.map((task) => (
                  <TaskRow key={task.id} task={task} showPriority />
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {briefing.tasks.upcoming.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-teal-500" />
                Upcoming Deadlines (Next 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {briefing.tasks.upcoming.map((task) => (
                  <TaskRow key={task.id} task={task} showDueDate showPriority />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {briefing.matters.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Briefcase className="h-4 w-4 text-indigo-500" />
                    Your Active Matters
                  </CardTitle>
                  <Link href="/matters">
                    <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-matters">
                      View All
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {briefing.matters.map((matter) => (
                  <div
                    key={matter.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate"
                    data-testid={`matter-row-${matter.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{matter.name}</p>
                      <p className="text-xs text-muted-foreground">{matter.practiceArea}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {matter.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Recently Completed
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {briefing.tasks.recentlyCompleted.length > 0 ? (
                briefing.tasks.recentlyCompleted.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-2 rounded-md text-sm"
                    data-testid={`completed-task-${task.id}`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    <span className="truncate text-muted-foreground">{task.title}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No completed tasks yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {briefing.recentAutomations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Recent Automations
                </CardTitle>
                <Link href="/automations">
                  <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-automations">
                    View All
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {briefing.recentAutomations.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md text-sm"
                    data-testid={`automation-run-${run.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="truncate">Automation executed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary"
                        className={cn(
                          "text-xs",
                          run.status === "completed" && "bg-green-100 text-green-700",
                          run.status === "failed" && "bg-red-100 text-red-700"
                        )}
                      >
                        {run.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(run.executedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between gap-2 py-6">
            <div className="space-y-1">
              <h3 className="font-semibold">Need help with your tasks?</h3>
              <p className="text-sm text-muted-foreground">
                Ask Verbo for assistance with research, drafting, or case analysis.
              </p>
            </div>
            <Link href="/ai-chat">
              <Button className="gap-2" data-testid="button-ask-verbo">
                <Bot className="h-4 w-4" />
                Ask Verbo
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}

function StatCard({ 
  title, 
  value, 
  icon, 
  color, 
  alert,
  testId 
}: { 
  title: string; 
  value: number | string; 
  icon: React.ReactNode; 
  color: string;
  alert?: boolean;
  testId: string;
}) {
  return (
    <Card className={cn(alert && "border-red-500 animate-pulse")} data-testid={testId}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("p-2 rounded-lg text-white", color)}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskRow({ 
  task, 
  showDueDate, 
  showPriority 
}: { 
  task: Task; 
  showDueDate?: boolean; 
  showPriority?: boolean;
}) {
  return (
    <Link href={`/boards/${task.boardId}`}>
      <div
        className="flex items-center justify-between gap-2 p-2 rounded-md hover-elevate cursor-pointer"
        data-testid={`task-row-${task.id}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="truncate text-sm">{task.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showPriority && (
            <Badge 
              className={cn("text-xs", priorityColors[task.priority])}
              data-testid={`badge-priority-${task.id}`}
            >
              {task.priority}
            </Badge>
          )}
          {showDueDate && task.dueDate && (
            <span className="text-xs text-muted-foreground">
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function BriefingSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-10 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
