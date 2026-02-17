import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Bot,
  Settings,
  Send,
  RefreshCw,
  Terminal,
  Globe,
  FileText,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Zap,
  Monitor,
  MessageSquare
} from "lucide-react";

interface ClawbotStatus {
  connected: boolean;
  gatewayUrl: string | null;
  isConfigured: boolean;
  hasAuthToken: boolean;
  version?: string;
  uptime?: number;
  activeSessionCount?: number;
  error?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface Session {
  id: string;
  status: string;
  createdAt: string;
  messages?: Message[];
}

export default function ClawbotPage() {
  const { toast } = useToast();
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [message, setMessage] = useState("");
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<ClawbotStatus>({
    queryKey: ['/api/clawbot/status'],
    refetchInterval: 30000
  });

  const configMutation = useMutation({
    mutationFn: async (config: { gatewayUrl: string; authToken?: string }) => {
      const res = await apiRequest('POST', '/api/clawbot/config', config);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Gateway configuration has been saved"
      });
      refetchStatus();
      setShowConfig(false);
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to update configuration",
        variant: "destructive"
      });
    }
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/clawbot/sessions');
      return res.json();
    },
    onSuccess: (data: any) => {
      setCurrentSession(data.session);
      setMessages([]);
      toast({
        title: "Session Created",
        description: "New Clawbot session started"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Session Failed",
        description: error.message || "Failed to create session",
        variant: "destructive"
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ sessionId, message }: { sessionId: string; message: string }) => {
      const res = await apiRequest('POST', `/api/clawbot/sessions/${sessionId}/messages`, { message });
      return res.json();
    },
    onSuccess: (data: any) => {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.response, timestamp: new Date() }
      ]);
    },
    onError: (error: any) => {
      toast({
        title: "Message Failed",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveConfig = () => {
    if (!gatewayUrl) {
      toast({
        title: "Gateway URL Required",
        description: "Please enter a valid gateway URL",
        variant: "destructive"
      });
      return;
    }
    configMutation.mutate({ gatewayUrl, authToken: authToken || undefined });
  };

  const handleSendMessage = () => {
    if (!message.trim() || !currentSession) return;

    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    sendMessageMutation.mutate({ sessionId: currentSession.id, message });
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto p-3 md:p-6 max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="h-10 w-10 md:h-14 md:w-14 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Terminal className="h-5 w-5 md:h-7 md:w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-clawbot-title">Clawbot Gateway</h1>
              <p className="text-muted-foreground">Connect to OpenClaw for autonomous computer control</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStatus()}
              disabled={statusLoading}
              data-testid="button-refresh-status"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${statusLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              data-testid="button-toggle-config"
            >
              <Settings className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Configure</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {status?.connected ? (
                    <Wifi className="h-5 w-5 text-green-500" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-muted-foreground" />
                  )}
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {status?.connected ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Not Connected
                    </Badge>
                  )}
                </div>
                
                {status?.gatewayUrl && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Gateway</span>
                    <span className="text-sm font-mono truncate max-w-[150px]">
                      {status.gatewayUrl}
                    </span>
                  </div>
                )}

                {status?.version && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Version</span>
                    <span className="text-sm">{status.version}</span>
                  </div>
                )}

                {status?.activeSessionCount !== undefined && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Active Sessions</span>
                    <span className="text-sm">{status.activeSessionCount}</span>
                  </div>
                )}

                {status?.error && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm text-destructive">{status.error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {showConfig && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Gateway Configuration</CardTitle>
                  <CardDescription>
                    Connect to your OpenClaw/Clawbot gateway
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gateway URL</label>
                    <Input
                      placeholder="http://localhost:18789"
                      value={gatewayUrl}
                      onChange={(e) => setGatewayUrl(e.target.value)}
                      data-testid="input-gateway-url"
                    />
                    <p className="text-xs text-muted-foreground">
                      Default: http://localhost:18789
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Auth Token (optional)</label>
                    <Input
                      type="password"
                      placeholder="Your gateway token"
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      data-testid="input-auth-token"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSaveConfig}
                    disabled={configMutation.isPending}
                    data-testid="button-save-config"
                  >
                    {configMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Save Configuration
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-primary" />
                    Execute shell commands
                  </li>
                  <li className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    Browse the web
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Read and write files
                  </li>
                  <li className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-primary" />
                    Control your computer
                  </li>
                  <li className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    50+ integrations
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Setup Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  To connect Clawbot, install OpenClaw on your machine:
                </p>
                <code className="block p-3 bg-muted rounded-lg font-mono text-xs">
                  curl -fsSL https://openclaw.sh | sh
                </code>
                <p className="text-muted-foreground">
                  Then run the gateway and configure the URL above.
                </p>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href="https://docs.clawd.bot/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Documentation
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    Clawbot Chat
                  </CardTitle>
                  {currentSession ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      Session: {currentSession.id.slice(-8)}
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => createSessionMutation.mutate()}
                      disabled={createSessionMutation.isPending}
                      data-testid="button-start-session"
                    >
                      {createSessionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Start Session
                    </Button>
                  )}
                </div>
              </CardHeader>
              <Separator />
              
              <ScrollArea className="flex-1 p-4">
                {!currentSession ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 flex items-center justify-center shadow-lg">
                      <Terminal className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">Clawbot Ready</h3>
                      <p className="text-muted-foreground max-w-md">
                        Start a session to interact with your Clawbot gateway. 
                        Once connected, you can execute commands, browse the web, 
                        and control your computer through natural language.
                      </p>
                    </div>
                    <Button
                      onClick={() => createSessionMutation.mutate()}
                      disabled={createSessionMutation.isPending}
                      data-testid="button-start-session-main"
                    >
                      {createSessionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Start Session
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">
                          Session started. Send a message to interact with Clawbot.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 justify-center">
                          {[
                            "What can you do?",
                            "List my files",
                            "Check system status",
                            "Search the web for news"
                          ].map((suggestion) => (
                            <Button
                              key={suggestion}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setMessage(suggestion);
                              }}
                              data-testid={`button-suggestion-${suggestion.toLowerCase().replace(/\s+/g, '-')}`}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    
                    {sendMessageMutation.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {currentSession && (
                <>
                  <Separator />
                  <div className="p-4 shrink-0">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Send a message to Clawbot..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={sendMessageMutation.isPending}
                        data-testid="input-message"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!message.trim() || sendMessageMutation.isPending}
                        data-testid="button-send-message"
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
