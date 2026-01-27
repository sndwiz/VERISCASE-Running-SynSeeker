import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { BoardHeader, type GroupByOption } from "@/components/board/board-header";
import { TaskGroup } from "@/components/board/task-group";
import { CreateGroupDialog } from "@/components/dialogs/create-group-dialog";
import { CreateTaskDialog } from "@/components/dialogs/create-task-dialog";
import { TaskDetailDialog } from "@/components/dialogs/task-detail-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Board, Group, Task } from "@shared/schema";

export default function BoardPage() {
  const [, params] = useRoute("/boards/:id");
  const boardId = params?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultGroupId, setDefaultGroupId] = useState<string | undefined>();
  const [groupBy, setGroupBy] = useState<GroupByOption>("default");

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
    updateTaskMutation.mutate({ taskId, updates });
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, ...updates });
    }
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
              tasks={filteredTasks.filter((t) => t.groupId === group.id)}
              columns={board.columns.filter((c) => c.visible)}
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
            />
          ))
        )}
      </div>

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

      <TaskDetailDialog
        open={!!selectedTask}
        onOpenChange={(open) => !open && setSelectedTask(null)}
        task={selectedTask}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
}
