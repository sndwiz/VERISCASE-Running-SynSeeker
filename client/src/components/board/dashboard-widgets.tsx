import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  RefreshCw,
  Maximize2,
  GripVertical,
  Plus,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Task, StatusType, Priority } from "@shared/schema";
import { statusConfig, priorityConfig } from "@shared/schema";

interface WidgetProps {
  title: string;
  children: React.ReactNode;
  onRefresh?: () => void;
  onExpand?: () => void;
  onRemove?: () => void;
  className?: string;
}

function Widget({ title, children, onRefresh, onExpand, onRemove, className = "" }: WidgetProps) {
  return (
    <Card className={`relative group ${className}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-move" />
            {title}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onRefresh && (
                <DropdownMenuItem onClick={onRefresh}>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Refresh
                </DropdownMenuItem>
              )}
              {onExpand && (
                <DropdownMenuItem onClick={onExpand}>
                  <Maximize2 className="h-3 w-3 mr-2" />
                  Expand
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem onClick={onRemove} className="text-destructive">
                  <X className="h-3 w-3 mr-2" />
                  Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

interface NumberWidgetProps {
  title: string;
  value: number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: string;
}

export function NumberWidget({ title, value, change, changeLabel, icon, color = "text-primary" }: NumberWidgetProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Widget title={title}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {change !== undefined && (
            <p className={`text-xs flex items-center gap-1 mt-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(change)}% {changeLabel || "vs last week"}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-primary/10 ${color}`}>
          {icon}
        </div>
      </div>
    </Widget>
  );
}

interface StatusDistributionProps {
  tasks: Task[];
}

export function StatusDistributionWidget({ tasks }: StatusDistributionProps) {
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<StatusType, number>);

  const total = tasks.length;
  const statuses = Object.entries(statusConfig) as [StatusType, typeof statusConfig["done"]][];

  const pieData = statuses.map(([status, config], index) => {
    const count = statusCounts[status] || 0;
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return { status, config, count, percentage };
  });

  const colors = [
    "hsl(var(--muted))",
    "hsl(45 93% 47%)",
    "hsl(0 84% 60%)",
    "hsl(142 76% 36%)",
    "hsl(262 83% 58%)",
  ];

  return (
    <Widget title="Status Distribution">
      <div className="flex items-center gap-6">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            {(() => {
              let cumulativePercent = 0;
              return pieData.map(({ status, percentage }, index) => {
                const startPercent = cumulativePercent;
                cumulativePercent += percentage;
                const strokeDasharray = `${percentage} ${100 - percentage}`;
                const strokeDashoffset = -startPercent;

                return (
                  <circle
                    key={status}
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke={colors[index]}
                    strokeWidth="20"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                );
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{total}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {pieData.map(({ status, config, count, percentage }, index) => (
            <div key={status} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index] }} />
              <span className="text-xs flex-1">{config.label}</span>
              <span className="text-xs font-medium">{count}</span>
              <span className="text-xs text-muted-foreground w-12 text-right">
                {percentage.toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </Widget>
  );
}

interface PriorityChartProps {
  tasks: Task[];
}

export function PriorityChartWidget({ tasks }: PriorityChartProps) {
  const priorityCounts = tasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1;
    return acc;
  }, {} as Record<Priority, number>);

  const priorities = Object.entries(priorityConfig) as [Priority, typeof priorityConfig["low"]][];
  const maxCount = Math.max(...Object.values(priorityCounts), 1);

  const barColors: Record<Priority, string> = {
    low: "bg-gray-400",
    medium: "bg-blue-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };

  return (
    <Widget title="Priority Breakdown">
      <div className="space-y-3">
        {priorities.map(([priority, config]) => {
          const count = priorityCounts[priority] || 0;
          const percentage = (count / maxCount) * 100;

          return (
            <div key={priority} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>{config.label}</span>
                <span className="font-medium">{count}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColors[priority]} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

interface ProgressWidgetProps {
  title: string;
  current: number;
  total: number;
  label?: string;
}

export function ProgressWidget({ title, current, total, label }: ProgressWidgetProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Widget title={title}>
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <span className="text-3xl font-bold">{percentage}%</span>
            <p className="text-xs text-muted-foreground mt-1">
              {label || `${current} of ${total} completed`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg font-semibold text-primary">{current}</span>
            <span className="text-muted-foreground">/{total}</span>
          </div>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    </Widget>
  );
}

interface RecentActivityProps {
  tasks: Task[];
  limit?: number;
}

export function RecentActivityWidget({ tasks, limit = 5 }: RecentActivityProps) {
  const sortedTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Widget title="Recent Activity">
      <ScrollArea className="h-[280px]">
        <div className="space-y-3">
          {sortedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No recent activity
            </p>
          ) : (
            sortedTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-3 pb-3 border-b last:border-0">
                <div className={`mt-1 p-1.5 rounded-full ${statusConfig[task.status].bgColor}`}>
                  <CheckCircle2 className={`h-3 w-3 ${statusConfig[task.status].color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(task.createdAt)}
                  </p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {statusConfig[task.status].label}
                </Badge>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Widget>
  );
}

interface TeamWorkloadProps {
  tasks: Task[];
}

export function TeamWorkloadWidget({ tasks }: TeamWorkloadProps) {
  const assigneeCounts: Record<string, { name: string; count: number; avatar?: string }> = {};

  tasks.forEach((task) => {
    (task.assignees || []).forEach((assignee) => {
      if (!assigneeCounts[assignee.id]) {
        assigneeCounts[assignee.id] = { name: assignee.name, count: 0, avatar: assignee.avatar };
      }
      assigneeCounts[assignee.id].count++;
    });
  });

  const sortedAssignees = Object.values(assigneeCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const maxCount = Math.max(...sortedAssignees.map((a) => a.count), 1);

  return (
    <Widget title="Team Workload">
      {sortedAssignees.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No assigned tasks
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAssignees.map((assignee) => (
            <div key={assignee.name} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                {assignee.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate">{assignee.name}</span>
                  <span className="text-xs text-muted-foreground">{assignee.count} tasks</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${(assignee.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

interface UpcomingDeadlinesProps {
  tasks: Task[];
  limit?: number;
}

export function UpcomingDeadlinesWidget({ tasks, limit = 5 }: UpcomingDeadlinesProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTasks = tasks
    .filter((task) => task.dueDate && new Date(task.dueDate) >= today && task.status !== "done")
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, limit);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getUrgencyColor = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);

    if (diffDays <= 0) return "text-red-600 bg-red-100 dark:bg-red-900/30";
    if (diffDays <= 2) return "text-orange-600 bg-orange-100 dark:bg-orange-900/30";
    return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
  };

  return (
    <Widget title="Upcoming Deadlines">
      {upcomingTasks.length === 0 ? (
        <div className="text-center py-6">
          <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover-elevate">
              <div className={`p-1.5 rounded ${getUrgencyColor(task.dueDate!)}`}>
                <Clock className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground">{formatDate(task.dueDate!)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}

interface DashboardProps {
  tasks: Task[];
  className?: string;
}

export function Dashboard({ tasks, className = "" }: DashboardProps) {
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done") return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  const inProgressTasks = tasks.filter((t) => t.status === "working-on-it").length;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <NumberWidget
          title="Total Tasks"
          value={tasks.length}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <NumberWidget
          title="Completed"
          value={completedTasks}
          change={12}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="text-green-600"
        />
        <NumberWidget
          title="In Progress"
          value={inProgressTasks}
          icon={<TrendingUp className="h-5 w-5" />}
          color="text-blue-600"
        />
        <NumberWidget
          title="Overdue"
          value={overdueTasks}
          change={-5}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatusDistributionWidget tasks={tasks} />
        <PriorityChartWidget tasks={tasks} />
        <ProgressWidget
          title="Overall Progress"
          current={completedTasks}
          total={tasks.length}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <RecentActivityWidget tasks={tasks} />
        <TeamWorkloadWidget tasks={tasks} />
        <UpcomingDeadlinesWidget tasks={tasks} />
      </div>
    </div>
  );
}
