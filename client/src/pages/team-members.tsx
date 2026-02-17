import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Users,
  UserCheck,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TeamMember } from "@/types/matters";

const TEAM_ROLES = [
  { value: "attorney", label: "Attorney" },
  { value: "paralegal", label: "Paralegal" },
  { value: "partner", label: "Partner" },
  { value: "associate", label: "Associate" },
  { value: "of_counsel", label: "Of Counsel" },
  { value: "legal_assistant", label: "Legal Assistant" },
  { value: "office_manager", label: "Office Manager" },
  { value: "clerk", label: "Clerk" },
  { value: "intern", label: "Intern" },
  { value: "staff", label: "Staff" },
];

const DEPARTMENTS = [
  "Litigation",
  "Corporate",
  "Real Estate",
  "Family Law",
  "Criminal Defense",
  "Immigration",
  "Estate Planning",
  "Employment",
  "Personal Injury",
  "General",
];

const roleColors: Record<string, string> = {
  attorney: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  paralegal: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  partner: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  associate: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  of_counsel: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  legal_assistant: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  office_manager: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  clerk: "bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-300",
  intern: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  staff: "bg-slate-100 text-slate-800 dark:bg-slate-700/30 dark:text-slate-300",
};

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  role: "",
  title: "",
  barNumber: "",
  department: "",
  isActive: true,
};

export default function TeamMembersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [roleFilter, setRoleFilter] = useState("all");

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/team-members", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      setShowDialog(false);
      setForm(emptyForm);
      toast({ title: "Team member added" });
    },
    onError: () => {
      toast({ title: "Failed to add team member", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof form }) => {
      const res = await apiRequest("PATCH", `/api/team-members/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      setShowDialog(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: "Team member updated" });
    },
    onError: () => {
      toast({ title: "Failed to update team member", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/team-members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "Team member removed" });
    },
  });

  const filteredMembers = members.filter(m => {
    const matchesSearch = !searchQuery.trim() ||
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeCount = members.filter(m => m.isActive).length;
  const attorneyCount = members.filter(m => ["attorney", "partner", "associate", "of_counsel"].includes(m.role)).length;
  const paralegalCount = members.filter(m => m.role === "paralegal").length;

  function openEdit(member: TeamMember) {
    setEditingId(member.id);
    setForm({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email || "",
      phone: member.phone || "",
      role: member.role,
      title: member.title || "",
      barNumber: member.barNumber || "",
      department: member.department || "",
      isActive: member.isActive,
    });
    setShowDialog(true);
  }

  function handleSubmit() {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  }

  function getRoleLabel(role: string) {
    return TEAM_ROLES.find(r => r.value === role)?.label || role;
  }

  return (
    <div className="flex flex-col h-full" data-testid="page-team-members">
      <div className="flex items-center justify-between gap-4 p-4 border-b flex-wrap">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-semibold" data-testid="text-team-title">Team Members</h1>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditingId(null);
            setForm(emptyForm);
          }
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-team-member">
              <Plus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Update team member information." : "Add a new attorney, paralegal, or staff member to the firm."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input
                    value={form.firstName}
                    onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input
                    value={form.lastName}
                    onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Senior Associate"
                    data-testid="input-title"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@firm.com"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bar Number</Label>
                  <Input
                    value={form.barNumber}
                    onChange={e => setForm(p => ({ ...p, barNumber: e.target.value }))}
                    placeholder="Bar # (if applicable)"
                    data-testid="input-bar-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))}
                  data-testid="switch-active"
                />
                <Label>Active Member</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={!form.firstName || !form.lastName || !form.role || createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-team-member"
              >
                {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingId ? "Save Changes" : "Add Member"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold" data-testid="text-active-count">{activeCount}</div>
                  <div className="text-xs text-muted-foreground">Active Members</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Briefcase className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold" data-testid="text-attorney-count">{attorneyCount}</div>
                  <div className="text-xs text-muted-foreground">Attorneys</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold" data-testid="text-paralegal-count">{paralegalCount}</div>
                  <div className="text-xs text-muted-foreground">Paralegals</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search team members..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-team"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full md:w-[160px]" data-testid="select-role-filter">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {TEAM_ROLES.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <ScrollArea className="h-[calc(100vh-380px)]">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Bar #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {members.length === 0
                        ? "No team members yet. Add your first team member to get started."
                        : "No team members match your search."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map(member => (
                    <TableRow key={member.id} data-testid={`row-team-member-${member.id}`}>
                      <TableCell className="font-medium">
                        {member.firstName} {member.lastName}
                        {member.title && (
                          <span className="block text-xs text-muted-foreground">{member.title}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={roleColors[member.role] || ""}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{member.email || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{member.phone || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{member.department || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{member.barNumber || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEdit(member)}
                            data-testid={`button-edit-member-${member.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(member.id)}
                            data-testid={`button-delete-member-${member.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
