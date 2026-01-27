import { useState } from "react";
import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { CreateBoardDialog } from "@/components/dialogs/create-board-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import BoardPage from "@/pages/board";
import SettingsPage from "@/pages/settings";
import AIChatPage from "@/pages/ai-chat";
import {
  MattersPage,
  ClientsPage,
  DocumentsPage,
  TimeTrackingPage,
  CalendarPage,
  ApprovalsPage,
  EvidenceVaultPage,
  DetectiveBoardPage,
} from "@/pages/placeholder";

import type { Board } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/boards/:id" component={BoardPage} />
      <Route path="/ai-chat" component={AIChatPage} />
      <Route path="/evidence" component={EvidenceVaultPage} />
      <Route path="/detective" component={DetectiveBoardPage} />
      <Route path="/matters" component={MattersPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/documents" component={DocumentsPage} />
      <Route path="/time-tracking" component={TimeTrackingPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/approvals" component={ApprovalsPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [createBoardOpen, setCreateBoardOpen] = useState(false);

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ["/api/boards"],
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
            <ThemeToggle />
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
