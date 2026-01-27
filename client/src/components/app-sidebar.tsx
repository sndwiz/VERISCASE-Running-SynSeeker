import { Link, useLocation } from "wouter";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Board } from "@shared/schema";

interface AppSidebarProps {
  boards: Board[];
  onCreateBoard: () => void;
}

const navigationItems = [
  { title: "Matters", url: "/matters", icon: Briefcase },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Time Tracking", url: "/time-tracking", icon: Clock },
  { title: "Calendar", url: "/calendar", icon: Calendar },
  { title: "Approvals", url: "/approvals", icon: Gavel },
];

export function AppSidebar({ boards, onCreateBoard }: AppSidebarProps) {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="link-home">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Scale className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">VERICASE</span>
              <span className="text-xs text-muted-foreground">Legal Practice OS</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between">
            <span>Boards</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={onCreateBoard}
              data-testid="button-create-board"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </SidebarGroupLabel>
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
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Legal Practice</SidebarGroupLabel>
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
