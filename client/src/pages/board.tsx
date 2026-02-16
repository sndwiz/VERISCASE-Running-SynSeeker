import { useState, useMemo, useCallback } from "react";
import { useRoute } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoardHeader, type GroupByOption } from "@/components/board/board-header";
import { BoardTableHeader } from "@/components/board/board-table-header";
import { TaskGroup } from "@/components/board/task-group";
import { AutomationsPanel } from "@/components/board/automations-panel";
import { BulkActionsBar } from "@/components/board/bulk-actions-bar";
import { WorkflowRecorder, useWorkflowRecorder } from "@/components/board/workflow-recorder";
import { ColumnCenter } from "@/components/board/column-center";
import { BoardChatPanel } from "@/components/board-chat";
import { CreateGroupDialog } from "@/components/dialogs/create-group-dialog";
import { CreateTaskDialog } from "@/components/dialogs/create-task-dialog";
import { TaskDetailModal } from "@/components/dialogs/task-detail-modal";
import { EditStatusLabelsDialog } from "@/components/dialogs/edit-status-labels-dialog";
import { AIAutofillDialog } from "@/components/board/ai-autofill-dialog";
import { ViewTabs, KanbanView, CalendarView, DashboardView, type BoardViewType } from "@/components/board/board-views";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useBoardMutations } from "@/hooks/use-board-mutations";
import type { Board, Group, Task, ColumnType, CustomStatusLabel } from "@shared/schema";
import { defaultStatusLabels } from "@shared/schema";

export default function BoardPage() {
  const [, params] = useRoute("/boards/:id");
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
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [editStatusLabelsOpen, setEditStatusLabelsOpen] = useState(false);
  const [currentSort, setCurrentSort] = useState<{ columnId: string; direction: "asc" | "desc" } | null>(null);
  const [columnCenterOpen, setColumnCenterOpen] = useState(false);
  const [activeView, setActiveView] = useState<BoardViewType>("table");
  const [aiAutofillColumnId, setAiAutofillColumnId] = useState<string | null>(null);
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
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => a.order - b.order);
  }, [groups]);

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
    toast({ title: `Duplicating ${selectedTaskIds.size} tasks...` });
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

  const handleColumnFilter = (columnId: string) => {
    toast({ title: `Opening filter for column "${board?.columns.find(c => c.id === columnId)?.title}"` });
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
        onEditBoard={() => {}}
        onDeleteBoard={() => {}}
        onToggleColumn={handleToggleColumn}
        onAddColumn={handleAddColumn}
        onRemoveColumn={handleRemoveColumn}
        onReorderColumn={handleReorderColumn}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        taskCount={tasks.length}
        onOpenAutomations={() => setAutomationsPanelOpen(true)}
        onOpenColumnCenter={() => setColumnCenterOpen(true)}
      />

      <div className="flex items-center justify-between border-b px-2">
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
                  <BoardTableHeader
                    columns={board.columns}
                    onColumnSort={handleColumnSort}
                    onColumnFilter={handleColumnFilter}
                    onColumnDuplicate={handleColumnDuplicate}
                    onColumnRename={handleColumnRename}
                    onColumnDelete={handleRemoveColumn}
                    onColumnHide={handleColumnHide}
                    onColumnChangeType={handleColumnChangeType}
                    onColumnUpdateDescription={handleColumnUpdateDescription}
                    onColumnAIAutofill={(colId) => setAiAutofillColumnId(colId)}
                    currentSort={currentSort}
                    onOpenColumnCenter={() => setColumnCenterOpen(true)}
                    allSelected={selectedTaskIds.size > 0 && selectedTaskIds.size === tasks.length}
                    onSelectAll={(selected) => {
                      if (selected) {
                        setSelectedTaskIds(new Set(tasks.map(t => t.id)));
                      } else {
                        setSelectedTaskIds(new Set());
                      }
                    }}
                  />
                  <div className="p-2">
                    {sortedGroups.map((group) => (
                      <TaskGroup
                        key={group.id}
                        group={group}
                        tasks={sortedTasks.filter((t) => t.groupId === group.id)}
                        columns={board.columns.filter((c) => c.visible)}
                        statusLabels={statusLabels}
                        onToggleCollapse={() =>
                          updateGroupMutation.mutate({
                            groupId: group.id,
                            updates: { collapsed: !group.collapsed },
                          })
                        }
                        onAddTask={() => handleAddTask(group.id)}
                        onEditGroup={() => {}}
                        onDeleteGroup={() => deleteGroupMutation.mutate(group.id)}
                        onTaskClick={handleTaskClick}
                        onTaskUpdate={handleTaskUpdate}
                        onTaskDelete={(taskId) => deleteTaskMutation.mutate(taskId)}
                        onEditStatusLabels={() => setEditStatusLabelsOpen(true)}
                        selectedTaskIds={selectedTaskIds}
                        onSelectTask={handleSelectTask}
                        currentSort={currentSort}
                        onOpenColumnCenter={() => setColumnCenterOpen(true)}
                        canDeleteTasks={canDeleteTasks}
                        onInlineAddTask={handleInlineAddTask}
                      />
                    ))}
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
          onClose={() => setAutomationsPanelOpen(false)}
        />
      )}

      {boardId && <WorkflowRecorder boardId={boardId} />}

      {boardId && <BoardChatPanel boardId={boardId} boardName={board?.name} />}

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
    </div>
  );
}
