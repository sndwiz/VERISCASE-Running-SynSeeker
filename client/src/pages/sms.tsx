import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  Phone,
  AlertTriangle,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  Briefcase,
  Users,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";

interface SmsMessage {
  id: string;
  clientId: string | null;
  matterId: string | null;
  contactName: string;
  phoneNumber: string;
  direction: string;
  body: string;
  status: string | null;
  twilioSid: string | null;
  sentBy: string | null;
  sentByName: string | null;
  createdAt: string | null;
}

interface SmsContact {
  phone_number: string;
  contact_name: string;
  client_id: string | null;
  matter_id: string | null;
  last_message: string;
  last_direction: string;
  last_message_at: string;
}

interface SmsSettings {
  configured: boolean;
  accountSid: string | null;
  phoneNumber: string | null;
}

interface ClientRecord {
  id: string;
  name: string;
}

export default function SmsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [contactNameInput, setContactNameInput] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("all");

  const { data: settings, isLoading: settingsLoading } = useQuery<SmsSettings>({
    queryKey: ["/api/sms/settings"],
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery<SmsContact[]>({
    queryKey: ["/api/sms/contacts"],
  });

  const { data: clients = [] } = useQuery<ClientRecord[]>({
    queryKey: ["/api/clients"],
  });

  const { data: conversation = [], isLoading: conversationLoading } = useQuery<SmsMessage[]>({
    queryKey: ["/api/sms/messages/conversation", selectedPhone],
    queryFn: async () => {
      if (!selectedPhone) return [];
      const res = await fetch(`/api/sms/messages/conversation/${encodeURIComponent(selectedPhone)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return res.json();
    },
    enabled: !!selectedPhone,
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; body: string; contactName: string; clientId?: string }) => {
      const res = await apiRequest("POST", "/api/sms/messages", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sms/contacts"] });
      if (selectedPhone) {
        queryClient.invalidateQueries({ queryKey: ["/api/sms/messages/conversation", selectedPhone] });
      }
      setMessageBody("");
      if (data.warning) {
        toast({ title: "Message recorded", description: data.warning, variant: "default" });
      } else {
        toast({ title: "Message sent" });
      }
      if (!selectedPhone && data.message?.phoneNumber) {
        setSelectedPhone(data.message.phoneNumber);
      }
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSend = () => {
    const phone = selectedPhone || phoneInput;
    if (!phone || !messageBody.trim()) return;
    sendMutation.mutate({
      phoneNumber: phone,
      body: messageBody.trim(),
      contactName: contactNameInput || "Unknown",
      clientId: clientFilter !== "all" ? clientFilter : undefined,
    });
  };

  const filteredContacts = clientFilter === "all"
    ? contacts
    : contacts.filter((c) => c.client_id === clientFilter);

  const selectedContact = contacts.find((c) => c.phone_number === selectedPhone);

  return (
    <div className="flex flex-col md:flex-row h-full" data-testid="page-sms">
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r flex flex-col shrink-0 max-h-[40vh] md:max-h-none">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-sm" data-testid="text-sms-title">SMS Messages</h2>
          </div>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-8 text-xs" data-testid="select-sms-client-filter">
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contacts</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto">
          {contactsLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No conversations yet. Send your first message below.
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <button
                key={contact.phone_number}
                type="button"
                className={`w-full text-left p-3 border-b hover-elevate ${
                  selectedPhone === contact.phone_number ? "bg-accent" : ""
                }`}
                onClick={() => {
                  setSelectedPhone(contact.phone_number);
                  setPhoneInput(contact.phone_number);
                  setContactNameInput(contact.contact_name);
                }}
                data-testid={`button-contact-${contact.phone_number}`}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-medium truncate" data-testid={`text-contact-name-${contact.phone_number}`}>
                        {contact.contact_name}
                      </span>
                      {contact.last_direction === "inbound" ? (
                        <ArrowDownLeft className="h-3 w-3 text-blue-500 shrink-0" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3 text-green-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{contact.phone_number}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{contact.last_message}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!settingsLoading && settings && !settings.configured && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b px-4 py-3 flex items-start gap-3" data-testid="banner-twilio-config">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Twilio Not Configured</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Messages will be recorded locally but not sent via SMS. Configure Twilio in{" "}
                <Link href="/integrations" className="underline font-medium" data-testid="link-configure-twilio">
                  Integrations Settings
                </Link>{" "}
                to enable sending.
              </p>
            </div>
          </div>
        )}

        {selectedPhone ? (
          <>
            <div className="border-b px-4 py-3 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium" data-testid="text-conversation-contact">
                    {selectedContact?.contact_name || selectedPhone}
                  </p>
                  <p className="text-xs text-muted-foreground">{selectedPhone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {selectedContact?.client_id && (
                  <Link href={`/client-dashboard/${selectedContact.client_id}`}>
                    <Badge variant="outline" className="gap-1 cursor-pointer" data-testid="badge-linked-client">
                      <Users className="h-3 w-3" />
                      Client
                    </Badge>
                  </Link>
                )}
                {selectedContact?.matter_id && (
                  <Link href={`/matters/${selectedContact.matter_id}`}>
                    <Badge variant="outline" className="gap-1 cursor-pointer" data-testid="badge-linked-matter">
                      <Briefcase className="h-3 w-3" />
                      Matter
                    </Badge>
                  </Link>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {conversationLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversation.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No messages in this conversation yet.
                </div>
              ) : (
                conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-md px-3 py-2 ${
                        msg.direction === "outbound"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] opacity-70">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                        </span>
                        {msg.direction === "outbound" && (
                          <span className="text-[10px] opacity-70">
                            {msg.status === "delivered" ? (
                              <CheckCircle2 className="h-3 w-3 inline" />
                            ) : msg.status === "failed" ? (
                              <XCircle className="h-3 w-3 inline text-destructive" />
                            ) : null}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <MessageSquare className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">Select a conversation or start a new one</p>
            <p className="text-xs mt-1">Enter a phone number below to begin messaging</p>
          </div>
        )}

        <div className="border-t p-3 shrink-0 space-y-2">
          {!selectedPhone && (
            <div className="flex gap-2">
              <Input
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Phone number (e.g. +15551234567)"
                className="flex-1"
                data-testid="input-phone-number"
              />
              <Input
                value={contactNameInput}
                onChange={(e) => setContactNameInput(e.target.value)}
                placeholder="Contact name"
                className="w-full sm:w-40"
                data-testid="input-contact-name"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              data-testid="input-message-body"
            />
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending || !messageBody.trim() || (!selectedPhone && !phoneInput)}
              data-testid="button-send-sms"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
