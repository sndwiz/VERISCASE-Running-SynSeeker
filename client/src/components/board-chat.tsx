import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageSquare, Send, X, AtSign, Hash,
  CheckCircle2, XCircle, Play, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

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

interface BoardChatProps {
  boardId: string;
  boardName?: string;
}

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

export function BoardChatPanel({ boardId, boardName }: BoardChatProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const { data: chatData } = useQuery<{ chatId: string; messages: ChatMessage[] }>({
    queryKey: ["/api/chats/board", boardId],
    enabled: open,
  });

  const { data: members = [] } = useQuery<ChatMember[]>({
    queryKey: ["/api/chats", chatData?.chatId, "members"],
    enabled: open && !!chatData?.chatId,
  });

  const { data: proposals = [] } = useQuery<ActionProposal[]>({
    queryKey: ["/api/chats", chatData?.chatId, "proposals"],
    enabled: open && !!chatData?.chatId,
  });

  const sendMutation = useMutation({
    mutationFn: (data: { bodyText: string; replyToMessageId?: string }) =>
      apiRequest("POST", `/api/chats/${chatData?.chatId}/messages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats/board", boardId] });
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatData?.chatId, "proposals"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (proposalId: string) =>
      apiRequest("POST", `/api/chats/proposals/${proposalId}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatData?.chatId, "proposals"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (proposalId: string) =>
      apiRequest("POST", `/api/chats/proposals/${proposalId}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatData?.chatId, "proposals"] });
    },
  });

  const executeMutation = useMutation({
    mutationFn: (proposalId: string) =>
      apiRequest("POST", `/api/chats/proposals/${proposalId}/execute`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatData?.chatId, "proposals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards", boardId, "tasks"] });
    },
  });

  useEffect(() => {
    if (!open || !chatData?.chatId) return;
    const s = getSocket(user?.id);
    s.emit("join-chat", chatData.chatId);

    const handleNewMessage = (msg: ChatMessage) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats/board", boardId] });
    };

    const handleNewProposal = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatData.chatId, "proposals"] });
    };

    const handleTyping = (data: { userName: string }) => {
      setTypingUsers(prev => prev.includes(data.userName) ? prev : [...prev, data.userName]);
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u !== data.userName));
      }, 3000);
    };

    s.on("new-message", handleNewMessage);
    s.on("new-proposal", handleNewProposal);
    s.on("proposal-updated", handleNewProposal);
    s.on("user-typing", handleTyping);

    return () => {
      s.off("new-message", handleNewMessage);
      s.off("new-proposal", handleNewProposal);
      s.off("proposal-updated", handleNewProposal);
      s.off("user-typing", handleTyping);
      s.emit("leave-chat", chatData.chatId);
    };
  }, [open, chatData?.chatId, boardId, queryClient]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
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
      if (afterAt.includes(" ")) {
        setShowMentions(false);
      } else {
        setMentionFilter(afterAt.toLowerCase());
      }
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

  const renderMessageText = (msg: ChatMessage) => {
    if (!msg.entities || msg.entities.length === 0) {
      return <span>{msg.bodyText}</span>;
    }

    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    const sorted = [...msg.entities].sort((a, b) => a.startIndex - b.startIndex);

    for (const entity of sorted) {
      if (entity.startIndex > lastIndex) {
        parts.push(<span key={`t-${lastIndex}`}>{msg.bodyText.substring(lastIndex, entity.startIndex)}</span>);
      }
      if (entity.type === "mention") {
        parts.push(
          <span key={`e-${entity.startIndex}`} className="text-primary font-medium">
            @{entity.value}
          </span>
        );
      } else if (entity.type === "tag") {
        parts.push(
          <Badge key={`e-${entity.startIndex}`} variant="secondary" className="text-xs mx-0.5">
            #{entity.value}
          </Badge>
        );
      } else if (entity.type === "task_ref") {
        parts.push(
          <span key={`e-${entity.startIndex}`} className="text-blue-500 dark:text-blue-400 font-mono text-xs">
            {entity.value}
          </span>
        );
      } else if (entity.type === "date_ref") {
        parts.push(
          <span key={`e-${entity.startIndex}`} className="text-amber-600 dark:text-amber-400 underline decoration-dotted">
            {entity.value}
          </span>
        );
      }
      lastIndex = entity.endIndex;
    }
    if (lastIndex < msg.bodyText.length) {
      parts.push(<span key={`t-end`}>{msg.bodyText.substring(lastIndex)}</span>);
    }
    return <>{parts}</>;
  };

  const pendingProposals = proposals.filter(p => p.status === "awaiting_approval");
  const approvedProposals = proposals.filter(p => p.status === "approved");

  if (!open) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
        data-testid="button-open-board-chat"
      >
        <MessageSquare className="h-5 w-5" />
        {pendingProposals.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
            {pendingProposals.length}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div className="fixed bottom-0 right-4 z-50 w-96 max-h-[70vh] flex flex-col" data-testid="board-chat-panel">
      <Card className="flex flex-col h-full max-h-[70vh] overflow-hidden">
        <div className="flex items-center justify-between gap-2 p-3 border-b">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
            <span className="font-medium text-sm truncate">{boardName || "Board"} Chat</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} data-testid="button-close-chat">
            <X className="h-4 w-4" />
          </Button>
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
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {item.confidence} confidence
                    </Badge>
                  </div>
                ))}
                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => approveMutation.mutate(proposal.id)}
                    disabled={approveMutation.isPending}
                    data-testid={`button-approve-proposal-${proposal.id}`}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => rejectMutation.mutate(proposal.id)}
                    disabled={rejectMutation.isPending}
                    data-testid={`button-reject-proposal-${proposal.id}`}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {approvedProposals.length > 0 && (
          <div className="border-b p-2 space-y-1 bg-green-50 dark:bg-green-950/20">
            {approvedProposals.map(proposal => (
              <div key={proposal.id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate flex-1">{proposal.summaryText}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs shrink-0 ml-2"
                  onClick={() => executeMutation.mutate(proposal.id)}
                  disabled={executeMutation.isPending}
                  data-testid={`button-execute-proposal-${proposal.id}`}
                >
                  <Play className="h-3 w-3 mr-1" />
                  Execute
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px]">
          {(!chatData?.messages || chatData.messages.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
              <p>No messages yet</p>
              <p className="text-xs mt-1">Start the conversation</p>
            </div>
          )}
          {chatData?.messages?.map((msg) => (
            <div key={msg.id} className="flex gap-2" data-testid={`chat-message-${msg.id}`}>
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={msg.sender?.profileImageUrl} />
                <AvatarFallback className="text-[10px]">
                  {(msg.sender?.firstName?.[0] || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-xs">
                    {[msg.sender?.firstName, msg.sender?.lastName].filter(Boolean).join(" ") || "User"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                </div>
                <div className="text-sm mt-0.5 break-words">
                  {renderMessageText(msg)}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {typingUsers.length > 0 && (
          <div className="px-3 py-1 text-xs text-muted-foreground">
            {typingUsers.join(", ")} typing...
          </div>
        )}

        <div className="border-t p-2 relative">
          {showMentions && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-2 right-2 mb-1 bg-popover border rounded-md shadow-lg max-h-32 overflow-y-auto z-10">
              {filteredMembers.slice(0, 5).map(m => (
                <button
                  key={m.id}
                  className="w-full flex items-center gap-2 p-2 text-xs hover-elevate text-left"
                  onClick={() => insertMention(m)}
                  data-testid={`mention-option-${m.id}`}
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={m.profileImageUrl} />
                    <AvatarFallback className="text-[8px]">
                      {(m.firstName?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{[m.firstName, m.lastName].filter(Boolean).join(" ") || m.email}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-1">
            <div className="flex gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setShowMentions(!showMentions); inputRef.current?.focus(); }}
                data-testid="button-mention"
              >
                <AtSign className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => { setMessage(msg => msg + "#"); inputRef.current?.focus(); }}
                data-testid="button-tag"
              >
                <Hash className="h-3.5 w-3.5" />
              </Button>
            </div>
            <textarea
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... @mention #tag"
              className="flex-1 min-h-[36px] max-h-20 resize-none bg-transparent border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
      </Card>
    </div>
  );
}
