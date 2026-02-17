import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ListTodo,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Flag,
  Briefcase,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface TaskWithBoard {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  startDate?: string;
  assignees?: any[];
  owner?: any;
  progress: number;
  boardId: string;
  groupId: string;
  boardName?: string;
  boardColor?: string;
  matterId?: string;
  tags?: any[];
  createdAt: string;
}

const priorityOrder: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const statusColors: Record<string, string> = {
  "not-started": "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300",
  "in-progress": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "completed": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "on-hold": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "review": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

function isOverdue(task: TaskWithBoard): boolean {
  if (!task.dueDate || task.status === "completed") return false;
  return new Date(task.dueDate) < new Date(new Date().toDateString());
}

function isDueToday(task: TaskWithBoard): boolean {
  if (!task.dueDate) return false;
  const today = new Date().toISOString().split("T")[0];
  return task.dueDate === today;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function TaskCard({ task }: { task: TaskWithBoard }) {
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);

  return (
    <Card className={cn("hover-elevate", overdue && "border-red-300 dark:border-red-800")} data-testid={`card-task-${task.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/boards/${task.boardId}`}>
                <span className="font-medium hover:underline cursor-pointer" data-testid={`text-task-title-${task.id}`}>
                  {task.title}
                </span>
              </Link>
              {overdue && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
              {dueToday && !overdue && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">
                  Due Today
                </Badge>
              )}
            </div>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className={priorityColors[task.priority] || ""}>
                <Flag className="h-3 w-3 mr-1" />
                {task.priority}
              </Badge>
              <Badge variant="secondary" className={statusColors[task.status] || ""}>
                {task.status}
              </Badge>
              {task.boardName && (
                <Badge variant="outline" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1" />
                  {task.boardName}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
            {task.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(task.dueDate)}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyTasksPage() {
  const [activeTab, setActiveTab] = useState("my-tasks");

  const { data: myTasks = [], isLoading: loadingMy } = useQuery<TaskWithBoard[]>({
    queryKey: ["/api/tasks/my"],
  });

  const { data: todayTasks = [], isLoading: loadingToday } = useQuery<TaskWithBoard[]>({
    queryKey: ["/api/tasks/all-today"],
  });

  const overdueTasks = myTasks.filter(t => isOverdue(t));
  const dueTodayTasks = myTasks.filter(t => isDueToday(t));
  const inProgressTasks = myTasks.filter(t => t.status === "in-progress");
  const pendingTasks = myTasks.filter(t => t.status === "not-started");

  const sortedMyTasks = [...myTasks].sort((a, b) => {
    if (isOverdue(a) && !isOverdue(b)) return -1;
    if (!isOverdue(a) && isOverdue(b)) return 1;
    if (isDueToday(a) && !isDueToday(b)) return -1;
    if (!isDueToday(a) && isDueToday(b)) return 1;
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });

  const sortedTodayTasks = [...todayTasks].sort((a, b) => {
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });

  return (
    <div className="flex flex-col h-full" data-testid="page-my-tasks">
      <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div className="flex items-center gap-3">
          <ListTodo className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold" data-testid="text-my-tasks-title">My Tasks</h1>
        </div>
        <Link href="/briefing">
          <Button variant="outline" data-testid="button-daily-briefing">
            <Calendar className="h-4 w-4 mr-2" />
            Daily Briefing
          </Button>
        </Link>
      </div>

      <div className="p-3 md:p-4 space-y-4 flex-1 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <ListTodo className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold" data-testid="text-total-tasks">{myTasks.length}</div>
                  <div className="text-xs text-muted-foreground">My Tasks</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold" data-testid="text-overdue-count">{overdueTasks.length}</div>
                  <div className="text-xs text-muted-foreground">Overdue</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <div>
                  <div className="text-2xl font-bold" data-testid="text-due-today-count">{dueTodayTasks.length}</div>
                  <div className="text-xs text-muted-foreground">Due Today</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold" data-testid="text-in-progress-count">{inProgressTasks.length}</div>
                  <div className="text-xs text-muted-foreground">In Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="my-tasks" data-testid="tab-my-tasks">
              My Tasks ({myTasks.length})
            </TabsTrigger>
            <TabsTrigger value="today" data-testid="tab-today">
              All Today ({todayTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-tasks" className="mt-4">
            <ScrollArea className="h-[calc(100vh-360px)]">
              {loadingMy ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : sortedMyTasks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No tasks assigned to you yet.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tasks will appear here when they are assigned to you on any board.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {sortedMyTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="today" className="mt-4">
            <ScrollArea className="h-[calc(100vh-360px)]">
              {loadingToday ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : sortedTodayTasks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No tasks scheduled for today.</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tasks with today's date as their start or due date will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {sortedTodayTasks.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
