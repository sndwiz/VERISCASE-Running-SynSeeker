import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Briefcase,
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Info,
  SlidersHorizontal,
  Columns3,
  Download,
  MoreVertical,
  Scale,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Client, TeamMember, Matter, MatterParty, TriggerDates, LitigationTemplateInfo } from "@/types/matters";
import { PRACTICE_AREAS, MATTER_TYPES, UTAH_COURTS, UTAH_JUDGES, MATTER_STATUSES } from "@/lib/matter-constants";
import { LitigationFormSection } from "@/components/matters/litigation-form";

const STATUS_TAB_MAP: Record<string, string[]> = {
  all: [],
  open: ["active"],
  pending: ["pending", "on_hold"],
  closed: ["closed", "archived"],
};

const PAGE_SIZE = 25;

type ColumnKey = "actions" | "matter" | "client" | "responsibleAttorney" | "practiceArea" | "status" | "caseNumber" | "openedDate" | "matterType" | "courtName" | "opposingCounsel" | "createdAt" | "updatedAt";

const ALL_COLUMNS: { key: ColumnKey; label: string; defaultVisible: boolean }[] = [
  { key: "actions", label: "Actions", defaultVisible: true },
  { key: "matter", label: "Matter", defaultVisible: true },
  { key: "client", label: "Client", defaultVisible: true },
  { key: "responsibleAttorney", label: "Responsible Attorney", defaultVisible: true },
  { key: "practiceArea", label: "Practice Area", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
  { key: "caseNumber", label: "Case Number", defaultVisible: false },
  { key: "openedDate", label: "Open Date", defaultVisible: true },
  { key: "matterType", label: "Matter Type", defaultVisible: false },
  { key: "courtName", label: "Court", defaultVisible: false },
  { key: "opposingCounsel", label: "Opposing Counsel", defaultVisible: false },
  { key: "createdAt", label: "Created", defaultVisible: false },
  { key: "updatedAt", label: "Updated", defaultVisible: false },
];

export default function MattersPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { activeWorkspaceId } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  );

  const [matterForm, setMatterForm] = useState({
    clientId: "",
    name: "",
    caseNumber: "",
    matterType: "",
    description: "",
    practiceArea: "",
    responsiblePartyId: "",
    assignedAttorneys: [] as string[],
    assignedParalegals: [] as string[],
    courtName: "",
    judgeAssigned: "",
    litigationTemplateId: "",
    venue: "",
    parties: [] as MatterParty[],
    claims: [] as string[],
    triggerDates: {} as TriggerDates,
  });
  const [showLitigationFields, setShowLitigationFields] = useState(false);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: matters = [], isLoading } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const { data: litigationTemplates = [] } = useQuery<LitigationTemplateInfo[]>({
    queryKey: ["/api/litigation-templates"],
  });

  const attorneys = teamMembers.filter(m => ["attorney", "partner", "associate", "of_counsel"].includes(m.role) && m.isActive);
  const paralegals = teamMembers.filter(m => m.role === "paralegal" && m.isActive);

  const defaultFormState = {
    clientId: "", name: "", caseNumber: "", matterType: "", description: "",
    practiceArea: "", responsiblePartyId: "", assignedAttorneys: [] as string[],
    assignedParalegals: [] as string[], courtName: "", judgeAssigned: "",
    litigationTemplateId: "", venue: "", parties: [] as MatterParty[],
    claims: [] as string[], triggerDates: {} as TriggerDates,
  };

  const createMatterMutation = useMutation({
    mutationFn: async (data: typeof matterForm) => {
      const hasNonEmptyTriggerDates = Object.values(data.triggerDates).some(v => v);
      const res = await apiRequest("POST", "/api/matters", {
        clientId: data.clientId,
        name: data.name,
        caseNumber: data.caseNumber || `CASE-${Date.now().toString(36).toUpperCase()}`,
        matterType: data.matterType || "Consultation",
        status: "active",
        description: data.description,
        practiceArea: data.practiceArea,
        responsiblePartyId: data.responsiblePartyId || undefined,
        assignedAttorneys: data.assignedAttorneys,
        assignedParalegals: data.assignedParalegals,
        courtName: data.courtName || undefined,
        judgeAssigned: data.judgeAssigned || undefined,
        openedDate: new Date().toISOString().split("T")[0],
        workspaceId: activeWorkspaceId,
        litigationTemplateId: data.litigationTemplateId || undefined,
        venue: data.venue || undefined,
        parties: data.parties.length > 0 ? data.parties : undefined,
        claims: data.claims.length > 0 ? data.claims : undefined,
        triggerDates: hasNonEmptyTriggerDates ? data.triggerDates : undefined,
      });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      setShowCreateDialog(false);
      setShowLitigationFields(false);
      setMatterForm(defaultFormState);
      const templateName = variables.litigationTemplateId
        ? litigationTemplates.find(t => t.id === variables.litigationTemplateId)?.name
        : undefined;
      toast({
        title: "Matter created",
        description: templateName
          ? `New matter opened with "${templateName}" workflow boards.`
          : "New matter has been opened.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create matter.", variant: "destructive" });
    }
  });

  const deleteMatterMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/matters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters"] });
      toast({ title: "Matter deleted" });
    },
  });

  const duplicateMatterMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/matters/${id}/duplicate`, { workspaceId: activeWorkspaceId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matters"] });
      queryClient.invalidateQueries({ queryKey: ["/api/boards"] });
      toast({ title: "Matter duplicated", description: "A copy of the matter has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to duplicate matter.", variant: "destructive" });
    },
  });

  const filteredMatters = useMemo(() => {
    let result = [...matters];

    const statusFilters = STATUS_TAB_MAP[activeTab];
    if (statusFilters && statusFilters.length > 0) {
      result = result.filter(m => statusFilters.includes(m.status));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.caseNumber?.toLowerCase().includes(q) ||
        getClientName(m.clientId).toLowerCase().includes(q) ||
        m.practiceArea?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [matters, activeTab, searchQuery, clients]);

  const totalPages = Math.ceil(filteredMatters.length / PAGE_SIZE);
  const paginatedMatters = filteredMatters.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const statusCounts = useMemo(() => ({
    all: matters.length,
    open: matters.filter(m => m.status === "active").length,
    pending: matters.filter(m => m.status === "pending" || m.status === "on_hold").length,
    closed: matters.filter(m => m.status === "closed" || m.status === "archived").length,
  }), [matters]);

  function getClientName(clientId: string) {
    return clients.find(c => c.id === clientId)?.name || "Unknown";
  }

  function getResponsiblePartyName(matter: Matter): string | null {
    if (matter.responsiblePartyId) {
      const member = teamMembers.find(tm => tm.id === matter.responsiblePartyId);
      if (member) {
        return `${member.firstName} ${member.lastName}`;
      }
    }
    if (matter.assignedAttorneys && matter.assignedAttorneys.length > 0) {
      return matter.assignedAttorneys[0];
    }
    return null;
  }

  function toggleColumn(key: ColumnKey) {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === paginatedMatters.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedMatters.map(m => m.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function formatMatterDisplay(matter: Matter): string {
    const client = clients.find(c => c.id === matter.clientId);
    const clientName = client?.name?.split(" ")[0] || "";
    return `${matter.caseNumber}-${clientName}: ${matter.name}`;
  }

  function formatDateTime(dateStr: string | undefined | null): string {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return "";
    }
  }

  return (
    <div className="flex flex-col h-full" data-testid="page-matters">
      <div className="flex items-center justify-between gap-3 flex-wrap p-4 border-b">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold" data-testid="text-matters-title">Matters</h1>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-matter">
              <Plus className="h-4 w-4 mr-2" />
              New Matter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Matter</DialogTitle>
              <DialogDescription>Open a new case or matter for a client.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label>Responsible Attorney</Label>
                  <Select
                    value={matterForm.responsiblePartyId}
                    onValueChange={v => setMatterForm(p => ({ ...p, responsiblePartyId: v }))}
                  >
                    <SelectTrigger data-testid="select-responsible-party">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map(member => (
                        <SelectItem key={member.id} value={member.id} data-testid={`option-team-member-${member.id}`}>
                          {member.firstName} {member.lastName} ({member.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Matter Name</Label>
                  <Input
                    value={matterForm.name}
                    onChange={e => setMatterForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Smith v. Jones"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <Select
                    value={matterForm.matterType}
                    onValueChange={v => setMatterForm(p => ({ ...p, matterType: v }))}
                  >
                    <SelectTrigger data-testid="select-matter-type">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Court</Label>
                  <Select
                    value={matterForm.courtName}
                    onValueChange={v => setMatterForm(p => ({ ...p, courtName: v }))}
                  >
                    <SelectTrigger data-testid="select-court">
                      <SelectValue placeholder="Select court" />
                    </SelectTrigger>
                    <SelectContent>
                      {UTAH_COURTS.map(court => (
                        <SelectItem key={court} value={court}>{court}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Judge Assigned</Label>
                  <Select
                    value={matterForm.judgeAssigned}
                    onValueChange={v => setMatterForm(p => ({ ...p, judgeAssigned: v }))}
                  >
                    <SelectTrigger data-testid="select-judge">
                      <SelectValue placeholder="Select judge" />
                    </SelectTrigger>
                    <SelectContent>
                      {UTAH_JUDGES.map(judge => (
                        <SelectItem key={judge} value={judge}>{judge}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Venue</Label>
                <Input
                  value={matterForm.venue}
                  onChange={e => setMatterForm(p => ({ ...p, venue: e.target.value }))}
                  placeholder="e.g., Salt Lake County, Utah"
                  data-testid="input-venue"
                />
              </div>

              {attorneys.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigned Attorneys</Label>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md" data-testid="select-attorneys">
                    {attorneys.map(atty => (
                      <label key={atty.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox
                          checked={matterForm.assignedAttorneys.includes(atty.id)}
                          onCheckedChange={(checked) => {
                            setMatterForm(p => ({
                              ...p,
                              assignedAttorneys: checked
                                ? [...p.assignedAttorneys, atty.id]
                                : p.assignedAttorneys.filter(id => id !== atty.id),
                            }));
                          }}
                          data-testid={`checkbox-attorney-${atty.id}`}
                        />
                        {atty.firstName} {atty.lastName}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {paralegals.length > 0 && (
                <div className="space-y-2">
                  <Label>Assigned Paralegals</Label>
                  <div className="flex flex-wrap gap-2 p-2 border rounded-md" data-testid="select-paralegals">
                    {paralegals.map(pl => (
                      <label key={pl.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox
                          checked={matterForm.assignedParalegals.includes(pl.id)}
                          onCheckedChange={(checked) => {
                            setMatterForm(p => ({
                              ...p,
                              assignedParalegals: checked
                                ? [...p.assignedParalegals, pl.id]
                                : p.assignedParalegals.filter(id => id !== pl.id),
                            }));
                          }}
                          data-testid={`checkbox-paralegal-${pl.id}`}
                        />
                        {pl.firstName} {pl.lastName}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={matterForm.description}
                  onChange={e => setMatterForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of the matter..."
                  data-testid="input-description"
                />
              </div>

              <LitigationFormSection
                formData={{
                  litigationTemplateId: matterForm.litigationTemplateId,
                  venue: matterForm.venue,
                  parties: matterForm.parties,
                  claims: matterForm.claims,
                  triggerDates: matterForm.triggerDates,
                }}
                onUpdate={updater => setMatterForm(p => {
                  const litData = updater({
                    litigationTemplateId: p.litigationTemplateId,
                    venue: p.venue,
                    parties: p.parties,
                    claims: p.claims,
                    triggerDates: p.triggerDates,
                  });
                  return { ...p, ...litData };
                })}
                templates={litigationTemplates}
                showLitigationFields={showLitigationFields}
                onToggle={setShowLitigationFields}
              />
            </div>
            <DialogFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
              {showLitigationFields && !matterForm.litigationTemplateId && (
                <p className="text-xs text-destructive">Please select a workflow template or hide the litigation section.</p>
              )}
              <Button
                onClick={() => createMatterMutation.mutate(matterForm)}
                disabled={
                  !matterForm.name ||
                  !matterForm.clientId ||
                  createMatterMutation.isPending ||
                  (showLitigationFields && !matterForm.litigationTemplateId)
                }
                data-testid="button-submit-matter"
              >
                {createMatterMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {matterForm.litigationTemplateId ? "Create Matter with Workflow" : "Create Matter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4 px-3 md:px-4 pt-3 pb-2 border-b">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(0); }}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({statusCounts.all})
            </TabsTrigger>
            <TabsTrigger value="open" data-testid="tab-open" className="text-primary data-[state=active]:text-primary">
              Open ({statusCounts.open})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({statusCounts.pending})
            </TabsTrigger>
            <TabsTrigger value="closed" data-testid="tab-closed">
              Closed ({statusCounts.closed})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by keyword"
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(0); }}
              className="pl-8 w-full md:w-[200px]"
              data-testid="input-search"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-columns">
                <Columns3 className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Columns</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_COLUMNS.filter(c => c.key !== "actions" && c.key !== "matter").map(col => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={visibleColumns.has(col.key)}
                  onCheckedChange={() => toggleColumn(col.key)}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-filters">
                <SlidersHorizontal className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Filters</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>Quick Filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { setActiveTab("open"); setCurrentPage(0); }}>
                Open matters only
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setActiveTab("pending"); setCurrentPage(0); }}>
                Pending matters
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setActiveTab("closed"); setCurrentPage(0); }}>
                Closed matters
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { setActiveTab("all"); setSearchQuery(""); setCurrentPage(0); }}>
                Clear all filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMatters.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No matters found</p>
            <p className="text-sm">
              {searchQuery ? "Try adjusting your search or filters" : "Create a new matter to get started"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={selectedIds.size === paginatedMatters.length && paginatedMatters.length > 0}
                    onCheckedChange={toggleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                {visibleColumns.has("actions") && (
                  <TableHead className="w-[100px]">Actions</TableHead>
                )}
                <TableHead className="min-w-[250px]">Matter</TableHead>
                {visibleColumns.has("client") && (
                  <TableHead>Client</TableHead>
                )}
                {visibleColumns.has("responsibleAttorney") && (
                  <TableHead>Responsible Atty</TableHead>
                )}
                {visibleColumns.has("practiceArea") && (
                  <TableHead>Practice Area</TableHead>
                )}
                {visibleColumns.has("status") && (
                  <TableHead>Status</TableHead>
                )}
                {visibleColumns.has("caseNumber") && (
                  <TableHead>Case Number</TableHead>
                )}
                {visibleColumns.has("openedDate") && (
                  <TableHead>Open Date</TableHead>
                )}
                {visibleColumns.has("matterType") && (
                  <TableHead>Matter Type</TableHead>
                )}
                {visibleColumns.has("courtName") && (
                  <TableHead>Court</TableHead>
                )}
                {visibleColumns.has("opposingCounsel") && (
                  <TableHead>Opposing Counsel</TableHead>
                )}
                {visibleColumns.has("createdAt") && (
                  <TableHead>Created</TableHead>
                )}
                {visibleColumns.has("updatedAt") && (
                  <TableHead>Updated</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMatters.map((matter) => (
                <TableRow
                  key={matter.id}
                  className="cursor-pointer"
                  data-testid={`matter-row-${matter.id}`}
                  onClick={() => setLocation(`/matters/${matter.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(matter.id)}
                      onCheckedChange={() => toggleSelect(matter.id)}
                      data-testid={`checkbox-matter-${matter.id}`}
                    />
                  </TableCell>
                  {visibleColumns.has("actions") && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" data-testid={`button-edit-${matter.id}`}>
                            Edit
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onSelect={() => setLocation(`/matters/${matter.id}`)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setLocation(`/matters/${matter.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Matter
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => duplicateMatterMutation.mutate(matter.id)}
                            data-testid={`button-duplicate-${matter.id}`}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onSelect={() => {
                              if (confirm("Are you sure you want to delete this matter?")) {
                                deleteMatterMutation.mutate(matter.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                  <TableCell>
                    <Link
                      href={`/matters/${matter.id}`}
                      className="text-primary hover:underline font-medium"
                      data-testid={`link-matter-${matter.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {formatMatterDisplay(matter)}
                    </Link>
                  </TableCell>
                  {visibleColumns.has("client") && (
                    <TableCell>
                      <span className="text-primary">{getClientName(matter.clientId)}</span>
                      <Info className="inline-block h-3.5 w-3.5 ml-1 text-muted-foreground" />
                    </TableCell>
                  )}
                  {visibleColumns.has("responsibleAttorney") && (
                    <TableCell data-testid={`text-responsible-party-${matter.id}`}>
                      {getResponsiblePartyName(matter) || <span className="text-muted-foreground">&mdash;</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("practiceArea") && (
                    <TableCell>
                      {matter.practiceArea || <span className="text-muted-foreground">&mdash;</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("status") && (
                    <TableCell>
                      <Badge variant={matter.status === "active" ? "default" : "secondary"}>
                        {matter.status === "active" ? "Open" : matter.status === "on_hold" ? "On Hold" : matter.status.charAt(0).toUpperCase() + matter.status.slice(1)}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.has("caseNumber") && (
                    <TableCell>
                      {matter.caseNumber || <span className="text-muted-foreground">&mdash;</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("openedDate") && (
                    <TableCell>
                      {matter.openedDate ? new Date(matter.openedDate).toLocaleDateString() : <span className="text-muted-foreground">&mdash;</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("matterType") && (
                    <TableCell>
                      {matter.matterType || <span className="text-muted-foreground">&mdash;</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("courtName") && (
                    <TableCell>
                      {matter.courtName || <span className="text-muted-foreground">&mdash;</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("opposingCounsel") && (
                    <TableCell>
                      {matter.opposingCounsel || <span className="text-muted-foreground">&mdash;</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("createdAt") && (
                    <TableCell data-testid={`text-created-at-${matter.id}`}>
                      {formatDateTime(matter.createdAt) || <span className="text-muted-foreground">&mdash;</span>}
                    </TableCell>
                  )}
                  {visibleColumns.has("updatedAt") && (
                    <TableCell data-testid={`text-updated-at-${matter.id}`}>
                      {formatDateTime(matter.updatedAt) || <span className="text-muted-foreground">&mdash;</span>}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </ScrollArea>

      <div className="flex items-center justify-between gap-4 px-4 py-3 border-t">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage(p => p + 1)}
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground" data-testid="text-pagination">
            {filteredMatters.length === 0
              ? "No results"
              : `${currentPage * PAGE_SIZE + 1}\u2013${Math.min((currentPage + 1) * PAGE_SIZE, filteredMatters.length)} of ${filteredMatters.length}`
            }
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="button-export">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
