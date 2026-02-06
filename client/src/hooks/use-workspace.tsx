import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Workspace } from "@shared/schema";

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

const STORAGE_KEY = "vericase_active_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  const { data: workspaces = [], isLoading } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
  });

  const activeWorkspace = useMemo(() => {
    if (activeId) {
      return workspaces.find(w => w.id === activeId) || workspaces[0] || null;
    }
    return workspaces[0] || null;
  }, [workspaces, activeId]);

  const effectiveId = activeWorkspace?.id || null;

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveId(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
    queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
  }, [queryClient]);

  const value = useMemo(() => ({
    workspaces,
    activeWorkspace,
    activeWorkspaceId: effectiveId,
    setActiveWorkspaceId,
    isLoading,
  }), [workspaces, activeWorkspace, effectiveId, setActiveWorkspaceId, isLoading]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
