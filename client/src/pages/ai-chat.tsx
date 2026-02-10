import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, Send, Plus, Trash2, MessageSquare, Loader2, Briefcase, Link, Paperclip, Mic, LayoutGrid, FileText, Globe, BarChart3, Lightbulb, Sparkles, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import type { Matter } from "@shared/schema";

const QUICK_ACTIONS = [
  { icon: LayoutGrid, label: "Create a board", color: "#3b82f6" },
  { icon: FileText, label: "Write a doc", color: "#8b5cf6" },
  { icon: Globe, label: "Research online", color: "#06b6d4" },
  { icon: BarChart3, label: "Analyze data", color: "#f59e0b" },
  { icon: Lightbulb, label: "Brainstorm ideas", color: "#22c55e" },
  { icon: Sparkles, label: "Generate content", color: "#ec4899" },
  { icon: Briefcase, label: "Draft a brief", color: "#6366f1" },
  { icon: GraduationCap, label: "Learn about", color: "#14b8a6" },
];

const SUGGESTED_STARTERS = [
  { title: "Draft a motion for continuance", description: "Create a professional legal motion with proper URCP formatting and citations", badge: "Legal", badgeColor: "#3b82f6" },
  { title: "Research case law precedents", description: "Find relevant precedents, statutes, and case citations for your matter", badge: "Research", badgeColor: "#8b5cf6" },
  { title: "Summarize deposition transcript", description: "Get key takeaways, contradictions, and notable statements from depositions", badge: "AI", badgeColor: "#ec4899" },
  { title: "Review contract for risks", description: "Analyze contract terms, identify potential risks, and suggest amendments", badge: "Analysis", badgeColor: "#f59e0b" },
  { title: "Generate a case timeline", description: "Create a chronological timeline of events from case documents", badge: "Planning", badgeColor: "#22c55e" },
  { title: "Draft client communication", description: "Write professional correspondence to clients about case updates", badge: "Writing", badgeColor: "#06b6d4" },
];

interface AIModel {
  id: string;
  name: string;
  provider: string;
  supportsVision: boolean;
  available: boolean;
}

interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string;
  model: string;
  matterId?: string;
  systemPrompt?: string;
  createdAt: string;
  messages?: Message[];
}

export default function AIChatPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [landingMessage, setLandingMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-5");
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingLandingMessage = useRef<string | null>(null);

  const { data: modelsData } = useQuery<{ models: AIModel[] }>({
    queryKey: ["/api/ai/models"],
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/ai/conversations"],
  });

  const { data: currentConversation, isLoading: isLoadingConversation } = useQuery<Conversation>({
    queryKey: ["/api/ai/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  useEffect(() => {
    if (currentConversation?.model) {
      setSelectedModel(currentConversation.model);
    }
    setSelectedMatterId(currentConversation?.matterId || null);
  }, [currentConversation?.model, currentConversation?.matterId]);

  const createConversationMutation = useMutation({
    mutationFn: async (data: { title: string; model: string; matterId?: string }) => {
      const res = await apiRequest("POST", "/api/ai/conversations", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      setSelectedConversationId(data.id);
      if (pendingLandingMessage.current) {
        setMessage(pendingLandingMessage.current);
        pendingLandingMessage.current = null;
      }
    },
    onError: () => {
      pendingLandingMessage.current = null;
      toast({ title: "Failed to create conversation", variant: "destructive" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ai/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      if (selectedConversationId) {
        setSelectedConversationId(null);
      }
    },
    onError: () => {
      toast({ title: "Failed to delete conversation", variant: "destructive" });
    },
  });

  const updateConversationMutation = useMutation({
    mutationFn: async (data: { id: number; matterId?: string | null }) => {
      const res = await apiRequest("PATCH", `/api/ai/conversations/${data.id}`, {
        matterId: data.matterId || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      if (selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations", selectedConversationId] });
      }
      toast({ title: "Conversation updated" });
    },
    onError: () => {
      toast({ title: "Failed to update conversation", variant: "destructive" });
    },
  });

  const handleMatterChange = (matterId: string | null) => {
    setSelectedMatterId(matterId);
    if (selectedConversationId && currentConversation) {
      updateConversationMutation.mutate({ 
        id: selectedConversationId, 
        matterId: matterId 
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages, streamingContent]);

  const handleNewChat = () => {
    const matter = selectedMatterId ? matters.find(m => m.id === selectedMatterId) : null;
    createConversationMutation.mutate({
      title: matter ? `Chat: ${matter.name}` : "New Chat",
      model: selectedModel,
      matterId: selectedMatterId || undefined,
    });
  };

  const handleLandingSubmit = (text: string) => {
    if (!text.trim()) return;
    pendingLandingMessage.current = text.trim();
    setLandingMessage("");
    const matter = selectedMatterId ? matters.find(m => m.id === selectedMatterId) : null;
    const title = text.length > 40 ? text.slice(0, 40) + "..." : text;
    createConversationMutation.mutate({
      title: matter ? `Chat: ${matter.name}` : title,
      model: selectedModel,
      matterId: selectedMatterId || undefined,
    });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversationId) return;

    const userMessage = message;
    setMessage("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/ai/conversations/${selectedConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMessage, model: selectedModel }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setStreamingContent(fullContent);
              }
              if (data.done) {
                break;
              }
            } catch {
              continue;
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations", selectedConversationId] });
    } catch (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const models = modelsData?.models || [];
  const messages = currentConversation?.messages || [];
  const displayMessages = isStreaming
    ? [...messages, { id: -1, conversationId: selectedConversationId || 0, role: "assistant" as const, content: streamingContent, createdAt: new Date().toISOString() }]
    : messages;

  return (
    <div className="flex h-full">
      <div className="w-64 border-r flex flex-col bg-muted/30">
        <div className="p-4 border-b">
          <Button
            onClick={handleNewChat}
            className="w-full"
            disabled={createConversationMutation.isPending}
            data-testid="button-new-chat"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="p-4 border-b space-y-3">
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <label className="text-xs text-muted-foreground mb-2 block cursor-help" data-testid="label-link-matter">
                  <Link className="h-3 w-3 inline mr-1" />
                  Link to Matter
                </label>
              </TooltipTrigger>
              <TooltipContent>
                Link this conversation to a case/matter to give the AI context about the case
              </TooltipContent>
            </Tooltip>
            <Select 
              value={selectedMatterId || "__none__"} 
              onValueChange={(v) => handleMatterChange(v === "__none__" ? null : v)}
            >
              <SelectTrigger data-testid="select-matter">
                <SelectValue placeholder="Select matter (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" data-testid="select-item-no-matter">
                  No matter linked
                </SelectItem>
                {matters.map((matter) => (
                  <SelectItem key={matter.id} value={matter.id} data-testid={`select-item-matter-${matter.id}`}>
                    {matter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Tooltip>
              <TooltipTrigger asChild>
                <label className="text-xs text-muted-foreground mb-2 block cursor-help" data-testid="label-ai-model">AI Model</label>
              </TooltipTrigger>
              <TooltipContent>
                Select the AI model to use for this conversation
              </TooltipContent>
            </Tooltip>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger data-testid="select-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const available = models.filter(m => m.available);
                  const providerGroups = new Map<string, AIModel[]>();
                  const providerLabels: Record<string, string> = {
                    private: "Synergy Private Server",
                    anthropic: "Anthropic",
                    openai: "OpenAI",
                    gemini: "Google Gemini",
                    deepseek: "DeepSeek",
                  };
                  const providerOrder = ["private", "anthropic", "openai", "gemini", "deepseek"];
                  available.forEach(m => {
                    if (!providerGroups.has(m.provider)) providerGroups.set(m.provider, []);
                    providerGroups.get(m.provider)!.push(m);
                  });
                  return providerOrder.filter(p => providerGroups.has(p)).map(provider => (
                    <div key={provider}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground" data-testid={`text-provider-${provider}`}>
                        {providerLabels[provider] || provider}
                      </div>
                      {providerGroups.get(provider)!.map(model => (
                        <SelectItem key={model.id} value={model.id} data-testid={`select-item-model-${model.id}`}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </div>
                  ));
                })()}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md cursor-pointer group",
                  selectedConversationId === conv.id
                    ? "bg-primary/10"
                    : "hover-elevate"
                )}
                onClick={() => setSelectedConversationId(conv.id)}
                data-testid={`conversation-${conv.id}`}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-sm truncate" data-testid={`text-conversation-title-${conv.id}`}>{conv.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversationMutation.mutate(conv.id);
                  }}
                  data-testid={`button-delete-conversation-${conv.id}`}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {conversations.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground" data-testid="text-no-conversations">
                No conversations yet
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <>
            <ScrollArea className="flex-1 p-4">
              {isLoadingConversation ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : displayMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center" data-testid="section-empty-conversation">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center mb-4 shadow-lg">
                    <Bot className="h-10 w-10 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2" data-testid="text-assistant-header">Verbo</h2>
                  <p className="text-lg text-muted-foreground mb-1">Your AI Legal Assistant</p>
                  <p className="text-muted-foreground max-w-md" data-testid="text-assistant-description">
                    Ready to help with legal research, case analysis, document drafting, and more.
                    Just ask away!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {displayMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                      data-testid={`message-${msg.id}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center shadow-sm">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      <Card
                        className={cn(
                          "max-w-[80%]",
                          msg.role === "user" ? "bg-primary text-primary-foreground" : ""
                        )}
                      >
                        <CardContent className="p-3">
                          <p className="text-sm whitespace-pre-wrap" data-testid={`text-message-content-${msg.id}`}>{msg.content}</p>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="max-w-3xl mx-auto flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="resize-none"
                  rows={2}
                  disabled={isStreaming}
                  data-testid="input-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isStreaming}
                  data-testid="button-send"
                >
                  {isStreaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col h-full overflow-auto" data-testid="section-ai-greeting">
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 max-w-3xl mx-auto w-full">
              <div className="text-center mb-8">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center mx-auto mb-5 shadow-lg">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold mb-2" data-testid="text-ai-greeting-title">
                  Hi there,
                </h1>
                <p className="text-2xl text-muted-foreground font-medium" data-testid="text-ai-greeting-subtitle">
                  What would you like to do today?
                </p>
              </div>

              <div className="w-full max-w-xl mb-10">
                <div className="relative flex items-center border rounded-md bg-background shadow-sm">
                  <Button size="icon" variant="ghost" className="shrink-0 ml-1" data-testid="button-landing-attach">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Input
                    value={landingMessage}
                    onChange={(e) => setLandingMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLandingSubmit(landingMessage)}
                    placeholder="Ask Verbo anything..."
                    className="border-0 focus-visible:ring-0 shadow-none flex-1"
                    data-testid="input-landing-message"
                  />
                  <Button size="icon" variant="ghost" className="shrink-0" data-testid="button-landing-context">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button size="icon" variant="ghost" className="shrink-0" data-testid="button-landing-mic">
                    <Mic className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    className="shrink-0 mr-1"
                    disabled={!landingMessage.trim() || createConversationMutation.isPending}
                    onClick={() => handleLandingSubmit(landingMessage)}
                    data-testid="button-landing-send"
                  >
                    {createConversationMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-6 mb-12" data-testid="section-quick-actions">
                {QUICK_ACTIONS.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleLandingSubmit(action.label)}
                    className="flex flex-col items-center gap-2 group"
                    data-testid={`button-quick-action-${i}`}
                  >
                    <div
                      className="h-12 w-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${action.color}15`, border: `1.5px solid ${action.color}30` }}
                    >
                      <action.icon className="h-5 w-5" style={{ color: action.color }} />
                    </div>
                    <span className="text-xs text-muted-foreground text-center max-w-[72px] leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>

              <div className="w-full" data-testid="section-suggested-starters">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Suggested starters</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SUGGESTED_STARTERS.map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => handleLandingSubmit(starter.title)}
                      className="text-left p-4 rounded-md border hover-elevate"
                      data-testid={`button-starter-${i}`}
                    >
                      <Badge
                        variant="secondary"
                        className="text-xs mb-2 text-white"
                        style={{ backgroundColor: starter.badgeColor }}
                      >
                        {starter.badge}
                      </Badge>
                      <p className="font-medium text-sm mb-1">{starter.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{starter.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
