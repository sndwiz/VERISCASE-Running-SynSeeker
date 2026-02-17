import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  Calendar,
  ChevronDown,
  ChevronRight,
  Plug,
  PlugZap,
  RefreshCw,
  Settings,
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  DollarSign,
  FileText,
  Link2,
} from "lucide-react";
import { SiGoogle } from "react-icons/si";

interface IntegrationConnection {
  id: string;
  provider: string;
  type: string;
  userId: string;
  accountEmail: string | null;
  status: string | null;
  lastSyncAt: string | null;
  settings: any;
  createdAt: string | null;
}

interface IntegrationStatus {
  connections: Record<string, {
    id: string;
    provider: string;
    type: string;
    status: string;
    accountEmail: string | null;
    lastSyncAt: string | null;
    settings: any;
  }>;
  sms: {
    configured: boolean;
    phoneNumber: string | null;
  };
}

interface AccountingStatus {
  quickbooks: { connected: boolean; accountEmail?: string; lastSyncAt?: string; id?: string };
  xero: { connected: boolean; accountEmail?: string; lastSyncAt?: string; id?: string };
}

interface ChartOfAccounts {
  accounts: Array<{ code: string; name: string; type: string; mappedTo: string }>;
  message: string;
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = true, testId }: {
  title: string;
  icon: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
  testId: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex items-center gap-2 w-full text-left hover:opacity-80"
        onClick={() => setIsOpen(!isOpen)}
        data-testid={`toggle-${testId}`}
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">{title}</h2>
      </button>
      {isOpen && <div className="space-y-4 pl-2">{children}</div>}
    </div>
  );
}

function ConnectionCard({ provider, type, label, icon: Icon, connection, onConnect, onDisconnect, onSync, isConnecting, isSyncing }: {
  provider: string;
  type: string;
  label: string;
  icon: any;
  connection?: { id: string; status: string; accountEmail: string | null; lastSyncAt: string | null };
  onConnect: (email: string) => void;
  onDisconnect: (id: string) => void;
  onSync: (id: string) => void;
  isConnecting: boolean;
  isSyncing: boolean;
}) {
  const [email, setEmail] = useState("");
  const isConnected = connection?.status === "connected";

  return (
    <Card data-testid={`card-integration-${provider}-${type}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{label}</CardTitle>
            <CardDescription className="text-xs">
              {isConnected ? connection?.accountEmail || "Connected" : "Not connected"}
            </CardDescription>
          </div>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"} data-testid={`status-${provider}-${type}`}>
          {isConnected ? (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground inline-block" />
              Disconnected
            </span>
          )}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {isConnected ? (
          <>
            {connection?.lastSyncAt && (
              <p className="text-xs text-muted-foreground" data-testid={`text-last-sync-${provider}-${type}`}>
                Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSync(connection!.id)}
                disabled={isSyncing}
                data-testid={`button-sync-${provider}-${type}`}
              >
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Sync Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisconnect(connection!.id)}
                data-testid={`button-disconnect-${provider}-${type}`}
              >
                <PlugZap className="h-4 w-4 mr-1" />
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Account email"
              className="text-sm"
              data-testid={`input-email-${provider}-${type}`}
            />
            <Button
              size="sm"
              onClick={() => { onConnect(email); setEmail(""); }}
              disabled={isConnecting || !email.trim()}
              data-testid={`button-connect-${provider}-${type}`}
            >
              {isConnecting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plug className="h-4 w-4 mr-1" />}
              Connect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function IntegrationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: status, isLoading: statusLoading } = useQuery<IntegrationStatus>({
    queryKey: ["/api/integrations/status"],
  });

  const { data: accountingStatus } = useQuery<AccountingStatus>({
    queryKey: ["/api/integrations/accounting/status"],
  });

  const { data: chartOfAccounts } = useQuery<ChartOfAccounts>({
    queryKey: ["/api/integrations/accounting/chart-of-accounts"],
  });

  const connectMutation = useMutation({
    mutationFn: async (data: { provider: string; type: string; accountEmail: string }) => {
      const res = await apiRequest("POST", "/api/integrations/connect", data);
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/accounting/status"] });
      toast({ title: `${vars.provider} ${vars.type} connected` });
    },
    onError: () => {
      toast({ title: "Failed to connect", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/integrations/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/accounting/status"] });
      toast({ title: "Integration disconnected" });
    },
    onError: () => {
      toast({ title: "Failed to disconnect", variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      setSyncingId(id);
      const res = await apiRequest("POST", `/api/integrations/${id}/sync`);
      return res.json();
    },
    onSuccess: (data) => {
      setSyncingId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({ title: "Sync complete", description: data.message });
    },
    onError: () => {
      setSyncingId(null);
      toast({ title: "Sync failed", variant: "destructive" });
    },
  });

  const twilioMutation = useMutation({
    mutationFn: async (data: { accountSid: string; authToken: string; phoneNumber: string }) => {
      const res = await apiRequest("POST", "/api/sms/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/status"] });
      toast({ title: "Twilio configuration saved" });
      setTwilioSid("");
      setTwilioToken("");
      setTwilioPhone("");
    },
    onError: () => {
      toast({ title: "Failed to save Twilio settings", variant: "destructive" });
    },
  });

  const syncInvoicesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/integrations/accounting/sync-invoices");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/integrations/accounting/status"] });
      toast({ title: "Invoice sync triggered", description: data.message });
    },
    onError: () => {
      toast({ title: "Failed to sync invoices", variant: "destructive" });
    },
  });

  const getConnection = (provider: string, type: string) => {
    if (!status?.connections) return undefined;
    return status.connections[`${provider}_${type}`];
  };

  const handleConnect = (provider: string, type: string) => (email: string) => {
    connectMutation.mutate({ provider, type, accountEmail: email });
  };

  const handleDisconnect = (id: string) => {
    disconnectMutation.mutate(id);
  };

  const handleSync = (id: string) => {
    syncMutation.mutate(id);
  };

  if (statusLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-8" data-testid="page-integrations">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold" data-testid="text-integrations-title">Integrations</h1>
          <p className="text-sm text-muted-foreground">Connect external services to streamline your practice</p>
        </div>
      </div>

      <CollapsibleSection title="Email & Calendar" icon={Mail} testId="email-calendar">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConnectionCard
            provider="google"
            type="email"
            label="Google Workspace"
            icon={SiGoogle}
            connection={getConnection("google", "email")}
            onConnect={handleConnect("google", "email")}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
            isConnecting={connectMutation.isPending}
            isSyncing={syncingId === getConnection("google", "email")?.id}
          />
          <ConnectionCard
            provider="microsoft"
            type="email"
            label="Microsoft 365"
            icon={Mail}
            connection={getConnection("microsoft", "email")}
            onConnect={handleConnect("microsoft", "email")}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
            isConnecting={connectMutation.isPending}
            isSyncing={syncingId === getConnection("microsoft", "email")?.id}
          />
        </div>

        <Card data-testid="card-email-sync-settings">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sync Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-sm">Auto-link emails to matters</Label>
                <p className="text-xs text-muted-foreground">Automatically match incoming emails to related matters based on contacts</p>
              </div>
              <Switch data-testid="switch-auto-link-matters" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-sm">Sync Frequency</Label>
                <p className="text-xs text-muted-foreground">How often to pull new emails and calendar events</p>
              </div>
              <Select defaultValue="15">
                <SelectTrigger className="w-full sm:w-32" data-testid="select-sync-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Every 5 min</SelectItem>
                  <SelectItem value="15">Every 15 min</SelectItem>
                  <SelectItem value="30">Every 30 min</SelectItem>
                  <SelectItem value="60">Every hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </CollapsibleSection>

      <CollapsibleSection title="Accounting" icon={DollarSign} defaultOpen={true} testId="accounting">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConnectionCard
            provider="quickbooks"
            type="accounting"
            label="QuickBooks Online"
            icon={DollarSign}
            connection={getConnection("quickbooks", "accounting")}
            onConnect={handleConnect("quickbooks", "accounting")}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
            isConnecting={connectMutation.isPending}
            isSyncing={syncingId === getConnection("quickbooks", "accounting")?.id}
          />
          <ConnectionCard
            provider="xero"
            type="accounting"
            label="Xero"
            icon={FileText}
            connection={getConnection("xero", "accounting")}
            onConnect={handleConnect("xero", "accounting")}
            onDisconnect={handleDisconnect}
            onSync={handleSync}
            isConnecting={connectMutation.isPending}
            isSyncing={syncingId === getConnection("xero", "accounting")?.id}
          />
        </div>

        <Card data-testid="card-accounting-settings">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Accounting Sync Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-sm">Auto-sync invoices</Label>
                <p className="text-xs text-muted-foreground">Push new invoices to your accounting software automatically</p>
              </div>
              <Switch data-testid="switch-auto-sync-invoices" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-sm">Auto-sync payments</Label>
                <p className="text-xs text-muted-foreground">Record payments received in your accounting software</p>
              </div>
              <Switch data-testid="switch-auto-sync-payments" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncInvoicesMutation.mutate()}
              disabled={syncInvoicesMutation.isPending}
              data-testid="button-sync-invoices"
            >
              {syncInvoicesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              Sync Invoices Now
            </Button>
          </CardContent>
        </Card>

        {chartOfAccounts && (
          <Card data-testid="card-chart-of-accounts">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Chart of Accounts Mapping</CardTitle>
              <CardDescription className="text-xs">{chartOfAccounts.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {chartOfAccounts.accounts.map((account) => (
                  <div key={account.code} className="flex items-center justify-between gap-2 text-xs py-1 border-b last:border-b-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-mono">{account.code}</Badge>
                      <span>{account.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{account.type}</Badge>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        {account.mappedTo.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="SMS / Texting" icon={Phone} defaultOpen={true} testId="sms">
        <Card data-testid="card-twilio-config">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <div>
              <CardTitle className="text-base">Twilio Configuration</CardTitle>
              <CardDescription className="text-xs">
                Configure Twilio to send and receive SMS messages with clients
              </CardDescription>
            </div>
            <Badge
              variant={status?.sms?.configured ? "default" : "secondary"}
              data-testid="status-twilio"
            >
              {status?.sms?.configured ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Configured
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Not Configured
                </span>
              )}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {status?.sms?.configured && status.sms.phoneNumber && (
              <p className="text-xs text-muted-foreground" data-testid="text-twilio-phone">
                Active number: {status.sms.phoneNumber}
              </p>
            )}
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Account SID</Label>
                <Input
                  value={twilioSid}
                  onChange={(e) => setTwilioSid(e.target.value)}
                  placeholder="AC..."
                  type="password"
                  className="text-sm"
                  data-testid="input-twilio-sid"
                />
              </div>
              <div>
                <Label className="text-xs">Auth Token</Label>
                <Input
                  value={twilioToken}
                  onChange={(e) => setTwilioToken(e.target.value)}
                  placeholder="Auth token"
                  type="password"
                  className="text-sm"
                  data-testid="input-twilio-token"
                />
              </div>
              <div>
                <Label className="text-xs">Phone Number</Label>
                <Input
                  value={twilioPhone}
                  onChange={(e) => setTwilioPhone(e.target.value)}
                  placeholder="+15551234567"
                  className="text-sm"
                  data-testid="input-twilio-phone"
                />
              </div>
            </div>
            <Button
              size="sm"
              onClick={() =>
                twilioMutation.mutate({
                  accountSid: twilioSid,
                  authToken: twilioToken,
                  phoneNumber: twilioPhone,
                })
              }
              disabled={twilioMutation.isPending || (!twilioSid && !twilioToken && !twilioPhone)}
              data-testid="button-save-twilio"
            >
              {twilioMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Settings className="h-4 w-4 mr-1" />}
              Save Configuration
            </Button>
          </CardContent>
        </Card>
      </CollapsibleSection>
    </div>
  );
}
