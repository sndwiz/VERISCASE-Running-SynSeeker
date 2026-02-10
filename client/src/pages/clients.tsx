import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users,
  Plus,
  Search,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Loader2,
  Edit,
  Trash2,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Search as SearchIcon,
  LayoutGrid,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/use-workspace";

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
  status: string;
  practiceArea: string;
}

const PRACTICE_AREAS = [
  "Civil Litigation", "Criminal Defense", "Family Law", "Corporate Law",
  "Real Estate", "Intellectual Property", "Employment Law", "Immigration",
  "Personal Injury", "Estate Planning", "Bankruptcy", "Tax Law", "Other",
];

const MATTER_TYPES = [
  "Consultation", "Litigation", "Transaction", "Administrative",
  "Regulatory", "Criminal Defense", "Civil Litigation", "Insurance Litigation", "Other",
];

export default function ClientsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { activeWorkspaceId } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNextStepDialog, setShowNextStepDialog] = useState(false);
  const [showQuickMatterDialog, setShowQuickMatterDialog] = useState(false);
  const [showMatterSuccessDialog, setShowMatterSuccessDialog] = useState(false);
  const [newlyCreatedClient, setNewlyCreatedClient] = useState<Client | null>(null);
  const [newlyCreatedMatter, setNewlyCreatedMatter] = useState<Matter | null>(null);
  
  const [clientForm, setClientForm] = useState({
    name: "",
    type: "individual" as "individual" | "business",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const [matterForm, setMatterForm] = useState({
    name: "",
    matterType: "",
    practiceArea: "",
    description: "",
    caseNumber: "",
  });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: allMatters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const clientMatters = allMatters.filter(m => m.clientId === selectedClient?.id);

  const createClientMutation = useMutation({
    mutationFn: async (data: typeof clientForm) => {
      const res = await apiRequest("POST", "/api/clients", {
        name: data.name,
        type: data.type,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
      });
      return res.json();
    },
    onSuccess: (data: Client) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowCreateDialog(false);
      setClientForm({ name: "", type: "individual", email: "", phone: "", address: "", notes: "" });
      setNewlyCreatedClient(data);
      setSelectedClient(data);
      toast({ title: "Client created", description: `${data.name} has been added.` });
      setShowNextStepDialog(true);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create client.", variant: "destructive" });
    }
  });

  const createMatterMutation = useMutation({
    mutationFn: async (data: typeof matterForm & { clientId: string }) => {
      const res = await apiRequest("POST", "/api/matters", {
        clientId: data.clientId,
        name: data.name,
        caseNumber: data.caseNumber || `CASE-${Date.now().toString(36).toUpperCase()}`,
        matterType: data.matterType || "Consultation",
        status: "active",
        description: data.description,
        practiceArea: data.practiceArea,
        openedDate: new Date().toISOString().split("T")[0],
        workspaceId: activeWorkspaceId,
      });
      return res.json();
    },
    onSuccess: (data: Matter) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      setShowQuickMatterDialog(false);
      setMatterForm({ name: "", matterType: "", practiceArea: "", description: "", caseNumber: "" });
      setNewlyCreatedMatter(data);
      toast({ title: "Matter created", description: `${data.name} has been opened with a case board.` });
      setShowMatterSuccessDialog(true);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create matter.", variant: "destructive" });
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      const res = await apiRequest("PATCH", `/api/clients/${id}`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setSelectedClient(data);
      setShowEditDialog(false);
      toast({ title: "Client updated", description: "Changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update client.", variant: "destructive" });
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setSelectedClient(null);
      toast({ title: "Client deleted", description: "Client has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete client.", variant: "destructive" });
    }
  });

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (client.email?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === "all" || client.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openEditDialog = () => {
    if (selectedClient) {
      setClientForm({
        name: selectedClient.name,
        type: selectedClient.type,
        email: selectedClient.email || "",
        phone: selectedClient.phone || "",
        address: selectedClient.address || "",
        notes: selectedClient.notes || "",
      });
      setShowEditDialog(true);
    }
  };

  const handleStartMatter = () => {
    setShowNextStepDialog(false);
    setMatterForm({ name: "", matterType: "", practiceArea: "", description: "", caseNumber: "" });
    setShowQuickMatterDialog(true);
  };

  const handleOpenCaseBoard = async () => {
    setShowMatterSuccessDialog(false);
    if (newlyCreatedMatter) {
      try {
        const res = await fetch("/api/boards");
        const boards = await res.json();
        const matterBoard = boards.find((b: any) => b.matterId === newlyCreatedMatter.id && !b.name.includes(" - "));
        if (matterBoard) {
          setLocation(`/boards/${matterBoard.id}`);
        } else {
          setLocation(`/matters/${newlyCreatedMatter.id}`);
        }
      } catch {
        setLocation(`/matters/${newlyCreatedMatter.id}`);
      }
    }
  };

  const handleOpenDetectiveBoard = () => {
    setShowMatterSuccessDialog(false);
    if (newlyCreatedMatter) {
      setLocation(`/detective?matterId=${newlyCreatedMatter.id}`);
    }
  };

  const handleOpenMatterDetail = () => {
    setShowMatterSuccessDialog(false);
    if (newlyCreatedMatter) {
      setLocation(`/matters/${newlyCreatedMatter.id}`);
    }
  };

  return (
    <div className="h-full flex" data-testid="page-clients">
      <div className="flex-1 flex flex-col border-r">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Clients</h1>
              <p className="text-muted-foreground">Manage client information and relationships</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-client">
                  <Plus className="h-4 w-4 mr-2" />
                  New Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Client</DialogTitle>
                  <DialogDescription>Enter client information to create a new record.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input 
                        value={clientForm.name}
                        onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Client name"
                        data-testid="input-client-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select 
                        value={clientForm.type} 
                        onValueChange={v => setClientForm(p => ({ ...p, type: v as any }))}
                      >
                        <SelectTrigger data-testid="select-client-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="business">Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input 
                        type="email"
                        value={clientForm.email}
                        onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="email@example.com"
                        data-testid="input-client-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input 
                        value={clientForm.phone}
                        onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                        data-testid="input-client-phone"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input 
                      value={clientForm.address}
                      onChange={e => setClientForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="Street, City, State"
                      data-testid="input-client-address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea 
                      value={clientForm.notes}
                      onChange={e => setClientForm(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Additional notes..."
                      data-testid="input-client-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={() => createClientMutation.mutate(clientForm)}
                    disabled={!clientForm.name || createClientMutation.isPending}
                    data-testid="button-submit-client"
                  >
                    {createClientMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Client
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search clients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="business">Business</SelectItem>
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
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No clients found</p>
              </div>
            ) : (
              filteredClients.map(client => {
                const isSelected = selectedClient?.id === client.id;
                const matterCount = allMatters.filter(m => m.clientId === client.id).length;
                
                return (
                  <Card 
                    key={client.id} 
                    className={`cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : "hover-elevate"}`}
                    onClick={() => setSelectedClient(client)}
                    data-testid={`client-card-${client.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                            {client.type === "business" ? (
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{client.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {client.email || "No email"} {matterCount > 0 && <>· {matterCount} matter{matterCount !== 1 ? "s" : ""}</>}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          {client.type === "business" ? "Business" : "Individual"}
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

      <div className="w-[400px] flex flex-col">
        {selectedClient ? (
          <>
            <div className="p-4 border-b">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    {selectedClient.type === "business" ? (
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{selectedClient.name}</h2>
                    <Badge variant="outline" className="mt-1">
                      {selectedClient.type === "business" ? "Business" : "Individual"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={openEditDialog} data-testid="button-edit-client">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this client?")) {
                        deleteClientMutation.mutate(selectedClient.id);
                      }
                    }}
                    data-testid="button-delete-client"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Info</h3>
                  
                  {selectedClient.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedClient.email}</span>
                    </div>
                  )}
                  
                  {selectedClient.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedClient.phone}</span>
                    </div>
                  )}
                  
                  {selectedClient.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedClient.address}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Client since {new Date(selectedClient.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {selectedClient.notes && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Notes</h3>
                    <p className="text-sm">{selectedClient.notes}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Matters ({clientMatters.length})</h3>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        if (selectedClient) {
                          setNewlyCreatedClient(selectedClient);
                          setMatterForm({ name: "", matterType: "", practiceArea: "", description: "", caseNumber: "" });
                          setShowQuickMatterDialog(true);
                        }
                      }}
                      disabled={!selectedClient}
                      data-testid="button-add-matter-for-client"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Matter
                    </Button>
                  </div>
                  
                  {clientMatters.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No matters for this client</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {clientMatters.map(matter => (
                        <Card key={matter.id} data-testid={`client-matter-${matter.id}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{matter.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {matter.caseNumber} · {matter.practiceArea}
                                </p>
                              </div>
                              <Badge variant={matter.status === "active" ? "default" : "secondary"}>
                                {matter.status}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h2 className="text-lg font-medium mb-1">Select a Client</h2>
              <p className="text-sm">Choose a client to view their details</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>Update client information.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={clientForm.name}
                  onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))}
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={clientForm.type} 
                  onValueChange={v => setClientForm(p => ({ ...p, type: v as any }))}
                >
                  <SelectTrigger data-testid="select-edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={clientForm.email}
                  onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))}
                  data-testid="input-edit-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={clientForm.phone}
                  onChange={e => setClientForm(p => ({ ...p, phone: e.target.value }))}
                  data-testid="input-edit-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input 
                value={clientForm.address}
                onChange={e => setClientForm(p => ({ ...p, address: e.target.value }))}
                data-testid="input-edit-address"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea 
                value={clientForm.notes}
                onChange={e => setClientForm(p => ({ ...p, notes: e.target.value }))}
                data-testid="input-edit-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => selectedClient && updateClientMutation.mutate({ id: selectedClient.id, data: clientForm })}
              disabled={!clientForm.name || updateClientMutation.isPending}
              data-testid="button-save-client"
            >
              {updateClientMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNextStepDialog} onOpenChange={setShowNextStepDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client Created Successfully</DialogTitle>
            <DialogDescription>
              {newlyCreatedClient?.name} has been added. What would you like to do next?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Step 1 of 3: Client created</span>
            </div>
            <Button 
              className="w-full justify-start gap-3" 
              onClick={handleStartMatter}
              data-testid="button-next-create-matter"
            >
              <Briefcase className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Open a Matter</div>
                <div className="text-xs opacity-80">Create a case or matter for this client</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => setShowNextStepDialog(false)}
              data-testid="button-skip-matter"
            >
              <Users className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Stay on Clients</div>
                <div className="text-xs opacity-80">Continue managing client details</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuickMatterDialog} onOpenChange={setShowQuickMatterDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Matter for {newlyCreatedClient?.name}</DialogTitle>
            <DialogDescription>Open a new case or matter for this client.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Step 2 of 3: Open a matter</span>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Matter Name</Label>
                <Input
                  value={matterForm.name}
                  onChange={e => setMatterForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g., Personal Injury Claim"
                  data-testid="input-quick-matter-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Case Number (optional)</Label>
                <Input
                  value={matterForm.caseNumber}
                  onChange={e => setMatterForm(p => ({ ...p, caseNumber: e.target.value }))}
                  placeholder="Auto-generated if empty"
                  data-testid="input-quick-case-number"
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
                  <SelectTrigger data-testid="select-quick-practice-area">
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
                <Select
                  value={matterForm.matterType}
                  onValueChange={v => setMatterForm(p => ({ ...p, matterType: v }))}
                >
                  <SelectTrigger data-testid="select-quick-matter-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MATTER_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={matterForm.description}
                onChange={e => setMatterForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of the matter..."
                data-testid="input-quick-matter-description"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowQuickMatterDialog(false)}
              data-testid="button-cancel-quick-matter"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (newlyCreatedClient) {
                  createMatterMutation.mutate({ ...matterForm, clientId: newlyCreatedClient.id });
                }
              }}
              disabled={!matterForm.name || !matterForm.practiceArea || createMatterMutation.isPending}
              data-testid="button-submit-quick-matter"
            >
              {createMatterMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Matter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMatterSuccessDialog} onOpenChange={setShowMatterSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Matter Created Successfully</DialogTitle>
            <DialogDescription>
              {newlyCreatedMatter?.name} has been opened with a case board. What would you like to do next?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Step 3 of 3: Start investigating</span>
            </div>
            <Button 
              className="w-full justify-start gap-3"
              onClick={handleOpenCaseBoard}
              data-testid="button-open-case-board"
            >
              <LayoutGrid className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Open Case Board</div>
                <div className="text-xs opacity-80">Start adding tasks, filings, and evidence to the board</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button 
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleOpenDetectiveBoard}
              data-testid="button-open-detective-board"
            >
              <SearchIcon className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Open Detective Board</div>
                <div className="text-xs opacity-80">Start building your investigation board for this case</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={handleOpenMatterDetail}
              data-testid="button-open-matter-detail"
            >
              <Briefcase className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">View Matter Details</div>
                <div className="text-xs opacity-80">Add documents, contacts, and timeline events</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-3"
              onClick={() => setShowMatterSuccessDialog(false)}
              data-testid="button-stay-clients"
            >
              <Users className="h-4 w-4" />
              <div className="text-left">
                <div className="font-medium">Stay on Clients</div>
                <div className="text-xs opacity-80">Continue managing client details</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
