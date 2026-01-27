import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Briefcase,
  Plus,
  Search,
  Users,
  Calendar,
  FileText,
  MessageSquare,
  Clock,
  Scale,
  User,
  Building2,
  Phone,
  Mail,
  ExternalLink,
  Loader2,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Pause,
  Archive,
  MoreHorizontal,
  Edit,
  Trash2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  name: string;
  type: "individual" | "business";
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

interface Matter {
  id: string;
  clientId: string;
  name: string;
  caseNumber: string;
  matterType: string;
  status: "active" | "pending" | "on_hold" | "closed" | "archived";
  description: string;
  practiceArea: string;
  responsibleAttorney?: string;
  openedDate: string;
  closeDate?: string;
  createdAt: string;
}

interface MatterContact {
  id: string;
  matterId: string;
  name: string;
  role: string;
  organization?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

interface Thread {
  id: string;
  matterId: string;
  subject: string;
  status: "active" | "resolved" | "archived";
  participants: string[];
  createdAt: string;
  updatedAt: string;
}

interface TimelineEvent {
  id: string;
  matterId: string;
  title: string;
  description: string;
  eventType: string;
  eventDate: string;
  createdAt: string;
}

const STATUS_CONFIG = {
  active: { label: "Active", color: "bg-green-500", icon: CheckCircle2 },
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  on_hold: { label: "On Hold", color: "bg-orange-500", icon: Pause },
  closed: { label: "Closed", color: "bg-gray-500", icon: Archive },
  archived: { label: "Archived", color: "bg-gray-400", icon: Archive },
};

const PRACTICE_AREAS = [
  "Civil Litigation",
  "Criminal Defense",
  "Family Law",
  "Corporate Law",
  "Real Estate",
  "Intellectual Property",
  "Employment Law",
  "Immigration",
  "Personal Injury",
  "Estate Planning",
  "Bankruptcy",
  "Tax Law",
  "Other",
];

export default function MattersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [showAddThreadDialog, setShowAddThreadDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  const [matterForm, setMatterForm] = useState({
    clientId: "",
    name: "",
    caseNumber: "",
    matterType: "",
    description: "",
    practiceArea: "",
    responsibleAttorney: "",
  });

  const [contactForm, setContactForm] = useState({
    name: "",
    role: "",
    organization: "",
    email: "",
    phone: "",
    notes: "",
  });

  const [threadForm, setThreadForm] = useState({
    subject: "",
    participants: "",
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: matters = [], isLoading } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: contacts = [] } = useQuery<MatterContact[]>({
    queryKey: ["/api/matters", selectedMatter?.id, "contacts"],
    enabled: !!selectedMatter,
  });

  const { data: threads = [] } = useQuery<Thread[]>({
    queryKey: ["/api/matters", selectedMatter?.id, "threads"],
    enabled: !!selectedMatter,
  });

  const { data: timeline = [] } = useQuery<TimelineEvent[]>({
    queryKey: ["/api/matters", selectedMatter?.id, "timeline"],
    enabled: !!selectedMatter,
  });

  const createMatterMutation = useMutation({
    mutationFn: async (data: typeof matterForm) => {
      const res = await apiRequest("POST", "/api/matters", {
        clientId: data.clientId,
        name: data.name,
        caseNumber: data.caseNumber || `CASE-${Date.now().toString(36).toUpperCase()}`,
        matterType: data.matterType,
        status: "active",
        description: data.description,
        practiceArea: data.practiceArea,
        responsibleAttorney: data.responsibleAttorney || undefined,
        openedDate: new Date().toISOString().split("T")[0],
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters"] });
      setShowCreateDialog(false);
      setMatterForm({ clientId: "", name: "", caseNumber: "", matterType: "", description: "", practiceArea: "", responsibleAttorney: "" });
      toast({ title: "Matter created", description: "New matter has been opened." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create matter.", variant: "destructive" });
    }
  });

  const updateMatterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Matter> }) => {
      const res = await apiRequest("PATCH", `/api/matters/${id}`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters"] });
      setSelectedMatter(data);
      toast({ title: "Matter updated", description: "Changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update matter.", variant: "destructive" });
    }
  });

  const createContactMutation = useMutation({
    mutationFn: async (data: typeof contactForm) => {
      const res = await apiRequest("POST", `/api/matters/${selectedMatter?.id}/contacts`, {
        matterId: selectedMatter?.id,
        name: data.name,
        role: data.role,
        organization: data.organization || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        notes: data.notes || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatter?.id, "contacts"] });
      setShowAddContactDialog(false);
      setContactForm({ name: "", role: "", organization: "", email: "", phone: "", notes: "" });
      toast({ title: "Contact added", description: "New contact has been added to the matter." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add contact.", variant: "destructive" });
    }
  });

  const createThreadMutation = useMutation({
    mutationFn: async (data: typeof threadForm) => {
      const res = await apiRequest("POST", `/api/matters/${selectedMatter?.id}/threads`, {
        matterId: selectedMatter?.id,
        subject: data.subject,
        status: "active",
        participants: data.participants.split(",").map(p => p.trim()).filter(Boolean),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters", selectedMatter?.id, "threads"] });
      setShowAddThreadDialog(false);
      setThreadForm({ subject: "", participants: "" });
      toast({ title: "Thread created", description: "New discussion thread has been started." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create thread.", variant: "destructive" });
    }
  });

  const filteredMatters = matters.filter(matter => {
    const matchesSearch = matter.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         matter.caseNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || matter.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || "Unknown Client";
  };

  return (
    <div className="h-full flex" data-testid="page-matters">
      <div className="flex-1 flex flex-col border-r">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Matters</h1>
              <p className="text-muted-foreground">Manage cases and legal matters</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-matter">
                  <Plus className="h-4 w-4 mr-2" />
                  New Matter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Matter</DialogTitle>
                  <DialogDescription>Open a new case or matter for a client.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select 
                      value={matterForm.clientId} 
                      onValueChange={v => setMatterForm(p => ({ ...p, clientId: v }))}
                    >
                      <SelectTrigger data-testid="select-client">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Matter Name</Label>
                      <Input 
                        value={matterForm.name}
                        onChange={e => setMatterForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g., Estate Planning"
                        data-testid="input-matter-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Case Number (optional)</Label>
                      <Input 
                        value={matterForm.caseNumber}
                        onChange={e => setMatterForm(p => ({ ...p, caseNumber: e.target.value }))}
                        placeholder="Auto-generated if empty"
                        data-testid="input-case-number"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Practice Area</Label>
                      <Select 
                        value={matterForm.practiceArea} 
                        onValueChange={v => setMatterForm(p => ({ ...p, practiceArea: v }))}
                      >
                        <SelectTrigger data-testid="select-practice-area">
                          <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                        <SelectContent>
                          {PRACTICE_AREAS.map(area => (
                            <SelectItem key={area} value={area}>{area}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Matter Type</Label>
                      <Input 
                        value={matterForm.matterType}
                        onChange={e => setMatterForm(p => ({ ...p, matterType: e.target.value }))}
                        placeholder="e.g., Consultation, Litigation"
                        data-testid="input-matter-type"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Responsible Attorney</Label>
                    <Input 
                      value={matterForm.responsibleAttorney}
                      onChange={e => setMatterForm(p => ({ ...p, responsibleAttorney: e.target.value }))}
                      placeholder="Name of lead attorney"
                      data-testid="input-attorney"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea 
                      value={matterForm.description}
                      onChange={e => setMatterForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description of the matter..."
                      data-testid="input-description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => createMatterMutation.mutate(matterForm)}
                    disabled={!matterForm.name || !matterForm.clientId || createMatterMutation.isPending}
                    data-testid="button-submit-matter"
                  >
                    {createMatterMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Matter
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search matters..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredMatters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No matters found</p>
              </div>
            ) : (
              filteredMatters.map(matter => {
                const StatusIcon = STATUS_CONFIG[matter.status]?.icon || CheckCircle2;
                const isSelected = selectedMatter?.id === matter.id;
                
                return (
                  <Card 
                    key={matter.id} 
                    className={`cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : "hover-elevate"}`}
                    onClick={() => setSelectedMatter(matter)}
                    data-testid={`matter-card-${matter.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{matter.name}</h3>
                            <Badge variant="outline" className="text-xs shrink-0">
                              {matter.caseNumber}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {getClientName(matter.clientId)} • {matter.practiceArea}
                          </p>
                        </div>
                        <Badge 
                          variant="secondary"
                          className={`shrink-0 ${STATUS_CONFIG[matter.status]?.color} text-white`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[matter.status]?.label}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="w-[500px] flex flex-col">
        {selectedMatter ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold">{selectedMatter.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedMatter.caseNumber} • {getClientName(selectedMatter.clientId)}
                  </p>
                </div>
                <Select 
                  value={selectedMatter.status}
                  onValueChange={v => updateMatterMutation.mutate({ id: selectedMatter.id, data: { status: v as any } })}
                >
                  <SelectTrigger className="w-[120px]" data-testid="select-matter-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-2">
                <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                <TabsTrigger value="contacts" data-testid="tab-contacts">Contacts</TabsTrigger>
                <TabsTrigger value="threads" data-testid="tab-threads">Threads</TabsTrigger>
                <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <TabsContent value="overview" className="p-4 space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Practice Area</Label>
                      <p className="font-medium">{selectedMatter.practiceArea || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Matter Type</Label>
                      <p className="font-medium">{selectedMatter.matterType || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Responsible Attorney</Label>
                      <p className="font-medium">{selectedMatter.responsibleAttorney || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Open Date</Label>
                      <p className="font-medium">{new Date(selectedMatter.openedDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm">{selectedMatter.description || "No description provided."}</p>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-2xl font-bold">{contacts.length}</p>
                        <p className="text-xs text-muted-foreground">Contacts</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <MessageSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-2xl font-bold">{threads.length}</p>
                        <p className="text-xs text-muted-foreground">Threads</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-2xl font-bold">{timeline.length}</p>
                        <p className="text-xs text-muted-foreground">Events</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="contacts" className="p-4 space-y-4 mt-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Matter Contacts</h3>
                    <Dialog open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-contact">
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Contact</DialogTitle>
                          <DialogDescription>Add a contact related to this matter.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Name</Label>
                              <Input 
                                value={contactForm.name}
                                onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                                data-testid="input-contact-name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Role</Label>
                              <Select 
                                value={contactForm.role}
                                onValueChange={v => setContactForm(p => ({ ...p, role: v }))}
                              >
                                <SelectTrigger data-testid="select-contact-role">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="plaintiff">Plaintiff</SelectItem>
                                  <SelectItem value="defendant">Defendant</SelectItem>
                                  <SelectItem value="witness">Witness</SelectItem>
                                  <SelectItem value="expert">Expert</SelectItem>
                                  <SelectItem value="opposing-counsel">Opposing Counsel</SelectItem>
                                  <SelectItem value="judge">Judge</SelectItem>
                                  <SelectItem value="client">Client</SelectItem>
                                  <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Organization</Label>
                            <Input 
                              value={contactForm.organization}
                              onChange={e => setContactForm(p => ({ ...p, organization: e.target.value }))}
                              data-testid="input-contact-org"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input 
                                type="email"
                                value={contactForm.email}
                                onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                                data-testid="input-contact-email"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Phone</Label>
                              <Input 
                                value={contactForm.phone}
                                onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))}
                                data-testid="input-contact-phone"
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={() => createContactMutation.mutate(contactForm)}
                            disabled={!contactForm.name || !contactForm.role || createContactMutation.isPending}
                            data-testid="button-submit-contact"
                          >
                            {createContactMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Add Contact
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {contacts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No contacts yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map(contact => (
                        <Card key={contact.id} data-testid={`contact-card-${contact.id}`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{contact.name}</p>
                                <p className="text-sm text-muted-foreground">{contact.role}</p>
                                {contact.organization && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                    <Building2 className="h-3 w-3" />
                                    {contact.organization}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                {contact.email && (
                                  <span className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {contact.email}
                                  </span>
                                )}
                                {contact.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {contact.phone}
                                  </span>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="threads" className="p-4 space-y-4 mt-0">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Discussion Threads</h3>
                    <Dialog open={showAddThreadDialog} onOpenChange={setShowAddThreadDialog}>
                      <DialogTrigger asChild>
                        <Button size="sm" data-testid="button-add-thread">
                          <Plus className="h-4 w-4 mr-1" />
                          New Thread
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Start New Thread</DialogTitle>
                          <DialogDescription>Create a discussion thread for this matter.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Subject</Label>
                            <Input 
                              value={threadForm.subject}
                              onChange={e => setThreadForm(p => ({ ...p, subject: e.target.value }))}
                              placeholder="Thread subject..."
                              data-testid="input-thread-subject"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Participants (comma-separated)</Label>
                            <Input 
                              value={threadForm.participants}
                              onChange={e => setThreadForm(p => ({ ...p, participants: e.target.value }))}
                              placeholder="John, Jane, Mike"
                              data-testid="input-thread-participants"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button 
                            onClick={() => createThreadMutation.mutate(threadForm)}
                            disabled={!threadForm.subject || createThreadMutation.isPending}
                            data-testid="button-submit-thread"
                          >
                            {createThreadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Thread
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {threads.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No threads yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {threads.map(thread => (
                        <Card key={thread.id} className="hover-elevate cursor-pointer" data-testid={`thread-card-${thread.id}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{thread.subject}</p>
                                <p className="text-xs text-muted-foreground">
                                  {thread.participants.length} participants • {new Date(thread.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant={thread.status === "active" ? "default" : "secondary"}>
                                {thread.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="timeline" className="p-4 space-y-4 mt-0">
                  <h3 className="font-semibold">Timeline</h3>
                  
                  {timeline.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No timeline events</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-4">
                        {timeline.map(event => (
                          <div key={event.id} className="relative pl-10" data-testid={`timeline-event-${event.id}`}>
                            <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary" />
                            <Card>
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium">{event.title}</p>
                                    <p className="text-sm text-muted-foreground">{event.description}</p>
                                  </div>
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {new Date(event.eventDate).toLocaleDateString()}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-lg font-medium mb-1">Select a Matter</h2>
              <p className="text-sm">Choose a matter to view its details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
