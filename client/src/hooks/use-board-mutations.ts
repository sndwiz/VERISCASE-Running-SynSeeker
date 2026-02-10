import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Board, Group, Task } from "@shared/schema";

export function useBoardMutations(boardId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createGroup = useMutation({
    mutationFn: (data: { title: string; color: string }) =>
      apiRequest("POST", `/api/boards/${boardId}/groups`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId, "groups"] });
      toast({ title: "Group created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create group", variant: "destructive" });
    },
  });

  const createTask = useMutation({
    mutationFn: (data: { title: string; description?: string; groupId: string; priority: string }) =>
      apiRequest("POST", `/api/boards/${boardId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId, "tasks"] });
      toast({ title: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) =>
      apiRequest("PATCH", `/api/tasks/${taskId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId] });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteTask = useMutation({
    mutationFn: (taskId: string) => apiRequest("DELETE", `/api/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId, "tasks"] });
      toast({ title: "Task deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  const updateGroup = useMutation({
    mutationFn: ({ groupId, updates }: { groupId: string; updates: Partial<Group> }) =>
      apiRequest("PATCH", `/api/groups/${groupId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId, "groups"] });
    },
    onError: () => {
      toast({ title: "Failed to update group", variant: "destructive" });
    },
  });

  const updateBoard = useMutation({
    mutationFn: (updates: Partial<Board>) =>
      apiRequest("PATCH", `/api/boards/${boardId}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
    },
    onError: () => {
      toast({ title: "Failed to update board", variant: "destructive" });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: (groupId: string) => apiRequest("DELETE", `/api/groups/${groupId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId, "groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards/detail", boardId, "tasks"] });
      toast({ title: "Group deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete group", variant: "destructive" });
    },
  });

  return {
    createGroup,
    createTask,
    updateTask,
    deleteTask,
    updateGroup,
    updateBoard,
    deleteGroup,
  };
}
