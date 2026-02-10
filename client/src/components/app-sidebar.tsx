import { Link, useLocation } from "wouter";
import { useState } from "react";
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
  Home,
  Building2,
  ChevronsUpDown,
  FilePlus2,
  FolderOpen,
  Mic,
  ShieldCheck,
  Server,
  Sparkles,
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Board, Workspace } from "@shared/schema";
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
];

const aiInvestigationItems = [
  { title: "Evidence Vault", url: "/evidence", icon: Shield },
  { title: "Detective Board", url: "/detective", icon: Network },
  { title: "Automations", url: "/automations", icon: Zap },
  { title: "E-Filing Brain", url: "/efiling", icon: Scale },
  { title: "Video Pipeline", url: "/video-pipeline", icon: FileVideo },
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

export function AppSidebar({ onCreateBoard }: AppSidebarProps) {
  const [location] = useLocation();
  const [casesOpen, setCasesOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [caseManageOpen, setCaseManageOpen] = useState(true);
  const [docsOpen, setDocsOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

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
                <Link href="/vibe-code" data-testid="link-vibe-code">
                  <Sparkles className="h-4 w-4" />
                  <span>Vibe Code</span>
                </Link>
              </SidebarMenuButton>
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
                {boards.map((board) => (
                  <SidebarMenuItem key={board.id}>
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
                  </SidebarMenuItem>
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
