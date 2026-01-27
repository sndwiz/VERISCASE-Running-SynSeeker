import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, Send, Plus, Trash2, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  createdAt: string;
  messages?: Message[];
}

export default function AIChatPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4-5");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: modelsData } = useQuery<{ models: AIModel[] }>({
    queryKey: ["/api/ai/models"],
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: currentConversation, isLoading: isLoadingConversation } = useQuery<Conversation>({
    queryKey: ["/api/conversations", selectedConversationId],
    enabled: !!selectedConversationId,
  });

  useEffect(() => {
    if (currentConversation?.model) {
      setSelectedModel(currentConversation.model);
    }
  }, [currentConversation?.model]);

  const createConversationMutation = useMutation({
    mutationFn: async (data: { title: string; model: string }) => {
      const res = await apiRequest("POST", "/api/conversations", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setSelectedConversationId(data.id);
    },
    onError: () => {
      toast({ title: "Failed to create conversation", variant: "destructive" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (selectedConversationId) {
        setSelectedConversationId(null);
      }
    },
    onError: () => {
      toast({ title: "Failed to delete conversation", variant: "destructive" });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentConversation?.messages, streamingContent]);

  const handleNewChat = () => {
    createConversationMutation.mutate({
      title: "New Chat",
      model: selectedModel,
    });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversationId) return;

    const userMessage = message;
    setMessage("");
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch(`/api/conversations/${selectedConversationId}/messages`, {
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

      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId] });
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

        <div className="p-4 border-b">
          <label className="text-xs text-muted-foreground mb-2 block">AI Model</label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger data-testid="select-model">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.filter(m => m.available).map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
              {models.filter(m => !m.available).length > 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground border-t mt-1 pt-1">
                  More providers coming soon
                </div>
              )}
            </SelectContent>
          </Select>
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
                <span className="flex-1 text-sm truncate">{conv.title}</span>
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
              <div className="p-4 text-center text-sm text-muted-foreground">
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
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Bot className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold mb-2">VERICASE AI Assistant</h2>
                  <p className="text-muted-foreground max-w-md">
                    Ask me anything about your legal cases, documents, or evidence.
                    I can help with research, analysis, and document review.
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
                    >
                      {msg.role === "assistant" && (
                        <div className="shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <Card
                        className={cn(
                          "max-w-[80%]",
                          msg.role === "user" ? "bg-primary text-primary-foreground" : ""
                        )}
                      >
                        <CardContent className="p-3">
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
          <div className="flex flex-col items-center justify-center h-full p-8">
            <Card className="max-w-md w-full text-center">
              <CardContent className="pt-8 pb-8">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold mb-3">AI Assistant</h2>
                <p className="text-muted-foreground mb-6">
                  Start a new conversation to chat with Claude or GPT. Ask questions, 
                  analyze documents, or get help with your legal work.
                </p>
                <Button onClick={handleNewChat} size="lg" className="gap-2" data-testid="button-start-chat">
                  <Plus className="h-4 w-4" />
                  Start New Chat
                </Button>
                
                <div className="mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-3">Available Models:</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {models.filter(m => m.available).map((model) => (
                      <span
                        key={model.id}
                        className="px-3 py-1 text-sm bg-muted rounded-md"
                      >
                        {model.name}
                      </span>
                    ))}
                    {models.filter(m => m.available).length === 0 && (
                      <>
                        <span className="px-3 py-1 text-sm bg-muted rounded-md">GPT-5</span>
                        <span className="px-3 py-1 text-sm bg-muted rounded-md">GPT-4o</span>
                        <span className="px-3 py-1 text-sm bg-muted rounded-md">Claude Sonnet</span>
                        <span className="px-3 py-1 text-sm bg-muted rounded-md">Claude Opus</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
