import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  MoreHorizontal,
  Calendar
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
  status: string;
  practiceArea: string;
}

export default function ClientsPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const [clientForm, setClientForm] = useState({
    name: "",
    type: "individual" as "individual" | "business",
    email: "",
    phone: "",
    address: "",
    notes: "",
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setShowCreateDialog(false);
      setClientForm({ name: "", type: "individual", email: "", phone: "", address: "", notes: "" });
      toast({ title: "Client created", description: "New client has been added." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create client.", variant: "destructive" });
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
                              {client.email || "No email"} • {matterCount} matter{matterCount !== 1 ? "s" : ""}
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
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Matters ({clientMatters.length})</h3>
                  
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
                                  {matter.caseNumber} • {matter.practiceArea}
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
    </div>
  );
}
