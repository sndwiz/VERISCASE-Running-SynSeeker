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
import { CreateBoardDialog } from "@/components/dialogs/create-board-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Bot, Calendar, Terminal, Circle } from "lucide-react";
import { useProcessRecorder } from "@/hooks/use-process-recorder";
import { ModelPicker, BatmodeBadge } from "@/components/model-picker";
import { Link } from "wouter";
import { HelpGuide } from "@/components/help-guide";
import { WorkspaceProvider, useWorkspace } from "@/hooks/use-workspace";

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

  const { data: user, isLoading: isLoadingUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const createBoardMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; color: string; clientId?: string | null; matterId?: string | null }) =>
      apiRequest("POST", "/api/boards", { ...data, workspaceId: activeWorkspaceId }),
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
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/ai-chat">
                    <Button variant="default" size="sm" className="gap-2" data-testid="button-verbo">
                      <Bot className="h-4 w-4" />
                      Verbo
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent>AI legal assistant for research, analysis, and case strategy</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/briefing">
                    <Button variant="outline" size="sm" className="gap-2" data-testid="button-daily-briefing">
                      <Calendar className="h-4 w-4" />
                      Daily Briefing
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
                      Clawbot
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
              <ThemeToggle />
              <UserMenu />
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
