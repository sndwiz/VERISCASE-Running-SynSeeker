import { Link, useLocation } from "wouter";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  LayoutGrid,
  Briefcase,
  Users,
  FileText,
  Clock,
  Calendar,
  Gavel,
  Settings,
  Plus,
  Scale,
  Bot,
  Shield,
  Network,
  Zap,
  ChevronDown,
  ChevronRight,
  Home,
  Building2,
  ChevronsUpDown,
  FilePlus2,
  FolderOpen,
  User,
  Mic,
  ShieldCheck,
  Server,
  Sparkles,
  DollarSign,
  Receipt,
  ClipboardList,
  MessageSquare,
  Wand2,
  ClipboardCheck,
  LayoutDashboard,
  Library,
  CircleDot,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Board, Client, Matter, Workspace } from "@shared/schema";
import { FEATURE_METADATA } from "@/lib/feature-metadata";

interface AppSidebarProps {
  onCreateBoard: () => void;
}

function getTooltipForRoute(route: string): string {
  const feature = FEATURE_METADATA.find((f) => f.route === route);
  return feature?.tooltip || "";
}

function getTooltipForTitle(title: string): string {
  const feature = FEATURE_METADATA.find(
    (f) => f.title === title || f.title.toLowerCase() === title.toLowerCase()
  );
  return feature?.tooltip || "";
}

const navigationItems = [
  { title: "Client Dashboard", url: "/client-dashboard", icon: LayoutDashboard },
  { title: "Matters", url: "/matters", icon: Briefcase },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Billing", url: "/billing", icon: DollarSign },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Upload Organizer", url: "/upload-organizer", icon: FolderOpen },
  { title: "Document Builder", url: "/document-maker", icon: FilePlus2 },
  { title: "Legal AI", url: "/legal-ai", icon: Wand2 },
  { title: "Time Tracking", url: "/time-tracking", icon: Clock },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Communications", url: "/communications", icon: MessageSquare },
  { title: "Master Chat", url: "/master-chat", icon: MessageSquare },
  { title: "Approvals", url: "/approvals", icon: Gavel },
  { title: "Meeting Notes", url: "/meetings", icon: Mic },
  { title: "Intake Forms", url: "/intake-forms", icon: ClipboardList },
  { title: "Document Wash", url: "/document-wash", icon: ShieldCheck },
  { title: "Billing Verifier", url: "/billing-verifier", icon: ClipboardCheck },
  { title: "Template Library", url: "/templates", icon: Library },
  { title: "Process Recorder", url: "/process-recorder", icon: CircleDot },
];

const aiInvestigationItems = [
  { title: "AI Assistant", url: "/ai-chat", icon: Bot },
  { title: "Evidence Vault", url: "/evidence", icon: Shield },
  { title: "Detective Board", url: "/detective", icon: Network },
  { title: "Automations", url: "/automations", icon: Zap },
];

export function AppSidebar({ onCreateBoard }: AppSidebarProps) {
  const [location] = useLocation();
  const [casesOpen, setCasesOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [practiceOpen, setPracticeOpen] = useState(true);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    try { return localStorage.getItem("vericase_active_workspace"); } catch { return null; }
  });
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const { data: workspaceList = [] } = useQuery<Workspace[]>({
    queryKey: ["/api/workspaces"],
  });

  const currentWorkspace = useMemo(() => {
    if (activeWorkspaceId) {
      return workspaceList.find(w => w.id === activeWorkspaceId) || workspaceList[0];
    }
    return workspaceList[0];
  }, [workspaceList, activeWorkspaceId]);

  const selectWorkspace = useCallback((id: string) => {
    setActiveWorkspaceId(id);
    try { localStorage.setItem("vericase_active_workspace", id); } catch {}
    queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
  }, []);

  const createWorkspaceMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("POST", "/api/workspaces", { name });
      return res.json();
    },
    onSuccess: (newWs: Workspace) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      selectWorkspace(newWs.id);
      setIsCreatingWorkspace(false);
      setNewWorkspaceName("");
    },
  });

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const toggleClient = (clientId: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  };

  const { generalBoards, clientMap } = useMemo(() => {
    const general: Board[] = [];
    const clientBoardMap = new Map<string, { client: Client; matters: Map<string, { matter: Matter; boards: Board[] }> }>();

    clients.forEach(c => {
      clientBoardMap.set(c.id, {
        client: c,
        matters: new Map(),
      });
    });

    matters.forEach(m => {
      const entry = clientBoardMap.get(m.clientId);
      if (entry) {
        entry.matters.set(m.id, { matter: m, boards: [] });
      }
    });

    boards.forEach(b => {
      if (b.clientId && b.matterId) {
        const clientEntry = clientBoardMap.get(b.clientId);
        if (clientEntry) {
          const matterEntry = clientEntry.matters.get(b.matterId);
          if (matterEntry) {
            matterEntry.boards.push(b);
            return;
          }
        }
      }
      general.push(b);
    });

    return { generalBoards: general, clientMap: clientBoardMap };
  }, [boards, clients, matters]);

  const clientsWithMatters = useMemo(() => {
    return Array.from(clientMap.values()).filter(entry => entry.matters.size > 0);
  }, [clientMap]);

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer mb-3" data-testid="link-home">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Scale className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">VERICASE</span>
              <span className="text-xs text-muted-foreground">Legal Practice OS</span>
            </div>
          </div>
        </Link>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-2"
              data-testid="button-workspace-selector"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{currentWorkspace?.name || "Workspace"}</span>
              </div>
              <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {workspaceList.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => selectWorkspace(ws.id)}
                data-testid={`menu-workspace-${ws.id}`}
              >
                <Building2 className="h-4 w-4 mr-2" style={{ color: ws.color }} />
                {ws.name}
                {ws.id === currentWorkspace?.id && (
                  <span className="ml-auto text-xs text-primary">Active</span>
                )}
              </DropdownMenuItem>
            ))}
            {isCreatingWorkspace ? (
              <div className="p-2 flex items-center gap-1">
                <Input
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name"
                  className="h-7 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newWorkspaceName.trim()) {
                      createWorkspaceMutation.mutate(newWorkspaceName.trim());
                    }
                    if (e.key === "Escape") {
                      setIsCreatingWorkspace(false);
                      setNewWorkspaceName("");
                    }
                  }}
                  data-testid="input-new-workspace-name"
                />
              </div>
            ) : (
              <DropdownMenuItem
                onClick={(e) => { e.preventDefault(); setIsCreatingWorkspace(true); }}
                data-testid="button-create-workspace"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Workspace
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton asChild isActive={location === "/"} tooltip={getTooltipForRoute("/")}>
                    <Link href="/" data-testid="link-dashboard">
                      <Home className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[220px]">
                  {getTooltipForRoute("/")}
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton asChild isActive={location === "/vibe-code"} tooltip={getTooltipForRoute("/vibe-code")}>
                    <Link href="/vibe-code" data-testid="link-vibe-code">
                      <Sparkles className="h-4 w-4" />
                      <span>Vibe Code</span>
                    </Link>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[220px]">
                  {getTooltipForRoute("/vibe-code")}
                </TooltipContent>
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-1">
            <button
              type="button"
              className="flex items-center gap-1 hover:opacity-80"
              onClick={() => setCasesOpen(!casesOpen)}
              data-testid="toggle-cases-section"
            >
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${casesOpen ? "" : "-rotate-90"}`} />
              <span>Case Boards</span>
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); onCreateBoard(); }}
                  data-testid="button-create-board"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Create a new case board</TooltipContent>
            </Tooltip>
          </SidebarGroupLabel>
          {casesOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {generalBoards.map((board) => (
                  <SidebarMenuItem key={board.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={location === `/boards/${board.id}`}
                          tooltip={board.description || `Open ${board.name} board`}
                        >
                          <Link href={`/boards/${board.id}`} data-testid={`link-board-${board.id}`}>
                            <LayoutGrid
                              className="h-4 w-4"
                              style={{ color: board.color }}
                            />
                            <span>{board.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px]">
                        {board.description || `Open ${board.name} board`}
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ))}

                {clientsWithMatters.map(({ client, matters: matterMap }) => (
                  <Collapsible
                    key={client.id}
                    open={expandedClients.has(client.id)}
                    onOpenChange={() => toggleClient(client.id)}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              data-testid={`toggle-client-${client.id}`}
                              className="w-full"
                            >
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate font-medium">{client.name}</span>
                              <ChevronRight className={`ml-auto h-3 w-3 text-muted-foreground transition-transform duration-200 ${expandedClients.has(client.id) ? "rotate-90" : ""}`} />
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[220px]">
                            {`View matters and billing for ${client.name}`}
                          </TooltipContent>
                        </Tooltip>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === `/clients/${client.id}/billing`}
                            >
                              <Link href={`/clients/${client.id}/billing`} data-testid={`link-client-billing-${client.id}`}>
                                <Receipt className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate text-xs">Billing</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          {Array.from(matterMap.values()).map(({ matter, boards: matterBoards }) => {
                            const board = matterBoards[0];
                            if (board) {
                              return (
                                <SidebarMenuSubItem key={board.id}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={location === `/boards/${board.id}`}
                                  >
                                    <Link href={`/boards/${board.id}`} data-testid={`link-board-${board.id}`}>
                                      <Briefcase
                                        className="h-3 w-3"
                                        style={{ color: board.color }}
                                      />
                                      <span className="truncate text-xs">{matter.name}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            }
                            return (
                              <SidebarMenuSubItem key={matter.id}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={false}
                                >
                                  <Link href={`/matters`} data-testid={`link-matter-${matter.id}`}>
                                    <FolderOpen className="h-3 w-3 text-muted-foreground" />
                                    <span className="truncate text-xs text-muted-foreground">{matter.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ))}

                {boards.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    No boards yet. Create one to get started.
                  </div>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <button
              type="button"
              className="flex items-center gap-1 hover:opacity-80"
              onClick={() => setAiOpen(!aiOpen)}
              data-testid="toggle-ai-section"
            >
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${aiOpen ? "" : "-rotate-90"}`} />
              <span>AI & Investigation</span>
            </button>
          </SidebarGroupLabel>
          {aiOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {aiInvestigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.url}
                          tooltip={getTooltipForTitle(item.title)}
                        >
                          <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px]">
                        {getTooltipForTitle(item.title)}
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>
            <button
              type="button"
              className="flex items-center gap-1 hover:opacity-80"
              onClick={() => setPracticeOpen(!practiceOpen)}
              data-testid="toggle-practice-section"
            >
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${practiceOpen ? "" : "-rotate-90"}`} />
              <span>Legal Practice</span>
            </button>
          </SidebarGroupLabel>
          {practiceOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.url || location.startsWith(item.url + "/")}
                          tooltip={getTooltipForTitle(item.title)}
                        >
                          <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[220px]">
                        {getTooltipForTitle(item.title)}
                      </TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SynSeekrStatusIndicator />
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton asChild isActive={location === "/security"} tooltip={getTooltipForTitle("Security")}>
                  <Link href="/security" data-testid="link-security">
                    <Shield className="h-4 w-4" />
                    <span>Security</span>
                  </Link>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px]">
                {getTooltipForTitle("Security")}
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarMenuButton asChild isActive={location === "/settings"} tooltip={getTooltipForTitle("Settings")}>
                  <Link href="/settings" data-testid="link-settings">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[220px]">
                {getTooltipForTitle("Settings")}
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function SynSeekrStatusIndicator() {
  const { data: statusData } = useQuery<{ configured: boolean; enabled: boolean; status: string; lastChecked: string; latencyMs: number }>({
    queryKey: ["/api/synseekr/status"],
    refetchInterval: 30000,
  });

  if (!statusData?.configured) return null;

  const isOnline = statusData.status === "online";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="SynSeekr Server">
          <Link href="/settings" data-testid="link-synseekr-status">
            <Server className="h-4 w-4" />
            <span className="flex items-center gap-2">
              SynSeekr
              <span
                className={`inline-block h-2 w-2 rounded-full shrink-0 ${isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                data-testid="indicator-synseekr-dot"
              />
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
