import { Link, useLocation } from "wouter";
import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Board } from "@shared/schema";

const workspaces = [
  { id: "default", name: "Main Workspace", icon: Building2 },
];

interface AppSidebarProps {
  boards: Board[];
  onCreateBoard: () => void;
}

const navigationItems = [
  { title: "Matters", url: "/matters", icon: Briefcase },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Document Maker", url: "/document-maker", icon: FilePlus2 },
  { title: "Time Tracking", url: "/time-tracking", icon: Clock },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Approvals", url: "/approvals", icon: Gavel },
];

const aiInvestigationItems = [
  { title: "AI Assistant", url: "/ai-chat", icon: Bot },
  { title: "Evidence Vault", url: "/evidence", icon: Shield },
  { title: "Detective Board", url: "/detective", icon: Network },
  { title: "Automations", url: "/automations", icon: Zap },
];

export function AppSidebar({ boards, onCreateBoard }: AppSidebarProps) {
  const [location] = useLocation();
  const [boardsOpen, setBoardsOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(true);
  const [practiceOpen, setPracticeOpen] = useState(true);
  const [currentWorkspace] = useState(workspaces[0]);

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
              className="w-full justify-between h-9 px-2"
              data-testid="button-workspace-selector"
            >
              <div className="flex items-center gap-2">
                <currentWorkspace.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate">{currentWorkspace.name}</span>
              </div>
              <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {workspaces.map((ws) => (
              <DropdownMenuItem key={ws.id} data-testid={`menu-workspace-${ws.id}`}>
                <ws.icon className="h-4 w-4 mr-2" />
                {ws.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        {/* Dashboard link */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location === "/"}>
                <Link href="/" data-testid="link-dashboard">
                  <Home className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Boards - Collapsible */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-1">
            <button
              type="button"
              className="flex items-center gap-1 hover:opacity-80"
              onClick={() => setBoardsOpen(!boardsOpen)}
              data-testid="toggle-boards-section"
            >
              <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${boardsOpen ? "" : "-rotate-90"}`} />
              <span>Boards</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => { e.stopPropagation(); onCreateBoard(); }}
              data-testid="button-create-board"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </SidebarGroupLabel>
          {boardsOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {boards.map((board) => (
                  <SidebarMenuItem key={board.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === `/boards/${board.id}`}
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

        {/* AI & Investigation - Collapsible */}
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
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
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

        {/* Legal Practice - Collapsible */}
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
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                    >
                      <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(' ', '-')}`}>
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location === "/settings"}>
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
