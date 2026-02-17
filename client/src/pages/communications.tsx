import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Globe,
  MessageCircle,
  Users,
  Activity,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Send,
  Phone,
  Mail,
  FileText,
  Calendar,
  Clock,
  ArrowUpDown,
  Inbox,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PanelLeft,
} from "lucide-react";

type NavSection = "portals" | "text-messages" | "internal-messages" | "logs";

interface NavItem {
  id: NavSection;
  label: string;
  icon: typeof Globe;
}

const NAV_ITEMS: NavItem[] = [
  { id: "portals", label: "Client portals", icon: Globe },
  { id: "text-messages", label: "Text messages", icon: MessageCircle },
  { id: "internal-messages", label: "Internal messages", icon: Users },
  { id: "logs", label: "Logs", icon: Activity },
];

function ClientPortalsContent() {
  const { toast } = useToast();
  const [portalTab, setPortalTab] = useState("my-portals");
  const [sortBy, setSortBy] = useState("newest");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap p-4 border-b">
        <Tabs value={portalTab} onValueChange={setPortalTab}>
          <TabsList>
            <TabsTrigger value="my-portals" data-testid="tab-my-portals">
              My client portals
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all-portals">
              All
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" data-testid="button-filter-portals">
            <Filter className="h-4 w-4" />
          </Button>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[130px]" data-testid="select-sort-portals">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="recently-updated">Recently updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-6">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <Globe className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold" data-testid="text-portals-empty-title">
              No client portals found
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-portals-empty-description">
              Share a message, document, bill or calendar event with your clients on a matter via VeriCase for Clients.
            </p>
          </div>
          <Button data-testid="button-new-client-portal" onClick={() => toast({ title: "Client Portal", description: "Configure client portal settings in the Client Portal Management section." })}>
            <Plus className="h-4 w-4 mr-2" />
            New client portal
          </Button>
        </div>
      </div>

      <div className="border-t px-4 py-3 flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground" data-testid="text-portals-pagination">
          No results found
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" disabled data-testid="button-portals-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled data-testid="button-portals-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TextMessagesContent() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [composeMessage, setComposeMessage] = useState("");

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold" data-testid="text-messages-title">Text Messages</h2>
          <Button data-testid="button-compose-text" onClick={() => toast({ title: "Text Messaging", description: "Configure Twilio SMS integration in Settings to enable text messaging." })}>
            <Plus className="h-4 w-4 mr-2" />
            Compose
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-text-messages"
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-6">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold" data-testid="text-messages-empty-title">
              No text messages
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-messages-empty-description">
              Send and receive text messages directly from VeriCase. Keep all client communications in one place.
            </p>
          </div>
          <Button data-testid="button-send-first-text" onClick={() => toast({ title: "Text Messaging", description: "Configure Twilio SMS integration in Settings to enable text messaging." })}>
            <Send className="h-4 w-4 mr-2" />
            Send your first message
          </Button>
        </div>
      </div>

      <div className="border-t px-4 py-3 flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground" data-testid="text-messages-pagination">
          No results found
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" disabled data-testid="button-messages-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled data-testid="button-messages-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function InternalMessagesContent() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold" data-testid="text-internal-title">Internal Messages</h2>
          <Button data-testid="button-compose-internal" onClick={() => toast({ title: "Internal Messaging", description: "Create internal messages to communicate securely with your team." })}>
            <Plus className="h-4 w-4 mr-2" />
            New Message
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search internal messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-internal-messages"
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-6">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold" data-testid="text-internal-empty-title">
              No internal messages
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-internal-empty-description">
              Communicate securely with your team. Internal messages stay private and are linked to matters for easy reference.
            </p>
          </div>
          <Button data-testid="button-start-internal-conversation" onClick={() => toast({ title: "Internal Messaging", description: "Create internal messages to communicate securely with your team." })}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Start a conversation
          </Button>
        </div>
      </div>

      <div className="border-t px-4 py-3 flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground" data-testid="text-internal-pagination">
          No results found
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" disabled data-testid="button-internal-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled data-testid="button-internal-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function LogsContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [logType, setLogType] = useState("all");
  const [dateRange, setDateRange] = useState("all-time");

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className="text-lg font-semibold" data-testid="text-logs-title">Communication Logs</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-logs"
            />
          </div>
          <Select value={logType} onValueChange={setLogType}>
            <SelectTrigger className="w-full md:w-[150px]" data-testid="select-log-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phone">Phone call</SelectItem>
              <SelectItem value="text">Text message</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="document">Document</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-full md:w-[150px]" data-testid="select-log-date-range">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this-week">This week</SelectItem>
              <SelectItem value="this-month">This month</SelectItem>
              <SelectItem value="last-30-days">Last 30 days</SelectItem>
              <SelectItem value="last-90-days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md space-y-6">
          <div className="mx-auto w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <Activity className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold" data-testid="text-logs-empty-title">
              No communication logs
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-logs-empty-description">
              Communication logs will appear here as you send emails, make phone calls, exchange messages, and interact with clients through VeriCase.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t px-4 py-3 flex items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground" data-testid="text-logs-pagination">
          No results found
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" disabled data-testid="button-logs-prev">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" disabled data-testid="button-logs-next">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CommunicationsPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState<NavSection>("portals");
  const [showNav, setShowNav] = useState(true);

  const handleNavSelect = (section: NavSection) => {
    setActiveSection(section);
    if (isMobile) setShowNav(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "portals":
        return <ClientPortalsContent />;
      case "text-messages":
        return <TextMessagesContent />;
      case "internal-messages":
        return <InternalMessagesContent />;
      case "logs":
        return <LogsContent />;
      default:
        return <ClientPortalsContent />;
    }
  };

  const navVisible = isMobile ? showNav : true;
  const contentVisible = isMobile ? !showNav : true;

  return (
    <div className="flex flex-col h-full" data-testid="communications-page">
      <div className="border-b px-3 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-2">
          {isMobile && !showNav && (
            <Button variant="ghost" size="icon" onClick={() => setShowNav(true)} data-testid="button-open-comm-nav">
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold" data-testid="text-page-title">Communications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage client portals, messages, and communication logs
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {navVisible && (
        <div className={`${isMobile ? "w-full" : "w-56"} border-r flex flex-col bg-muted/30 shrink-0`}>
          <div className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="w-full" data-testid="button-new-communication">
                  <Plus className="h-4 w-4 mr-2" />
                  New
                  <ChevronDown className="h-3.5 w-3.5 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem data-testid="menu-item-new-portal" onClick={() => { handleNavSelect("portals"); toast({ title: "Client Portal", description: "Configure client portal settings in the Client Portal Management section." }); }}>
                  <Globe className="h-4 w-4 mr-2" />
                  Client portal
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-new-text" onClick={() => { handleNavSelect("text-messages"); toast({ title: "Text Messaging", description: "Configure Twilio SMS integration in Settings to enable text messaging." }); }}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Text message
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-new-internal" onClick={() => { handleNavSelect("internal-messages"); toast({ title: "Internal Messaging", description: "Create internal messages to communicate securely with your team." }); }}>
                  <Users className="h-4 w-4 mr-2" />
                  Internal message
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-new-email" onClick={() => toast({ title: "Email", description: "Connect your email account in Settings to send and receive emails." })}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-item-log-call" onClick={() => toast({ title: "Phone Call Logged", description: "Call logging will be available after configuring your communications integration." })}>
                  <Phone className="h-4 w-4 mr-2" />
                  Log a phone call
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Separator />

          <ScrollArea className="flex-1">
            <nav className="p-2 space-y-0.5" data-testid="nav-communications">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-2"
                    onClick={() => handleNavSelect(item.id)}
                    data-testid={`nav-item-${item.id}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Button>
                );
              })}
            </nav>
          </ScrollArea>
        </div>
        )}

        {contentVisible && (
        <div className="flex-1 flex flex-col min-w-0">
          {renderContent()}
        </div>
        )}
      </div>
    </div>
  );
}
