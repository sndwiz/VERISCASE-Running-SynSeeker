import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { CreateBoardDialog } from "@/components/dialogs/create-board-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bot, Calendar, Terminal } from "lucide-react";
import { Link } from "wouter";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import BoardPage from "@/pages/board";
import SettingsPage from "@/pages/settings";
import AIChatPage from "@/pages/ai-chat";
import ClawbotPage from "@/pages/clawbot";
import LandingPage from "@/pages/landing";
import TimeTrackingPage from "@/pages/time-tracking";
import CalendarPage from "@/pages/calendar-page";
import ApprovalsPage from "@/pages/approvals-page";
import MattersPage from "@/pages/matters";
import ClientsPage from "@/pages/clients";
import EvidenceVaultPage from "@/pages/evidence-vault";
import DetectiveBoardPage from "@/pages/detective-board";
import AutomationsPage from "@/pages/automations";
import FilingCabinetPage from "@/pages/filing-cabinet";
import DailyBriefingPage from "@/pages/daily-briefing";

import type { Board } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/boards/:id" component={BoardPage} />
      <Route path="/ai-chat" component={AIChatPage} />
      <Route path="/clawbot" component={ClawbotPage} />
      <Route path="/evidence" component={EvidenceVaultPage} />
      <Route path="/detective" component={DetectiveBoardPage} />
      <Route path="/automations" component={AutomationsPage} />
      <Route path="/matters" component={MattersPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/documents" component={FilingCabinetPage} />
      <Route path="/time-tracking" component={TimeTrackingPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/approvals" component={ApprovalsPage} />
      <Route path="/briefing" component={DailyBriefingPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  role: string;
}

function AppLayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createBoardOpen, setCreateBoardOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
    enabled: !!user,
  });

  const createBoardMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color: string }) =>
      apiRequest("POST", "/api/boards", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({ title: "Board created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create board", variant: "destructive" });
    },
  });

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  if (isLoadingUser) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <LandingPage onLogin={handleLogin} />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          boards={boards}
          onCreateBoard={() => setCreateBoardOpen(true)}
        />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <Link href="/ai-chat">
                <Button variant="default" size="sm" className="gap-2" data-testid="button-clawdbot">
                  <Bot className="h-4 w-4" />
                  ClawdBot
                </Button>
              </Link>
              <Link href="/briefing">
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-daily-briefing">
                  <Calendar className="h-4 w-4" />
                  Daily Briefing
                </Button>
              </Link>
              <Link href="/clawbot">
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-clawbot-gateway">
                  <Terminal className="h-4 w-4" />
                  Clawbot
                </Button>
              </Link>
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </SidebarInset>
      </div>

      <CreateBoardDialog
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
        onSubmit={(data) => createBoardMutation.mutate(data)}
      />
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vericase-theme">
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
