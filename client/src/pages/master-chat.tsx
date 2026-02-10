import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare, Send, AtSign, Hash, Users, Briefcase,
  CheckCircle2, XCircle, Play, AlertTriangle, Search,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { Client, Matter } from "@shared/schema";

interface ChatMessage {
  id: string;
  chatId: string;
  senderUserId: string;
  bodyText: string;
  bodyRichJson?: any;
  replyToMessageId?: string | null;
  isSystemMessage?: boolean;
  createdAt: string;
  sender?: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  entities?: Array<{
    type: string;
    value: string;
    startIndex: number;
    endIndex: number;
  }>;
  attachments?: any[];
}

interface ChatMember {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImageUrl?: string;
}

interface ActionProposal {
  id: string;
  status: string;
  summaryText: string;
  createdAt: string;
  items: Array<{
    id: string;
    actionType: string;
    payloadJson: any;
    confidence: string;
    rationale: string;
  }>;
}

type ScopeType = "client" | "matter";

let socket: Socket | null = null;
function getSocket(userId?: string): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { userId: userId || "anonymous" },
    });
  }
  return socket;
}

export default function MasterChatPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<ScopeType>("client");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: clients = [] } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: matters = [] } = useQuery<Matter[]>({ queryKey: ["/api/matters"] });

  const apiPath = selectedId ? `/api/chats/${scope}/${selectedId}` : null;

  const { data: chatData } = useQuery<{ chatId: string; messages: ChatMessage[] }>({
    queryKey: [apiPath],
    enabled: !!apiPath,
  });

  const { data: members = [] } = useQuery<ChatMember[]>({
    queryKey: ["/api/chats", chatData?.chatId, "members"],
    enabled: !!chatData?.chatId,
  });

  const { data: proposals = [] } = useQuery<ActionProposal[]>({
    queryKey: ["/api/chats", chatData?.chatId, "proposals"],
    enabled: !!chatData?.chatId,
  });

  const sendMutation = useMutation({
    mutationFn: (data: { bodyText: string }) =>
      apiRequest("POST", `/api/chats/${chatData?.chatId}/messages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [apiPath] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatData?.chatId, "proposals"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (proposalId: string) =>
      apiRequest("POST", `/api/chats/proposals/${proposalId}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chats", chatData?.chatId, "proposals"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (proposalId: string) =>
      apiRequest("POST", `/api/chats/proposals/${proposalId}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chats", chatData?.chatId, "proposals"] }),
  });

  const executeMutation = useMutation({
    mutationFn: (proposalId: string) =>
      apiRequest("POST", `/api/chats/proposals/${proposalId}/execute`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chats", chatData?.chatId, "proposals"] }),
  });

  useEffect(() => {
    if (!chatData?.chatId) return;
    const s = getSocket(user?.id);
    s.emit("join-chat", chatData.chatId);

    const handleNewMessage = () => queryClient.invalidateQueries({ queryKey: [apiPath] });
    const handleProposal = () => queryClient.invalidateQueries({ queryKey: ["/api/chats", chatData.chatId, "proposals"] });

    s.on("new-message", handleNewMessage);
    s.on("new-proposal", handleProposal);
    s.on("proposal-updated", handleProposal);

    return () => {
      s.off("new-message", handleNewMessage);
      s.off("new-proposal", handleProposal);
      s.off("proposal-updated", handleProposal);
      s.emit("leave-chat", chatData.chatId);
    };
  }, [chatData?.chatId, apiPath, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatData?.messages]);

  const handleSend = useCallback(() => {
    const text = message.trim();
    if (!text || !chatData?.chatId) return;
    sendMutation.mutate({ bodyText: text });
    setMessage("");
    setShowMentions(false);
  }, [message, chatData?.chatId, sendMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "@") {
      setShowMentions(true);
      setMentionFilter("");
    }
    if (showMentions && e.key === "Escape") {
      setShowMentions(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMessage(val);
    const atIdx = val.lastIndexOf("@");
    if (atIdx >= 0 && atIdx === val.length - 1) {
      setShowMentions(true);
      setMentionFilter("");
    } else if (atIdx >= 0 && showMentions) {
      const afterAt = val.substring(atIdx + 1);
      if (afterAt.includes(" ")) setShowMentions(false);
      else setMentionFilter(afterAt.toLowerCase());
    }
  };

  const insertMention = (member: ChatMember) => {
    const name = [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email || "user";
    const atIdx = message.lastIndexOf("@");
    const before = atIdx >= 0 ? message.substring(0, atIdx) : message;
    setMessage(`${before}@${name} `);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const filteredMembers = members.filter(m => {
    if (!mentionFilter) return true;
    const name = [m.firstName, m.lastName].filter(Boolean).join(" ").toLowerCase();
    return name.includes(mentionFilter) || (m.email || "").toLowerCase().includes(mentionFilter);
  });

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const renderMessageText = (msg: ChatMessage) => {
    if (!msg.entities || msg.entities.length === 0) return <span>{msg.bodyText}</span>;
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const sorted = [...msg.entities].sort((a, b) => a.startIndex - b.startIndex);
    for (const entity of sorted) {
      if (entity.startIndex > lastIndex) {
        parts.push(<span key={`t-${lastIndex}`}>{msg.bodyText.substring(lastIndex, entity.startIndex)}</span>);
      }
      if (entity.type === "mention") {
        parts.push(<span key={`e-${entity.startIndex}`} className="text-primary font-medium">@{entity.value}</span>);
      } else if (entity.type === "tag") {
        parts.push(<Badge key={`e-${entity.startIndex}`} variant="secondary" className="text-xs mx-0.5">#{entity.value}</Badge>);
      } else if (entity.type === "task_ref") {
        parts.push(<span key={`e-${entity.startIndex}`} className="text-blue-500 dark:text-blue-400 font-mono text-xs">{entity.value}</span>);
      } else if (entity.type === "date_ref") {
        parts.push(<span key={`e-${entity.startIndex}`} className="text-amber-600 dark:text-amber-400 underline decoration-dotted">{entity.value}</span>);
      }
      lastIndex = entity.endIndex;
    }
    if (lastIndex < msg.bodyText.length) {
      parts.push(<span key="t-end">{msg.bodyText.substring(lastIndex)}</span>);
    }
    return <>{parts}</>;
  };

  const scopeItems = scope === "client"
    ? clients.filter(c => !searchFilter || c.name.toLowerCase().includes(searchFilter.toLowerCase()))
    : matters.filter(m => !searchFilter || m.name.toLowerCase().includes(searchFilter.toLowerCase()));

  const selectedName = scope === "client"
    ? clients.find(c => c.id === selectedId)?.name
    : matters.find(m => m.id === selectedId)?.name;

  const pendingProposals = proposals.filter(p => p.status === "awaiting_approval");
  const approvedProposals = proposals.filter(p => p.status === "approved");

  return (
    <div className="flex h-full" data-testid="master-chat-page">
      <div className="w-72 border-r flex flex-col">
        <div className="p-3 border-b space-y-2">
          <div className="flex gap-1">
            <Button
              variant={scope === "client" ? "default" : "outline"}
              size="sm"
              onClick={() => { setScope("client"); setSelectedId(null); }}
              data-testid="button-scope-client"
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              Clients
            </Button>
            <Button
              variant={scope === "matter" ? "default" : "outline"}
              size="sm"
              onClick={() => { setScope("matter"); setSelectedId(null); }}
              data-testid="button-scope-matter"
            >
              <Briefcase className="h-3.5 w-3.5 mr-1" />
              Matters
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={`Search ${scope}s...`}
              className="w-full pl-7 pr-2 py-1.5 text-sm bg-transparent border rounded-md focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="input-search-scope"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {scopeItems.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No {scope}s found
            </div>
          )}
          {scopeItems.map((item: any) => (
            <button
              key={item.id}
              className={`w-full text-left p-3 border-b text-sm hover-elevate ${selectedId === item.id ? "bg-accent/50" : ""}`}
              onClick={() => setSelectedId(item.id)}
              data-testid={`select-${scope}-${item.id}`}
            >
              <div className="font-medium truncate">{item.name}</div>
              {scope === "matter" && item.status && (
                <Badge variant="outline" className="text-[10px] mt-1">{item.status}</Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-lg font-medium">Master Chat</p>
            <p className="text-sm mt-1">Select a {scope} to start chatting</p>
            <p className="text-xs mt-2 max-w-sm">
              Cross-board messaging for client and matter-level context. Use @mentions, #tags, and TASK references.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 p-3 border-b">
              <div className="flex items-center gap-2 min-w-0">
                {scope === "client" ? <Users className="h-4 w-4 shrink-0 text-primary" /> : <Briefcase className="h-4 w-4 shrink-0 text-primary" />}
                <span className="font-medium truncate">{selectedName || "Chat"}</span>
                <Badge variant="outline" className="text-[10px]">{scope}</Badge>
              </div>
            </div>

            {pendingProposals.length > 0 && (
              <div className="border-b p-2 space-y-2 max-h-40 overflow-y-auto bg-muted/30">
                {pendingProposals.map(proposal => (
                  <div key={proposal.id} className="text-xs space-y-1">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{proposal.summaryText}</span>
                    </div>
                    {proposal.items.map(item => (
                      <div key={item.id} className="ml-4 p-1.5 rounded bg-background border text-xs">
                        <div className="font-medium">{item.payloadJson?.title || item.actionType}</div>
                        <div className="text-muted-foreground mt-0.5">{item.rationale}</div>
                      </div>
                    ))}
                    <div className="flex items-center gap-1 ml-4">
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => approveMutation.mutate(proposal.id)} disabled={approveMutation.isPending} data-testid={`button-approve-${proposal.id}`}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => rejectMutation.mutate(proposal.id)} disabled={rejectMutation.isPending} data-testid={`button-reject-${proposal.id}`}>
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {approvedProposals.length > 0 && (
              <div className="border-b p-2 space-y-1 bg-green-50 dark:bg-green-950/20">
                {approvedProposals.map(proposal => (
                  <div key={proposal.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground truncate flex-1">{proposal.summaryText}</span>
                    <Button variant="outline" size="sm" className="h-6 text-xs shrink-0 ml-2" onClick={() => executeMutation.mutate(proposal.id)} disabled={executeMutation.isPending} data-testid={`button-execute-${proposal.id}`}>
                      <Play className="h-3 w-3 mr-1" /> Execute
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(!chatData?.messages || chatData.messages.length === 0) && (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground text-sm">
                  <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Start the conversation for this {scope}</p>
                </div>
              )}
              {chatData?.messages?.map((msg, idx) => {
                const prevMsg = idx > 0 ? chatData.messages[idx - 1] : null;
                const showDate = !prevMsg || formatDate(msg.createdAt) !== formatDate(prevMsg.createdAt);
                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center gap-2 my-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <div className="flex gap-2" data-testid={`chat-message-${msg.id}`}>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={msg.sender?.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {(msg.sender?.firstName?.[0] || "U").toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {[msg.sender?.firstName, msg.sender?.lastName].filter(Boolean).join(" ") || "User"}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
                        </div>
                        <div className="text-sm mt-0.5 break-words">{renderMessageText(msg)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-3 relative">
              {showMentions && filteredMembers.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto z-10">
                  {filteredMembers.slice(0, 6).map(m => (
                    <button
                      key={m.id}
                      className="w-full flex items-center gap-2 p-2 text-sm hover-elevate text-left"
                      onClick={() => insertMention(m)}
                      data-testid={`mention-option-${m.id}`}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={m.profileImageUrl} />
                        <AvatarFallback className="text-[10px]">{(m.firstName?.[0] || "U").toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-end gap-2">
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" onClick={() => { setShowMentions(!showMentions); inputRef.current?.focus(); }} data-testid="button-mention">
                    <AtSign className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setMessage(m => m + "#"); inputRef.current?.focus(); }} data-testid="button-tag">
                    <Hash className="h-4 w-4" />
                  </Button>
                </div>
                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... @mention #tag TASK-123"
                  className="flex-1 min-h-[40px] max-h-24 resize-none bg-transparent border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={1}
                  data-testid="input-chat-message"
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!message.trim() || sendMutation.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
