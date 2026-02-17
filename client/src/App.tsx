import { useState, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { KillSwitch } from "@/components/kill-switch";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { CreateBoardDialog, type CreateBoardSubmitData } from "@/components/dialogs/create-board-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Bot, Calendar, Terminal, Circle, MoreVertical, BookOpen, ShieldAlert, Cpu } from "lucide-react";
import { useProcessRecorder } from "@/hooks/use-process-recorder";
import { ModelPicker, BatmodeBadge } from "@/components/model-picker";
import { Link } from "wouter";
import { HelpGuide } from "@/components/help-guide";
import { WorkspaceProvider, useWorkspace } from "@/hooks/use-workspace";
import { useIsMobile } from "@/hooks/use-mobile";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";

const HomePage = lazy(() => import("@/pages/home"));
const BoardPage = lazy(() => import("@/pages/board"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const AIChatPage = lazy(() => import("@/pages/ai-chat"));
const ClawbotPage = lazy(() => import("@/pages/clawbot"));
const TimeTrackingPage = lazy(() => import("@/pages/time-tracking"));
const CalendarPage = lazy(() => import("@/pages/calendar-page"));
const ApprovalsPage = lazy(() => import("@/pages/approvals-page"));
const MattersPage = lazy(() => import("@/pages/matters"));
const ClientsPage = lazy(() => import("@/pages/clients"));
const EvidenceVaultPage = lazy(() => import("@/pages/evidence-vault"));
const DetectiveBoardPage = lazy(() => import("@/pages/detective-board"));
const AutomationsPage = lazy(() => import("@/pages/automations"));
const FilingCabinetPage = lazy(() => import("@/pages/filing-cabinet"));
const DailyBriefingPage = lazy(() => import("@/pages/daily-briefing"));
const DocumentMakerPage = lazy(() => import("@/pages/document-maker"));
const MeetingNotesPage = lazy(() => import("@/pages/meeting-notes"));
const ClientDashboardPage = lazy(() => import("@/pages/client-dashboard"));
const ClientDetailDashboard = lazy(() => import("@/pages/client-detail-dashboard"));
const VibeCodePage = lazy(() => import("@/pages/vibe-code"));
const SecurityDashboardPage = lazy(() => import("@/pages/security-dashboard"));
const MatterDetailPage = lazy(() => import("@/pages/matter-detail"));
const BillingDashboard = lazy(() => import("@/pages/billing-dashboard"));
const ClientBillingPage = lazy(() => import("@/pages/client-billing"));
const MatterBillingPage = lazy(() => import("@/pages/matter-billing"));
const LegalAIPage = lazy(() => import("@/pages/legal-ai"));
const IntakeFormsPage = lazy(() => import("@/pages/intake-forms"));
const CommunicationsPage = lazy(() => import("@/pages/communications"));
const UploadOrganizerPage = lazy(() => import("@/pages/upload-organizer"));
const MasterChatPage = lazy(() => import("@/pages/master-chat"));
const DocumentWashPage = lazy(() => import("@/pages/document-wash"));
const BillingVerifierPage = lazy(() => import("@/pages/billing-verifier"));
const TemplatesPage = lazy(() => import("@/pages/templates"));
const ProcessRecorderPage = lazy(() => import("@/pages/process-recorder"));
const TeamMembersPage = lazy(() => import("@/pages/team-members"));
const MyTasksPage = lazy(() => import("@/pages/my-tasks"));
const ProductGuidePage = lazy(() => import("@/pages/product-guide"));
const PdfProPage = lazy(() => import("@/pages/pdf-pro"));
const EFilingDashboard = lazy(() => import("@/pages/efiling-dashboard"));
const LegalResearchPage = lazy(() => import("@/pages/legal-research"));
const ModelAdvisorPage = lazy(() => import("@/pages/model-advisor"));
const VideoPipelinePage = lazy(() => import("@/pages/video-pipeline"));
const PdfForensicsPage = lazy(() => import("@/pages/pdf-forensics"));
const EmailIntelPage = lazy(() => import("@/pages/email-intel"));
const ReportsPage = lazy(() => import("@/pages/reports"));
const SynSeekerPage = lazy(() => import("@/pages/synseeker"));
const SynSeekrResourcesPage = lazy(() => import("@/pages/synseekr-resources"));
const CaseJournalPage = lazy(() => import("@/pages/case-journal"));
const CaseOutcomePage = lazy(() => import("@/pages/case-outcome"));
const KnowledgeBasePage = lazy(() => import("@/pages/knowledge-base"));
const EvidenceViewsPage = lazy(() => import("@/pages/evidence-views"));

function PageLoader() {
  return (
    <div className="h-full w-full flex items-center justify-center p-8">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}


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
      <Route path="/matters/:matterId/billing" component={MatterBillingPage} />
      <Route path="/matters/:id" component={MatterDetailPage} />
      <Route path="/matters" component={MattersPage} />
      <Route path="/clients/:clientId/billing" component={ClientBillingPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/billing" component={BillingDashboard} />
      <Route path="/client-dashboard/:clientId" component={ClientDetailDashboard} />
      <Route path="/client-dashboard" component={ClientDashboardPage} />
      <Route path="/documents" component={FilingCabinetPage} />
      <Route path="/document-maker" component={DocumentMakerPage} />
      <Route path="/legal-ai" component={LegalAIPage} />
      <Route path="/time-tracking" component={TimeTrackingPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/approvals" component={ApprovalsPage} />
      <Route path="/briefing" component={DailyBriefingPage} />
      <Route path="/meetings" component={MeetingNotesPage} />
      <Route path="/vibe-code" component={VibeCodePage} />
      <Route path="/communications" component={CommunicationsPage} />
      <Route path="/security" component={SecurityDashboardPage} />
      <Route path="/intake-forms" component={IntakeFormsPage} />
      <Route path="/upload-organizer" component={UploadOrganizerPage} />
      <Route path="/master-chat" component={MasterChatPage} />
      <Route path="/document-wash" component={DocumentWashPage} />
      <Route path="/billing-verifier" component={BillingVerifierPage} />
      <Route path="/templates" component={TemplatesPage} />
      <Route path="/process-recorder" component={ProcessRecorderPage} />
      <Route path="/team-members" component={TeamMembersPage} />
      <Route path="/my-tasks" component={MyTasksPage} />
      <Route path="/product-guide" component={ProductGuidePage} />
      <Route path="/pdf-pro" component={PdfProPage} />
      <Route path="/efiling" component={EFilingDashboard} />
      <Route path="/model-advisor" component={ModelAdvisorPage} />
      <Route path="/legal-research" component={LegalResearchPage} />
      <Route path="/video-pipeline" component={VideoPipelinePage} />
      <Route path="/pdf-forensics" component={PdfForensicsPage} />
      <Route path="/email-intel" component={EmailIntelPage} />
      <Route path="/reports/:reportId" component={ReportsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/ai-resources" component={SynSeekrResourcesPage} />
      <Route path="/synseeker" component={SynSeekerPage} />
      <Route path="/synseeker/:id" component={SynSeekerPage} />
      <Route path="/matters/:matterId/journal" component={CaseJournalPage} />
      <Route path="/matters/:matterId/outcome" component={CaseOutcomePage} />
      <Route path="/matters/:matterId/evidence-views" component={EvidenceViewsPage} />
      <Route path="/knowledge-base" component={KnowledgeBasePage} />
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
  const recorder = useProcessRecorder();
  const { activeWorkspaceId } = useWorkspace();

  const isMobile = useIsMobile();

  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const createBoardMutation = useMutation({
    mutationFn: async (data: CreateBoardSubmitData) => {
      const boardPayload: any = {
        name: data.name,
        description: data.description,
        color: data.color,
        clientId: data.clientId,
        matterId: data.matterId,
        workspaceId: activeWorkspaceId,
      };
      if (data.columns) {
        boardPayload.columns = data.columns;
      }
      const boardRes = await apiRequest("POST", "/api/boards", boardPayload);
      const board = await boardRes.json();

      if (data.groups && data.groups.length > 0) {
        let groupErrors = 0;
        for (let i = 0; i < data.groups.length; i++) {
          try {
            const g = data.groups[i];
            await apiRequest("POST", `/api/boards/${board.id}/groups`, {
              title: g.title,
              color: g.color,
              order: i,
            });
          } catch {
            groupErrors++;
          }
        }
        if (groupErrors > 0) {
          throw new Error(`Board created but ${groupErrors} group(s) failed to create`);
        }
      }
      return board;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({ title: "Board created successfully" });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({
        title: error.message?.includes("group") ? "Board created with errors" : "Failed to create board",
        description: error.message?.includes("group") ? error.message : undefined,
        variant: "destructive",
      });
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
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          onCreateBoard={() => setCreateBoardOpen(true)}
        />
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-2 md:px-4 py-2 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1 md:gap-2 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/ai-chat">
                    <Button variant="default" size="sm" className="gap-1 md:gap-2" data-testid="button-verbo">
                      <Bot className="h-4 w-4" />
                      <span className="hidden sm:inline">Verbo</span>
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>AI legal assistant for research, analysis, and case strategy</TooltipContent>
              </Tooltip>
              {!isMobile && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/briefing">
                        <Button variant="outline" size="sm" className="gap-2" data-testid="button-daily-briefing">
                          <Calendar className="h-4 w-4" />
                          <span className="hidden lg:inline">Daily Briefing</span>
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Your personalized daily summary of tasks and deadlines</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/clawbot">
                        <Button variant="outline" size="sm" className="gap-2" data-testid="button-clawbot-gateway">
                          <Terminal className="h-4 w-4" />
                          <span className="hidden lg:inline">Clawbot</span>
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>Autonomous computer control via natural language</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={recorder.isRecording ? "destructive" : "outline"}
                        size="sm"
                        className="gap-2"
                        onClick={async () => {
                          if (recorder.isRecording) {
                            const result = await recorder.stopRecording();
                            if (result) {
                              toast({ title: "Recording stopped", description: `Captured ${result.eventCount || 0} events. View in Process Recorder.` });
                              setLocation("/process-recorder");
                            }
                          } else {
                            const result = await recorder.startRecording();
                            if (result) toast({ title: "Recording started", description: "Your actions are being captured." });
                          }
                        }}
                        data-testid="button-record-process"
                      >
                        <Circle className={`h-3.5 w-3.5 ${recorder.isRecording ? "fill-current animate-pulse" : ""}`} />
                        {recorder.isRecording ? `Recording (${recorder.eventCount})` : "Record"}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{recorder.isRecording ? "Stop recording and convert to automation/macro/playbook" : "Record your workflow to create automations, macros, or SOPs"}</TooltipContent>
                  </Tooltip>
                  <BatmodeBadge />
                  <ModelPicker />
                  <HelpGuide />
                  <KillSwitch />
                </>
              )}
              <ThemeToggle />
              <UserMenu />
              {isMobile && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" data-testid="button-mobile-menu">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/briefing" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Daily Briefing
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/clawbot" className="flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        Clawbot Gateway
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (recorder.isRecording) {
                          const result = await recorder.stopRecording();
                          if (result) {
                            toast({ title: "Recording stopped", description: `Captured ${result.eventCount || 0} events.` });
                            setLocation("/process-recorder");
                          }
                        } else {
                          const result = await recorder.startRecording();
                          if (result) toast({ title: "Recording started", description: "Your actions are being captured." });
                        }
                      }}
                    >
                      <Circle className={`h-4 w-4 ${recorder.isRecording ? "fill-current animate-pulse text-destructive" : ""}`} />
                      {recorder.isRecording ? `Stop Recording (${recorder.eventCount})` : "Record Process"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/ai-resources" className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        AI Resources
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/product-guide" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Help Guide
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<PageLoader />}>
              <Router />
            </Suspense>
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
          <WorkspaceProvider>
            <AppLayout />
          </WorkspaceProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
