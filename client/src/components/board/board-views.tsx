import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Board, Group, Task, CustomStatusLabel } from "@shared/schema";
import { defaultStatusLabels } from "@shared/schema";

export type BoardViewType = "table" | "kanban" | "calendar" | "dashboard";

interface ViewTabsProps {
  activeView: BoardViewType;
  onViewChange: (view: BoardViewType) => void;
}

export function ViewTabs({ activeView, onViewChange }: ViewTabsProps) {
  const views: { id: BoardViewType; label: string }[] = [
    { id: "table", label: "Main Table" },
    { id: "kanban", label: "Kanban" },
    { id: "calendar", label: "Calendar" },
    { id: "dashboard", label: "Dashboard" },
  ];

  return (
    <div className="flex items-center px-1" data-testid="board-view-tabs">
      {views.map((v) => (
        <div key={v.id} className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewChange(v.id)}
            className={`rounded-none ${
              activeView === v.id
                ? "text-primary font-semibold"
                : "text-muted-foreground"
            }`}
            data-testid={`tab-view-${v.id}`}
          >
            {v.label}
          </Button>
          {activeView === v.id && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
          )}
        </div>
      ))}
    </div>
  );
}

function getStatusColor(status: string, statusLabels: CustomStatusLabel[]): string {
  const label = statusLabels.find(l => l.id === status);
  return label?.color || "#6b7280";
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical": return "#ef4444";
    case "high": return "#f97316";
    case "medium": return "#eab308";
    case "low": return "#22c55e";
    default: return "#6b7280";
  }
}

interface KanbanViewProps {
  board: Board;
  groups: Group[];
  tasks: Task[];
  statusLabels: CustomStatusLabel[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onAddTask: (groupId?: string) => void;
}

export function KanbanView({ board, groups, tasks, statusLabels, onTaskClick, onTaskUpdate, onAddTask }: KanbanViewProps) {
  const labels = statusLabels.length > 0 ? statusLabels : defaultStatusLabels;

  const columns = useMemo(() => {
    return labels.map(label => ({
      status: label.id,
      label: label.label,
      color: label.color,
      tasks: tasks.filter(t => t.status === label.id),
    }));
  }, [labels, tasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (taskId) {
      onTaskUpdate(taskId, { status: status as any });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex-1 overflow-auto p-4" data-testid="kanban-view">
      <div className="flex gap-4 min-h-full">
        {columns.map(col => (
          <div
            key={col.status}
            className="flex flex-col min-w-[280px] w-[280px] shrink-0"
            onDrop={(e) => handleDrop(e, col.status)}
            onDragOver={handleDragOver}
          >
            <div className="flex items-center gap-2 mb-3 px-1" data-testid={`kanban-column-header-${col.status}`}>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color }} />
              <span className="text-sm font-semibold" data-testid={`text-kanban-column-${col.status}`}>{col.label}</span>
              <Badge variant="secondary" className="ml-auto text-xs" data-testid={`badge-kanban-count-${col.status}`}>
                {col.tasks.length}
              </Badge>
            </div>

            <div className="flex flex-col gap-2 flex-1 min-h-[100px] rounded-md bg-muted/30 p-2">
              {col.tasks.map(task => {
                const group = groups.find(g => g.id === task.groupId);
                return (
                  <Card
                    key={task.id}
                    className="p-3 cursor-pointer hover-elevate"
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onTaskClick(task)}
                    data-testid={`kanban-card-${task.id}`}
                  >
                    {group && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                        <span className="text-xs text-muted-foreground">{group.title}</span>
                      </div>
                    )}
                    <p className="text-sm font-medium mb-2 line-clamp-2">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: getPriorityColor(task.priority), color: getPriorityColor(task.priority) }}
                      >
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      )}
                      {task.assignees && task.assignees.length > 0 && (
                        <span className="text-xs text-muted-foreground ml-auto">
                          {task.assignees.length} assigned
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-1 text-muted-foreground"
                onClick={() => onAddTask()}
                data-testid={`kanban-add-${col.status}`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  statusLabels: CustomStatusLabel[];
}

export function CalendarView({ tasks, onTaskClick, statusLabels }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const labels = statusLabels.length > 0 ? statusLabels : defaultStatusLabels;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(task);
      }
    });
    return map;
  }, [tasks]);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="flex-1 overflow-auto p-4" data-testid="calendar-view">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} data-testid="button-prev-month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold min-w-[180px] text-center" data-testid="text-calendar-month">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <Button variant="outline" size="icon" onClick={nextMonth} data-testid="button-next-month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToday} data-testid="button-today">
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 border rounded-md overflow-hidden">
        {dayNames.map(name => (
          <div key={name} className="p-2 text-center text-xs font-medium text-muted-foreground bg-muted/50 border-b">
            {name}
          </div>
        ))}
        {cells.map((day, idx) => {
          const key = day ? `${year}-${month}-${day}` : null;
          const dayTasks = key ? tasksByDate.get(key) || [] : [];
          return (
            <div
              key={idx}
              className={`min-h-[100px] border-b border-r p-1.5 ${
                day === null ? "bg-muted/20" : ""
              } ${isToday(day || 0) ? "bg-primary/5" : ""}`}
            >
              {day !== null && (
                <>
                  <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                    isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}>
                    {day}
                  </span>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {dayTasks.slice(0, 3).map(task => (
                      <Button
                        key={task.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => onTaskClick(task)}
                        className="h-auto justify-start text-left text-xs truncate w-full rounded"
                        style={{ backgroundColor: getStatusColor(task.status, labels) + "22", color: getStatusColor(task.status, labels) }}
                        data-testid={`calendar-task-${task.id}`}
                      >
                        {task.title}
                      </Button>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-xs text-muted-foreground px-1.5">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface DashboardViewProps {
  board: Board;
  groups: Group[];
  tasks: Task[];
  statusLabels: CustomStatusLabel[];
}

export function DashboardView({ board, groups, tasks, statusLabels }: DashboardViewProps) {
  const labels = statusLabels.length > 0 ? statusLabels : defaultStatusLabels;

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    labels.forEach(l => counts.set(l.id, 0));
    tasks.forEach(t => counts.set(t.status, (counts.get(t.status) || 0) + 1));
    return counts;
  }, [tasks, labels]);

  const priorityCounts = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    tasks.forEach(t => {
      if (t.priority in counts) counts[t.priority as keyof typeof counts]++;
    });
    return counts;
  }, [tasks]);

  const groupStats = useMemo(() => {
    return groups.map(g => {
      const groupTasks = tasks.filter(t => t.groupId === g.id);
      const done = groupTasks.filter(t => t.status === "done").length;
      const total = groupTasks.length;
      return { group: g, total, done, progress: total > 0 ? Math.round((done / total) * 100) : 0 };
    });
  }, [groups, tasks]);

  const overdue = useMemo(() => {
    const now = new Date();
    return tasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "done");
  }, [tasks]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return tasks.filter(t => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= week && t.status !== "done");
  }, [tasks]);

  const totalDone = tasks.filter(t => t.status === "done").length;
  const overallProgress = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  const maxStatusCount = Math.max(...Array.from(statusCounts.values()), 1);

  return (
    <div className="flex-1 overflow-auto p-4" data-testid="dashboard-view">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Items</p>
          <p className="text-3xl font-bold mt-1" data-testid="stat-total-items">{tasks.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-3xl font-bold mt-1 text-green-600" data-testid="stat-completed">{totalDone}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Overdue</p>
          <p className="text-3xl font-bold mt-1 text-red-500" data-testid="stat-overdue">{overdue.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Progress</p>
          <p className="text-3xl font-bold mt-1" data-testid="stat-progress">{overallProgress}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Status Distribution</h3>
          <div className="space-y-3">
            {labels.map(label => {
              const count = statusCounts.get(label.id) || 0;
              const pct = maxStatusCount > 0 ? (count / maxStatusCount) * 100 : 0;
              return (
                <div key={label.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                  <span className="text-sm w-24 truncate">{label.label}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: label.color }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-4">Priority Breakdown</h3>
          <div className="space-y-3">
            {(["critical", "high", "medium", "low"] as const).map(p => {
              const count = priorityCounts[p];
              const pct = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
              return (
                <div key={p} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getPriorityColor(p) }} />
                  <span className="text-sm w-24 capitalize">{p}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: getPriorityColor(p) }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Group Progress</h3>
          <div className="space-y-3">
            {groupStats.map(({ group, total, done, progress }) => (
              <div key={group.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="text-sm font-medium">{group.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{done}/{total}</span>
                </div>
                <div className="bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: group.color }}
                  />
                </div>
              </div>
            ))}
            {groupStats.length === 0 && (
              <p className="text-sm text-muted-foreground">No groups yet</p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">
            Upcoming & Overdue
          </h3>
          <div className="space-y-2 max-h-[220px] overflow-auto">
            {overdue.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm p-1.5 rounded bg-red-500/10" data-testid={`overdue-task-${task.id}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="truncate flex-1" data-testid={`text-overdue-title-${task.id}`}>{task.title}</span>
                <span className="text-xs text-red-500 shrink-0">
                  {task.dueDate && new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
            {upcoming.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm p-1.5 rounded bg-yellow-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                <span className="truncate flex-1">{task.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {task.dueDate && new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
            {overdue.length === 0 && upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
