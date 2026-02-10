import { Link, useLocation } from "wouter";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useWorkspace } from "@/hooks/use-workspace";
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
  SidebarFooter,
} from "@/components/ui/sidebar";
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
  Mic,
  ShieldCheck,
  Server,
  DollarSign,
  ClipboardList,
  MessageSquare,
  Wand2,
  ClipboardCheck,
  LayoutDashboard,
  Library,
  CircleDot,
  ListTodo,
  UserCheck,
  BookOpen,
  Search,
  Brain,
  FileVideo,
  FileSearch,
  Mail,
  Pin,
  History,
  BarChart3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Board, Workspace } from "@shared/schema";
import { FEATURE_METADATA } from "@/lib/feature-metadata";

interface ClientRecord {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
}

interface MatterRecord {
  id: string;
  clientId: string;
  name: string;
  caseNumber?: string | null;
  status?: string | null;
  matterType: string;
}

function usePinnedBoards() {
  const [pinned, setPinned] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("vericase-pinned-boards") || "[]");
    } catch { return []; }
  });
  const toggle = useCallback((boardId: string) => {
    setPinned(prev => {
      const next = prev.includes(boardId) ? prev.filter(id => id !== boardId) : [...prev, boardId];
      localStorage.setItem("vericase-pinned-boards", JSON.stringify(next));
      return next;
    });
  }, []);
  return { pinned, toggle };
}

function useRecentBoards() {
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("vericase-recent-boards") || "[]");
    } catch { return []; }
  });
  const track = useCallback((boardId: string) => {
    setRecents(prev => {
      const next = [boardId, ...prev.filter(id => id !== boardId)].slice(0, 5);
      localStorage.setItem("vericase-recent-boards", JSON.stringify(next));
      return next;
    });
  }, []);
  return { recents, track };
}

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

const caseManagementItems = [
  { title: "My Tasks", url: "/my-tasks", icon: ListTodo },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Matters", url: "/matters", icon: Briefcase },
  { title: "Client Dashboard", url: "/client-dashboard", icon: LayoutDashboard },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Approvals", url: "/approvals", icon: Gavel },
];

const documentsItems = [
  { title: "Filing Cabinet", url: "/documents", icon: FileText },
  { title: "Upload Organizer", url: "/upload-organizer", icon: FolderOpen },
  { title: "Document Builder", url: "/document-maker", icon: FilePlus2 },
  { title: "PDF Pro", url: "/pdf-pro", icon: FileText },
  { title: "Document Wash", url: "/document-wash", icon: ShieldCheck },
  { title: "Templates", url: "/templates", icon: Library },
];

const billingItems = [
  { title: "Time Tracking", url: "/time-tracking", icon: Clock },
  { title: "Billing", url: "/billing", icon: DollarSign },
  { title: "Billing Verifier", url: "/billing-verifier", icon: ClipboardCheck },
];

const communicationItems = [
  { title: "Communications", url: "/communications", icon: MessageSquare },
  { title: "Master Chat", url: "/master-chat", icon: MessageSquare },
  { title: "Meeting Notes", url: "/meetings", icon: Mic },
  { title: "Legal AI", url: "/legal-ai", icon: Wand2 },
  { title: "Legal Research", url: "/legal-research", icon: Search },
];

const adminItems = [
  { title: "Team Members", url: "/team-members", icon: UserCheck },
  { title: "Intake Forms", url: "/intake-forms", icon: ClipboardList },
  { title: "Process Recorder", url: "/process-recorder", icon: CircleDot },
  { title: "Model Advisor", url: "/model-advisor", icon: Brain },
  { title: "Product Guide", url: "/product-guide", icon: BookOpen },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const aiInvestigationItems = [
  { title: "Evidence Vault", url: "/evidence", icon: Shield },
  { title: "Detective Board", url: "/detective", icon: Network },
  { title: "Automations", url: "/automations", icon: Zap },
  { title: "E-Filing Brain", url: "/efiling", icon: Scale },
  { title: "Video Pipeline", url: "/video-pipeline", icon: FileVideo },
  { title: "PDF Forensics", url: "/pdf-forensics", icon: FileSearch },
  { title: "Email Intel", url: "/email-intel", icon: Mail },
];

function NavSection({ label, items, isOpen, toggle, location, testId }: {
  label: string;
  items: { title: string; url: string; icon: any }[];
  isOpen: boolean;
  toggle: () => void;
  location: string;
  testId: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <button type="button" className="flex items-center gap-1 hover:opacity-80" onClick={toggle} data-testid={`toggle-${testId}-section`}>
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
          <span>{label}</span>
        </button>
      </SidebarGroupLabel>
      {isOpen && (
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={location === item.url || location.startsWith(item.url + "/")} tooltip={getTooltipForTitle(item.title)}>
                  <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}

function BoardTreeSection({ boards, location, onCreateBoard, pinned, togglePin, recents, trackRecent }: {
  boards: Board[];
  location: string;
  onCreateBoard: () => void;
  pinned: string[];
  togglePin: (id: string) => void;
  recents: string[];
  trackRecent: (id: string) => void;
}) {
  const [casesOpen, setCasesOpen] = useState(true);
  const [boardSearch, setBoardSearch] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedMatters, setExpandedMatters] = useState<Set<string>>(new Set());
  const [showRecents, setShowRecents] = useState(false);

  const { data: clients = [] } = useQuery<ClientRecord[]>({ queryKey: ["/api/clients"] });
  const { data: matters = [] } = useQuery<MatterRecord[]>({ queryKey: ["/api/matters"] });

  const toggleClient = useCallback((id: string) => {
    setExpandedClients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleMatter = useCallback((id: string) => {
    setExpandedMatters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const tree = useMemo(() => {
    const clientMap = new Map<string, ClientRecord>();
    clients.forEach(c => clientMap.set(c.id, c));

    const matterMap = new Map<string, MatterRecord>();
    matters.forEach(m => matterMap.set(m.id, m));

    const mattersByClient = new Map<string, MatterRecord[]>();
    matters.forEach(m => {
      if (!mattersByClient.has(m.clientId)) mattersByClient.set(m.clientId, []);
      mattersByClient.get(m.clientId)!.push(m);
    });

    const boardsByMatter = new Map<string, Board[]>();
    const boardsByClientOnly = new Map<string, Board[]>();
    const unlinked: Board[] = [];

    boards.forEach(b => {
      if (b.matterId && matterMap.has(b.matterId)) {
        if (!boardsByMatter.has(b.matterId)) boardsByMatter.set(b.matterId, []);
        boardsByMatter.get(b.matterId)!.push(b);
      } else if (b.clientId && clientMap.has(b.clientId)) {
        if (!boardsByClientOnly.has(b.clientId)) boardsByClientOnly.set(b.clientId, []);
        boardsByClientOnly.get(b.clientId)!.push(b);
      } else {
        unlinked.push(b);
      }
    });

    const activeClientIds = new Set<string>();
    boardsByMatter.forEach((_, matterId) => {
      const m = matterMap.get(matterId);
      if (m) activeClientIds.add(m.clientId);
    });
    boardsByClientOnly.forEach((_, clientId) => activeClientIds.add(clientId));

    return { clientMap, matterMap, mattersByClient, boardsByMatter, boardsByClientOnly, unlinked, activeClientIds };
  }, [boards, clients, matters]);

  const searchLower = boardSearch.toLowerCase().trim();
  const filteredBoards = searchLower
    ? boards.filter(b => b.name.toLowerCase().includes(searchLower))
    : null;

  const pinnedBoards = boards.filter(b => pinned.includes(b.id));
  const recentBoards = recents.map(id => boards.find(b => b.id === id)).filter(Boolean) as Board[];

  const renderBoardItem = (board: Board, indent: number = 0) => (
    <SidebarMenuItem key={board.id}>
      <div className="flex items-center group" style={{ paddingLeft: `${indent * 12}px` }}>
        <SidebarMenuButton
          asChild
          isActive={location === `/boards/${board.id}`}
          tooltip={board.description || board.name}
          className="flex-1"
        >
          <Link
            href={`/boards/${board.id}`}
            data-testid={`link-board-${board.id}`}
            onClick={() => trackRecent(board.id)}
          >
            <LayoutGrid className="h-3.5 w-3.5" style={{ color: board.color }} />
            <span className="truncate text-xs">{board.name}</span>
          </Link>
        </SidebarMenuButton>
        <button
          type="button"
          className={`h-5 w-5 flex items-center justify-center shrink-0 ${pinned.includes(board.id) ? "text-primary" : "invisible group-hover:visible text-muted-foreground hover:text-foreground"}`}
          onClick={(e) => { e.stopPropagation(); togglePin(board.id); }}
          data-testid={`button-pin-board-${board.id}`}
        >
          <Pin className="h-3 w-3" />
        </button>
      </div>
    </SidebarMenuItem>
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between gap-1 pr-1">
        <button
          type="button"
          className="flex items-center gap-1 hover:opacity-80"
          onClick={() => setCasesOpen(!casesOpen)}
          data-testid="toggle-cases-section"
        >
          <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${casesOpen ? "" : "-rotate-90"}`} />
          <span>Case Boards</span>
        </button>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={(e) => { e.stopPropagation(); setShowRecents(!showRecents); }}
                data-testid="button-toggle-recents"
              >
                <History className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Recent boards</TooltipContent>
          </Tooltip>
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
        </div>
      </SidebarGroupLabel>
      {casesOpen && (
        <SidebarGroupContent>
          <div className="px-2 pb-1.5">
            <Input
              value={boardSearch}
              onChange={(e) => setBoardSearch(e.target.value)}
              placeholder="Search boards..."
              className="h-7 text-xs"
              data-testid="input-board-search"
            />
          </div>

          <SidebarMenu>
            {filteredBoards ? (
              filteredBoards.length > 0 ? (
                filteredBoards.map(b => renderBoardItem(b, 0))
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">No boards match "{boardSearch}"</div>
              )
            ) : (
              <>
                {pinnedBoards.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Pin className="h-2.5 w-2.5" />
                      Pinned
                    </div>
                    {pinnedBoards.map(b => renderBoardItem(b, 0))}
                  </>
                )}

                {showRecents && recentBoards.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <History className="h-2.5 w-2.5" />
                      Recent
                    </div>
                    {recentBoards.map(b => renderBoardItem(b, 0))}
                  </>
                )}

                {Array.from(tree.activeClientIds).map(clientId => {
                  const client = tree.clientMap.get(clientId);
                  if (!client) return null;
                  const clientMatters = tree.mattersByClient.get(clientId)?.filter(m =>
                    tree.boardsByMatter.has(m.id)
                  ) || [];
                  const directBoards = tree.boardsByClientOnly.get(clientId) || [];
                  if (clientMatters.length === 0 && directBoards.length === 0) return null;

                  const isClientOpen = expandedClients.has(clientId);
                  return (
                    <div key={clientId}>
                      <SidebarMenuItem>
                        <button
                          type="button"
                          className="flex items-center gap-1.5 w-full px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                          onClick={() => toggleClient(clientId)}
                          data-testid={`toggle-client-${clientId}`}
                        >
                          {isClientOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          <Users className="h-3 w-3" />
                          <span className="truncate">{client.name}</span>
                          <span className="ml-auto text-[10px] text-muted-foreground/60">
                            {(clientMatters.reduce((sum, m) => sum + (tree.boardsByMatter.get(m.id)?.length || 0), 0)) + directBoards.length}
                          </span>
                        </button>
                      </SidebarMenuItem>
                      {isClientOpen && (
                        <>
                          {clientMatters.map(matter => {
                            const isMatterOpen = expandedMatters.has(matter.id);
                            const matterBoards = tree.boardsByMatter.get(matter.id) || [];
                            return (
                              <div key={matter.id}>
                                <SidebarMenuItem>
                                  <button
                                    type="button"
                                    className="flex items-center gap-1.5 w-full py-1 text-xs text-muted-foreground hover:text-foreground"
                                    style={{ paddingLeft: "20px" }}
                                    onClick={() => toggleMatter(matter.id)}
                                    data-testid={`toggle-matter-${matter.id}`}
                                  >
                                    {isMatterOpen ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
                                    <Briefcase className="h-3 w-3" />
                                    <span className="truncate">{matter.name}</span>
                                    <span className="ml-auto text-[10px] text-muted-foreground/60">{matterBoards.length}</span>
                                  </button>
                                </SidebarMenuItem>
                                {isMatterOpen && matterBoards.map(b => renderBoardItem(b, 3))}
                              </div>
                            );
                          })}
                          {directBoards.map(b => renderBoardItem(b, 1))}
                        </>
                      )}
                    </div>
                  );
                })}

                {tree.unlinked.length > 0 && (
                  <>
                    <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      General Boards
                    </div>
                    {tree.unlinked.map(b => renderBoardItem(b, 0))}
                  </>
                )}

                {boards.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    No boards yet. Create one to get started.
                  </div>
                )}
              </>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}

export function AppSidebar({ onCreateBoard }: AppSidebarProps) {
  const [location] = useLocation();
  const [aiOpen, setAiOpen] = useState(true);
  const [caseManageOpen, setCaseManageOpen] = useState(true);
  const [docsOpen, setDocsOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const { pinned, toggle: togglePin } = usePinnedBoards();
  const { recents, track: trackRecent } = useRecentBoards();

  const { workspaces: workspaceList, activeWorkspace: currentWorkspace, activeWorkspaceId, setActiveWorkspaceId: selectWorkspace } = useWorkspace();

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

  const boardQueryUrl = activeWorkspaceId ? `/api/boards?workspaceId=${activeWorkspaceId}` : "/api/boards";
  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(boardQueryUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch boards");
      return res.json();
    },
  });

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
              <SidebarMenuButton asChild isActive={location === "/"} tooltip={getTooltipForRoute("/")}>
                <Link href="/" data-testid="link-dashboard">
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location === "/ai-chat"} tooltip={getTooltipForTitle("Verbo")}>
                <Link href="/ai-chat" data-testid="link-verbo">
                  <Bot className="h-4 w-4" />
                  <span>Verbo</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location === "/vibe-code"} tooltip={getTooltipForRoute("/vibe-code")}>
                <Link href="/vibe-code" data-testid="link-vibe-automator">
                  <Zap className="h-4 w-4" />
                  <span>Vibe Automator</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <BoardTreeSection
          boards={boards}
          location={location}
          onCreateBoard={onCreateBoard}
          pinned={pinned}
          togglePin={togglePin}
          recents={recents}
          trackRecent={trackRecent}
        />

        <NavSection label="AI & Investigation" items={aiInvestigationItems} isOpen={aiOpen} toggle={() => setAiOpen(!aiOpen)} location={location} testId="ai" />

        <NavSection label="Case Management" items={caseManagementItems} isOpen={caseManageOpen} toggle={() => setCaseManageOpen(!caseManageOpen)} location={location} testId="case-mgmt" />
        <NavSection label="Documents" items={documentsItems} isOpen={docsOpen} toggle={() => setDocsOpen(!docsOpen)} location={location} testId="docs" />
        <NavSection label="Billing & Time" items={billingItems} isOpen={billingOpen} toggle={() => setBillingOpen(!billingOpen)} location={location} testId="billing" />
        <NavSection label="Communication & AI" items={communicationItems} isOpen={commOpen} toggle={() => setCommOpen(!commOpen)} location={location} testId="comm" />
        <NavSection label="Admin & Tools" items={adminItems} isOpen={adminOpen} toggle={() => setAdminOpen(!adminOpen)} location={location} testId="admin" />
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SynSeekrStatusIndicator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location === "/security"} tooltip={getTooltipForTitle("Security")}>
              <Link href="/security" data-testid="link-security">
                <Shield className="h-4 w-4" />
                <span>Security</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location === "/settings"} tooltip={getTooltipForTitle("Settings")}>
              <Link href="/settings" data-testid="link-settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function SynSeekrStatusIndicator() {
  const { data: statusData } = useQuery<{ configured: boolean; enabled: boolean; status: string; lastChecked: string; latencyMs: number }>({
    queryKey: ["/api/synseekr/status"],
    refetchInterval: 120000,
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
