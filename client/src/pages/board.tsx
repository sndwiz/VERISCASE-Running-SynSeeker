import { useState, useMemo, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { BoardHeader, type GroupByOption } from "@/components/board/board-header";
import { TaskGroup } from "@/components/board/task-group";
import { AutomationsPanel, type AutomationPrefill } from "@/components/board/automations-panel";
import { BulkActionsBar } from "@/components/board/bulk-actions-bar";
import { WorkflowRecorder, useWorkflowRecorder } from "@/components/board/workflow-recorder";
import { ColumnCenter } from "@/components/board/column-center";
import { BoardChatPanel } from "@/components/board-chat";
import { CreateGroupDialog } from "@/components/dialogs/create-group-dialog";
import { CreateTaskDialog } from "@/components/dialogs/create-task-dialog";
import { TaskDetailModal } from "@/components/dialogs/task-detail-modal";
import { EditStatusLabelsDialog } from "@/components/dialogs/edit-status-labels-dialog";
import { InviteMemberDialog } from "@/components/dialogs/invite-member-dialog";
import { AIAutofillDialog } from "@/components/board/ai-autofill-dialog";
import { ViewTabs, KanbanView, CalendarView, DashboardView, GanttView, ChartView, CanvasView, DocView, FilesView, FormView, type BoardViewType } from "@/components/board/board-views";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useBoardMutations } from "@/hooks/use-board-mutations";
import type { Board, Group, Task, ColumnType, CustomStatusLabel } from "@shared/schema";
import { defaultStatusLabels } from "@shared/schema";

export default function BoardPage() {
  const [, params] = useRoute("/boards/:id");
  const [, setLocation] = useLocation();
  const boardId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const {
    createGroup: createGroupMutation,
    createTask: createTaskMutation,
    updateTask: updateTaskMutation,
    deleteTask: deleteTaskMutation,
    updateGroup: updateGroupMutation,
    updateBoard: updateBoardMutation,
    deleteGroup: deleteGroupMutation,
  } = useBoardMutations(boardId);
  const { recordAction } = useWorkflowRecorder();
  const canDeleteTasks = user?.role === "admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState<string | undefined>();
  const [groupBy, setGroupBy] = useState<GroupByOption>("default");
  const [automationsPanelOpen, setAutomationsPanelOpen] = useState(false);
  const [automationPrefill, setAutomationPrefill] = useState<AutomationPrefill | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [editStatusLabelsOpen, setEditStatusLabelsOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<{ columnId: string; direction: "asc" | "desc" } | null>(null);
  const [columnCenterOpen, setColumnCenterOpen] = useState(false);
  const [activeView, setActiveView] = useState<BoardViewType>("table");
  const [aiAutofillColumnId, setAiAutofillColumnId] = useState<string | null>(null);
  const [personFilter, setPersonFilter] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editBoardDialogOpen, setEditBoardDialogOpen] = useState(false);
  const [editBoardName, setEditBoardName] = useState("");
  const [editBoardDescription, setEditBoardDescription] = useState("");
  const [deleteBoardDialogOpen, setDeleteBoardDialogOpen] = useState(false);
  const [columnFilter, setColumnFilter] = useState<{ columnId: string; value: string } | null>(null);
  const [density, setDensity] = useState<"comfort" | "compact" | "ultra-compact">(() => {
    const saved = localStorage.getItem("board-density");
    return (saved as "comfort" | "compact" | "ultra-compact") || "comfort";
  });

  const handleDensityChange = useCallback((d: "comfort" | "compact" | "ultra-compact") => {
    setDensity(d);
    localStorage.setItem("board-density", d);
  }, []);


  const { data: board, isLoading: boardLoading } = useQuery<Board>({
    queryKey: ["/api/boards/detail", boardId],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch board");
      return res.json();
    },
    enabled: !!boardId,
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/boards/detail", boardId, "groups"],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/groups`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch groups");
      return res.json();
    },
    enabled: !!boardId,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/boards/detail", boardId, "tasks"],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/tasks`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!boardId,
  });


  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description?.toLowerCase().includes(query)
      );
    }
    if (personFilter) {
      filtered = filtered.filter(
        (task) => task.assignees?.some(a => a.name === personFilter)
      );
    }
    if (columnFilter) {
      const filterVal = columnFilter.value.toLowerCase();
      filtered = filtered.filter((task) => {
        const col = board?.columns.find(c => c.id === columnFilter.columnId);
        if (!col) return true;
        let cellValue = "";
        switch (col.type) {
          case "status": cellValue = task.status; break;
          case "priority": cellValue = task.priority; break;
          case "date": cellValue = task.dueDate || ""; break;
          case "person": cellValue = (task.assignees || []).map(a => a.name).join(", "); break;
          case "progress": cellValue = String(task.progress || 0); break;
          default: {
            const cf = task.customFields?.[columnFilter.columnId];
            if (cf == null) { cellValue = ""; break; }
            if (Array.isArray(cf)) { cellValue = cf.join(", "); break; }
            if (typeof cf === "object") { cellValue = Object.values(cf).join(" "); break; }
            cellValue = String(cf);
          }
        }
        return cellValue.toLowerCase().includes(filterVal);
      });
    }
    return filtered;
  }, [tasks, searchQuery, personFilter, columnFilter, board?.columns]);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => a.order - b.order);
  }, [groups]);

  const allCollapsed = useMemo(() => {
    return groups.length > 0 && groups.every(g => g.collapsed);
  }, [groups]);

  const handleCollapseAll = useCallback(() => {
    groups.forEach(g => {
      if (!g.collapsed) {
        updateGroupMutation.mutate({ groupId: g.id, updates: { collapsed: true } });
      }
    });
  }, [groups, updateGroupMutation]);

  const handleExpandAll = useCallback(() => {
    groups.forEach(g => {
      if (g.collapsed) {
        updateGroupMutation.mutate({ groupId: g.id, updates: { collapsed: false } });
      }
    });
  }, [groups, updateGroupMutation]);

  const handleAddTask = (groupId?: string) => {
    setDefaultGroupId(groupId);
    setCreateTaskOpen(true);
  };

  const handleInlineAddTask = useCallback((groupId: string, title: string) => {
    createTaskMutation.mutate({ title, groupId, priority: "medium" });
  }, [createTaskMutation]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === taskId);
    
    if (updates.status !== undefined && task) {
      recordAction({
        type: "status_change",
        taskId,
        taskTitle: task.title,
        field: "status",
        previousValue: task.status,
        newValue: updates.status,
      });
    }
    if (updates.priority !== undefined && task) {
      recordAction({
        type: "priority_change",
        taskId,
        taskTitle: task.title,
        field: "priority",
        previousValue: task.priority,
        newValue: updates.priority,
      });
    }
    if (updates.assignees !== undefined && task) {
      recordAction({
        type: "assignment",
        taskId,
        taskTitle: task.title,
        field: "assignees",
        previousValue: task.assignees,
        newValue: updates.assignees,
      });
    }
    
    updateTaskMutation.mutate({ taskId, updates });
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, ...updates });
    }
  };

  const handleSelectTask = (taskId: string, selected: boolean) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedTaskIds(new Set());
  };

  const handleBulkDuplicate = () => {
    const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
    selectedTasks.forEach(task => {
      createTaskMutation.mutate({
        title: `${task.title} (copy)`,
        groupId: task.groupId,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        startDate: task.startDate,
        assignees: task.assignees,
      });
    });
    toast({ title: `Duplicated ${selectedTaskIds.size} tasks` });
    handleClearSelection();
  };

  const handleBulkDelete = () => {
    selectedTaskIds.forEach(taskId => {
      deleteTaskMutation.mutate(taskId);
    });
    handleClearSelection();
  };

  const handleBulkArchive = () => {
    selectedTaskIds.forEach(taskId => {
      updateTaskMutation.mutate({ taskId, updates: { status: "done" as const } });
    });
    toast({ title: `Archived ${selectedTaskIds.size} tasks` });
    handleClearSelection();
  };

  const handleBulkExport = () => {
    const selectedTasks = tasks.filter(t => selectedTaskIds.has(t.id));
    const csv = [
      ["Title", "Status", "Priority", "Due Date"].join(","),
      ...selectedTasks.map(t => [t.title, t.status, t.priority, t.dueDate || ""].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `Exported ${selectedTaskIds.size} tasks` });
    handleClearSelection();
  };

  const handleBulkMoveTo = (groupId: string) => {
    selectedTaskIds.forEach(taskId => {
      updateTaskMutation.mutate({ taskId, updates: { groupId } });
    });
    toast({ title: `Moved ${selectedTaskIds.size} tasks` });
    handleClearSelection();
  };

  const handleToggleColumn = (columnId: string, visible: boolean) => {
    if (!board) return;
    const updatedColumns = board.columns.map((col) =>
      col.id === columnId ? { ...col, visible } : col
    );
    updateBoardMutation.mutate({ columns: updatedColumns });
  };

  const handleAddColumn = (column: Omit<import("@shared/schema").ColumnDef, "id" | "order">) => {
    if (!board) return;
    const newColumn = {
      ...column,
      id: `col-${Date.now()}`,
      order: board.columns.length,
    };
    updateBoardMutation.mutate({ columns: [...board.columns, newColumn] });
  };

  const handleRemoveColumn = (columnId: string) => {
    if (!board) return;
    const updatedColumns = board.columns
      .filter((col) => col.id !== columnId)
      .map((col, idx) => ({ ...col, order: idx }));
    updateBoardMutation.mutate({ columns: updatedColumns });
  };

  const handleReorderColumn = (columnId: string, direction: "up" | "down") => {
    if (!board) return;
    const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);
    const index = sortedColumns.findIndex((col) => col.id === columnId);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sortedColumns.length) return;
    
    const updatedColumns = [...sortedColumns];
    [updatedColumns[index], updatedColumns[newIndex]] = [updatedColumns[newIndex], updatedColumns[index]];
    
    const reorderedColumns = updatedColumns.map((col, idx) => ({ ...col, order: idx }));
    updateBoardMutation.mutate({ columns: reorderedColumns });
  };

  const handleColumnSort = (columnId: string, direction: "asc" | "desc") => {
    if (currentSort?.columnId === columnId && currentSort.direction === direction) {
      setCurrentSort(null);
    } else {
      setCurrentSort({ columnId, direction });
    }
  };

  const [columnFilterDialogOpen, setColumnFilterDialogOpen] = useState(false);
  const [columnFilterTarget, setColumnFilterTarget] = useState<string | null>(null);
  const [columnFilterInput, setColumnFilterInput] = useState("");

  const handleColumnFilter = (columnId: string) => {
    setColumnFilterTarget(columnId);
    setColumnFilterInput(columnFilter?.columnId === columnId ? columnFilter.value : "");
    setColumnFilterDialogOpen(true);
  };

  const handleColumnDuplicate = (columnId: string) => {
    if (!board) return;
    const column = board.columns.find(c => c.id === columnId);
    if (!column) return;
    const newColumn = {
      ...column,
      id: `col-${Date.now()}`,
      title: `${column.title} (copy)`,
      order: board.columns.length,
    };
    updateBoardMutation.mutate({ columns: [...board.columns, newColumn] });
    toast({ title: "Column duplicated" });
  };

  const handleColumnRename = (columnId: string, newTitle: string) => {
    if (!board) return;
    const updatedColumns = board.columns.map((col) =>
      col.id === columnId ? { ...col, title: newTitle } : col
    );
    updateBoardMutation.mutate({ columns: updatedColumns });
    toast({ title: "Column renamed" });
  };

  const handleColumnHide = (columnId: string) => {
    handleToggleColumn(columnId, false);
  };

  const handleColumnChangeType = (columnId: string, newType: ColumnType) => {
    if (!board) return;
    const updatedColumns = board.columns.map((col) =>
      col.id === columnId ? { ...col, type: newType } : col
    );
    updateBoardMutation.mutate({ columns: updatedColumns });
    toast({ title: "Column type changed" });
  };

  const handleColumnUpdateDescription = (columnId: string, description: string) => {
    if (!board) return;
    const updatedColumns = board.columns.map((col) =>
      col.id === columnId ? { ...col, description } : col
    );
    updateBoardMutation.mutate({ columns: updatedColumns });
    toast({ title: "Column description updated" });
  };

  const handleSaveStatusLabels = (labels: CustomStatusLabel[]) => {
    if (!board) return;
    updateBoardMutation.mutate({ statusLabels: labels });
    toast({ title: "Status labels updated" });
  };

  const statusLabels = board?.statusLabels || defaultStatusLabels;

  const sortedTasks = useMemo(() => {
    if (!currentSort) return filteredTasks;
    
    return [...filteredTasks].sort((a, b) => {
      const column = board?.columns.find(c => c.id === currentSort.columnId);
      if (!column) return 0;
      
      let aVal: any;
      let bVal: any;
      
      switch (column.type) {
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "priority":
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          aVal = priorityOrder[a.priority] || 0;
          bVal = priorityOrder[b.priority] || 0;
          break;
        case "date":
          aVal = a.dueDate || "";
          bVal = b.dueDate || "";
          break;
        case "progress":
          aVal = a.progress || 0;
          bVal = b.progress || 0;
          break;
        default:
          aVal = a.customFields?.[currentSort.columnId] || "";
          bVal = b.customFields?.[currentSort.columnId] || "";
      }
      
      if (typeof aVal === "string" && typeof bVal === "string") {
        return currentSort.direction === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      return currentSort.direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filteredTasks, currentSort, board]);

  const isLoading = boardLoading || groupsLoading || tasksLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Board not found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This board may have been deleted or you don't have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <BoardHeader
        board={board}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddTask={() => handleAddTask()}
        onAddGroup={() => setCreateGroupOpen(true)}
        onEditBoard={() => {
          setEditBoardName(board.name);
          setEditBoardDescription(board.description || "");
          setEditBoardDialogOpen(true);
        }}
        onDeleteBoard={() => setDeleteBoardDialogOpen(true)}
        onToggleColumn={handleToggleColumn}
        onAddColumn={handleAddColumn}
        onRemoveColumn={handleRemoveColumn}
        onReorderColumn={handleReorderColumn}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        taskCount={tasks.length}
        onOpenAutomations={() => { setAutomationPrefill(null); setAutomationsPanelOpen(true); }}
        onOpenColumnCenter={() => setColumnCenterOpen(true)}
        onInvite={() => setInviteDialogOpen(true)}
        onExport={() => {
          const csv = [
            ["Title", "Status", "Priority", "Due Date"].join(","),
            ...tasks.map(t => [t.title, t.status, t.priority, t.dueDate || ""].join(","))
          ].join("\n");
          const blob = new Blob([csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${board.name}-export.csv`;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: "Board exported as CSV" });
        }}
        onOpenIntegrations={() => toast({ title: "Integrations panel coming soon" })}
        onOpenSidekick={() => toast({ title: "Opening Sidekick..." })}
        tasks={tasks}
        personFilter={personFilter}
        onPersonFilterChange={setPersonFilter}
        onCollapseAll={handleCollapseAll}
        onExpandAll={handleExpandAll}
        allCollapsed={allCollapsed}
      />

      <div className="flex items-center justify-between border-b px-2 flex-wrap gap-2">
        <ViewTabs activeView={activeView} onViewChange={setActiveView} />
        {activeView === "table" && (
          <div className="flex items-center gap-0.5 py-1">
            {(["comfort", "compact", "ultra-compact"] as const).map(d => (
              <Button
                key={d}
                variant={density === d ? "secondary" : "ghost"}
                size="sm"
                className="text-[11px] h-7 px-2"
                onClick={() => handleDensityChange(d)}
                data-testid={`button-density-${d}`}
              >
                {d === "ultra-compact" ? "Ultra" : d.charAt(0).toUpperCase() + d.slice(1)}
              </Button>
            ))}
          </div>
        )}
      </div>

      {activeView === "table" && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {sortedGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center p-4">
                <div className="text-muted-foreground mb-4">
                  <p className="text-lg font-medium">No groups yet</p>
                  <p className="text-sm">Create a group to start adding tasks</p>
                </div>
                <Button
                  variant="ghost"
                  className="text-primary"
                  onClick={() => setCreateGroupOpen(true)}
                  data-testid="button-create-first-group"
                >
                  Create your first group
                </Button>
              </div>
            ) : (
              <div id="boardGridScroll" className={`overflow-x-auto ${density === "compact" ? "board-compact" : density === "ultra-compact" ? "board-ultra-compact" : "board-comfort"}`}>
                <div className="min-w-max">
                  <div className="px-0 py-1">
                    {sortedGroups.map((group) => {
                      const groupTasks = sortedTasks.filter((t) => t.groupId === group.id);
                      const groupAllSelected = groupTasks.length > 0 && groupTasks.every(t => selectedTaskIds.has(t.id));
                      return (
                        <TaskGroup
                          key={group.id}
                          group={group}
                          tasks={groupTasks}
                          columns={board.columns.filter((c) => c.visible)}
                          statusLabels={statusLabels}
                          onToggleCollapse={() =>
                            updateGroupMutation.mutate({
                              groupId: group.id,
                              updates: { collapsed: !group.collapsed },
                            })
                          }
                          onAddTask={() => handleAddTask(group.id)}
                          onEditGroup={() => {
                            setEditGroupId(group.id);
                            setEditGroupName(group.title);
                          }}
                          onDeleteGroup={() => deleteGroupMutation.mutate(group.id)}
                          onTaskClick={handleTaskClick}
                          onTaskUpdate={handleTaskUpdate}
                          onTaskDelete={(taskId) => deleteTaskMutation.mutate(taskId)}
                          onEditStatusLabels={() => setEditStatusLabelsOpen(true)}
                          selectedTaskIds={selectedTaskIds}
                          onSelectTask={handleSelectTask}
                          currentSort={currentSort}
                          onOpenColumnCenter={() => setColumnCenterOpen(true)}
                          onAddColumn={(type, title) => {
                            handleAddColumn({ title, type, width: 120, visible: true });
                          }}
                          canDeleteTasks={canDeleteTasks}
                          onInlineAddTask={handleInlineAddTask}
                          onColumnSort={handleColumnSort}
                          onColumnFilter={handleColumnFilter}
                          onColumnDuplicate={handleColumnDuplicate}
                          onColumnRename={handleColumnRename}
                          onColumnDelete={handleRemoveColumn}
                          onColumnHide={handleColumnHide}
                          onColumnChangeType={handleColumnChangeType}
                          onColumnUpdateDescription={handleColumnUpdateDescription}
                          onColumnAIAutofill={(colId) => setAiAutofillColumnId(colId)}
                          onColumnAutomate={(colId) => {
                            setAutomationPrefill({ triggerId: "column_changed", config: { triggerField: colId } });
                            setAutomationsPanelOpen(true);
                          }}
                          onAutomateGroup={(groupId) => {
                            setAutomationPrefill({ actionId: "move_to_group", config: { targetGroup: groupId } });
                            setAutomationsPanelOpen(true);
                          }}
                          onAutomateTask={() => {
                            setAutomationPrefill({ triggerId: "status_changed" });
                            setAutomationsPanelOpen(true);
                          }}
                          allSelected={groupAllSelected}
                          onSelectAll={(selected) => {
                            if (selected) {
                              const newIds = new Set(selectedTaskIds);
                              groupTasks.forEach(t => newIds.add(t.id));
                              setSelectedTaskIds(newIds);
                            } else {
                              const newIds = new Set(selectedTaskIds);
                              groupTasks.forEach(t => newIds.delete(t.id));
                              setSelectedTaskIds(newIds);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === "kanban" && (
        <KanbanView
          board={board}
          groups={groups}
          tasks={sortedTasks}
          statusLabels={statusLabels}
          onTaskClick={handleTaskClick}
          onTaskUpdate={handleTaskUpdate}
          onAddTask={handleAddTask}
        />
      )}

      {activeView === "calendar" && (
        <CalendarView
          tasks={sortedTasks}
          onTaskClick={handleTaskClick}
          statusLabels={statusLabels}
        />
      )}

      {activeView === "dashboard" && (
        <DashboardView
          board={board}
          groups={groups}
          tasks={tasks}
          statusLabels={statusLabels}
        />
      )}

      {activeView === "gantt" && <GanttView />}
      {activeView === "chart" && <ChartView />}
      {activeView === "canvas" && <CanvasView />}
      {activeView === "doc" && <DocView />}
      {activeView === "files" && <FilesView />}
      {activeView === "form" && <FormView />}

      <BulkActionsBar
        selectedCount={selectedTaskIds.size}
        onClearSelection={handleClearSelection}
        onDuplicate={handleBulkDuplicate}
        onDelete={handleBulkDelete}
        onArchive={handleBulkArchive}
        onExport={handleBulkExport}
        onMoveTo={handleBulkMoveTo}
        groups={groups}
      />

      <CreateGroupDialog
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onSubmit={(data) => createGroupMutation.mutate(data)}
      />

      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        onSubmit={(data) => createTaskMutation.mutate(data)}
        groups={groups}
        defaultGroupId={defaultGroupId}
        onCreateGroup={async (data) => {
          const res = await apiRequest("POST", `/api/boards/${boardId}/groups`, data);
          const newGroup = await res.json();
          queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId, "groups"] });
          toast({ title: "Group created successfully" });
          return newGroup;
        }}
      />

      <TaskDetailModal
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        columns={board.columns}
        onUpdate={handleTaskUpdate}
        onEditStatusLabels={() => setEditStatusLabelsOpen(true)}
        statusLabels={statusLabels}
        groups={groups}
        boardId={boardId}
      />

      <EditStatusLabelsDialog
        open={editStatusLabelsOpen}
        onOpenChange={setEditStatusLabelsOpen}
        statusLabels={statusLabels}
        onSave={handleSaveStatusLabels}
      />

      <ColumnCenter
        open={columnCenterOpen}
        onOpenChange={setColumnCenterOpen}
        onAddColumn={(type, title) => {
          handleAddColumn({
            title,
            type,
            width: 120,
            visible: true,
          });
        }}
      />

      {boardId && (
        <AutomationsPanel
          boardId={boardId}
          open={automationsPanelOpen}
          onClose={() => { setAutomationsPanelOpen(false); setAutomationPrefill(null); }}
          prefill={automationPrefill}
        />
      )}

      {boardId && <WorkflowRecorder boardId={boardId} />}

      {boardId && <BoardChatPanel boardId={boardId} boardName={board?.name} />}

      <InviteMemberDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        boardName={board?.name}
      />

      {board && aiAutofillColumnId && (() => {
        const col = board.columns.find((c) => c.id === aiAutofillColumnId);
        if (!col) return null;
        return (
          <AIAutofillDialog
            open={true}
            onOpenChange={(open) => { if (!open) setAiAutofillColumnId(null); }}
            board={board}
            targetColumn={col}
          />
        );
      })()}

      <Dialog open={!!editGroupId} onOpenChange={(open) => { if (!open) setEditGroupId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                placeholder="Enter group name..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editGroupId && editGroupName.trim()) {
                    updateGroupMutation.mutate({ groupId: editGroupId, updates: { title: editGroupName.trim() } });
                    setEditGroupId(null);
                  }
                }}
                data-testid="input-rename-group"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGroupId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editGroupId && editGroupName.trim()) {
                  updateGroupMutation.mutate({ groupId: editGroupId, updates: { title: editGroupName.trim() } });
                  setEditGroupId(null);
                }
              }}
              data-testid="button-save-group-name"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editBoardDialogOpen} onOpenChange={setEditBoardDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-name">Board Name</Label>
              <Input
                id="board-name"
                value={editBoardName}
                onChange={(e) => setEditBoardName(e.target.value)}
                placeholder="Enter board name..."
                autoFocus
                data-testid="input-edit-board-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="board-desc">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                id="board-desc"
                value={editBoardDescription}
                onChange={(e) => setEditBoardDescription(e.target.value)}
                placeholder="Board description..."
                className="min-h-[80px]"
                data-testid="input-edit-board-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBoardDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (editBoardName.trim()) {
                  updateBoardMutation.mutate({ name: editBoardName.trim(), description: editBoardDescription });
                  toast({ title: "Board updated" });
                  setEditBoardDialogOpen(false);
                }
              }}
              data-testid="button-save-board"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteBoardDialogOpen} onOpenChange={setDeleteBoardDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Board</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this board? This will remove all groups, tasks, and data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteBoardDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await apiRequest("DELETE", `/api/boards/${boardId}`);
                  queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
                  toast({ title: "Board deleted" });
                  setDeleteBoardDialogOpen(false);
                  setLocation("/");
                } catch {
                  toast({ title: "Failed to delete board", variant: "destructive" });
                }
              }}
              data-testid="button-confirm-delete-board"
            >
              Delete Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={columnFilterDialogOpen} onOpenChange={setColumnFilterDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter: {board?.columns.find(c => c.id === columnFilterTarget)?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="column-filter-value">Contains</Label>
              <Input
                id="column-filter-value"
                value={columnFilterInput}
                onChange={(e) => setColumnFilterInput(e.target.value)}
                placeholder="Type to filter..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && columnFilterTarget) {
                    if (columnFilterInput.trim()) {
                      setColumnFilter({ columnId: columnFilterTarget, value: columnFilterInput.trim() });
                    } else {
                      setColumnFilter(null);
                    }
                    setColumnFilterDialogOpen(false);
                  }
                }}
                data-testid="input-column-filter"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {columnFilter?.columnId === columnFilterTarget && (
              <Button
                variant="outline"
                onClick={() => {
                  setColumnFilter(null);
                  setColumnFilterInput("");
                  setColumnFilterDialogOpen(false);
                }}
                data-testid="button-clear-column-filter"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filter
              </Button>
            )}
            <Button
              onClick={() => {
                if (columnFilterTarget) {
                  if (columnFilterInput.trim()) {
                    setColumnFilter({ columnId: columnFilterTarget, value: columnFilterInput.trim() });
                  } else {
                    setColumnFilter(null);
                  }
                  setColumnFilterDialogOpen(false);
                }
              }}
              data-testid="button-apply-column-filter"
            >
              Apply Filter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {columnFilter && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-primary-foreground px-3 md:px-4 py-2 rounded-md shadow-lg flex items-center gap-2 text-xs md:text-sm max-w-[90vw]">
          <Filter className="h-4 w-4 shrink-0" />
          <span className="truncate">Filtering by "{board?.columns.find(c => c.id === columnFilter.columnId)?.title}" contains "{columnFilter.value}"</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setColumnFilter(null)}
            data-testid="button-dismiss-column-filter"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
