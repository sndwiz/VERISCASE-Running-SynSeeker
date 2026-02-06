import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { BoardHeader, type GroupByOption } from "@/components/board/board-header";
import { TaskGroup } from "@/components/board/task-group";
import { AutomationsPanel } from "@/components/board/automations-panel";
import { BulkActionsBar } from "@/components/board/bulk-actions-bar";
import { WorkflowRecorder, useWorkflowRecorder } from "@/components/board/workflow-recorder";
import { ColumnCenter } from "@/components/board/column-center";
import { CreateGroupDialog } from "@/components/dialogs/create-group-dialog";
import { CreateTaskDialog } from "@/components/dialogs/create-task-dialog";
import { TaskDetailModal } from "@/components/dialogs/task-detail-modal";
import { EditStatusLabelsDialog } from "@/components/dialogs/edit-status-labels-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Board, Group, Task, ColumnType, CustomStatusLabel } from "@shared/schema";
import { defaultStatusLabels } from "@shared/schema";

export default function BoardPage() {
  const [, params] = useRoute("/boards/:id");
  const boardId = params?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { recordAction } = useWorkflowRecorder();

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

  const { data: board, isLoading: boardLoading } = useQuery<Board>({
    queryKey: ["/api/boards", boardId],
    enabled: !!boardId,
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<Group[]>({
    queryKey: ["/api/boards", boardId, "groups"],
    enabled: !!boardId,
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/boards", boardId, "tasks"],
    enabled: !!boardId,
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: { title: string; color: string }) =>
      apiRequest("POST", `/api/boards/${boardId}/groups`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "groups"] });
      toast({ title: "Group created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; groupId: string; priority: string }) =>
      apiRequest("POST", `/api/boards/${boardId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "tasks"] });
      toast({ title: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => apiRequest("DELETE", `/api/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: Partial<Group> }) =>
      apiRequest("PATCH", `/api/groups/${groupId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "groups"] });
    },
    onError: () => {
      toast({ title: "Failed to update group", variant: "destructive" });
    },
  });

  const updateBoardMutation = useMutation({
    mutationFn: (updates: Partial<Board>) =>
      apiRequest("PATCH", `/api/boards/${boardId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId] });
    },
    onError: () => {
      toast({ title: "Failed to update board", variant: "destructive" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (groupId: string) => apiRequest("DELETE", `/api/groups/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "tasks"] });
      toast({ title: "Group deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete group", variant: "destructive" });
    },
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

      <div className="flex-1 overflow-auto p-4">
        {sortedGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-muted-foreground mb-4">
              <p className="text-lg font-medium">No groups yet</p>
              <p className="text-sm">Create a group to start adding tasks</p>
            </div>
            <button
              onClick={() => setCreateGroupOpen(true)}
              className="text-primary hover:underline text-sm"
              data-testid="button-create-first-group"
            >
              Create your first group
            </button>
          </div>
        ) : (
          sortedGroups.map((group) => (
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
              onColumnSort={handleColumnSort}
              onColumnFilter={handleColumnFilter}
              onColumnDuplicate={handleColumnDuplicate}
              onColumnRename={handleColumnRename}
              onColumnDelete={handleRemoveColumn}
              onColumnHide={handleColumnHide}
              onColumnChangeType={handleColumnChangeType}
              onColumnUpdateDescription={handleColumnUpdateDescription}
              currentSort={currentSort}
              onOpenColumnCenter={() => setColumnCenterOpen(true)}
            />
          ))
        )}
      </div>

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
    </div>
  );
}
