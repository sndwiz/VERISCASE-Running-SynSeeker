import { useQuery, useMutation } from "@tanstack/react-query";
import { Users, Loader2, ShieldOff, ShieldCheck, UserX, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TeamMember {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  status: "active" | "suspended" | "offboarded";
  lastLogin?: string;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  suspended: { label: "Suspended", variant: "secondary" },
  offboarded: { label: "Offboarded", variant: "destructive" },
};

export default function ManageUsersPage() {
  const { toast } = useToast();

  const { data: members, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team-members"],
  });

  const suspendMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest("PATCH", `/api/admin/users/${userId}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "User suspended successfully" });
    },
    onError: () => {
      toast({ title: "Failed to suspend user", variant: "destructive" });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest("PATCH", `/api/admin/users/${userId}/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "User reactivated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to reactivate user", variant: "destructive" });
    },
  });

  const offboardMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest("PATCH", `/api/admin/users/${userId}/offboard`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-members"] });
      toast({ title: "User offboarded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to offboard user", variant: "destructive" });
    },
  });

  const resetMfaMutation = useMutation({
    mutationFn: (userId: string) =>
      apiRequest("POST", `/api/admin/users/${userId}/reset-mfa`),
    onSuccess: () => {
      toast({ title: "MFA reset successfully" });
    },
    onError: () => {
      toast({ title: "Failed to reset MFA", variant: "destructive" });
    },
  });

  const isAnyPending = suspendMutation.isPending || reactivateMutation.isPending || offboardMutation.isPending || resetMfaMutation.isPending;

  const getDisplayName = (member: TeamMember) => {
    if (member.firstName && member.lastName) return `${member.firstName} ${member.lastName}`;
    if (member.name) return member.name;
    return member.email?.split("@")[0] || "User";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" data-testid="text-manage-users-title">
          Manage Users
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage team member accounts, roles, and lifecycle actions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            {members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !members || members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mb-3" />
              <p>No team members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-users">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const status = statusConfig[member.status] ?? statusConfig.active;
                    return (
                      <TableRow key={member.id} data-testid={`row-user-${member.id}`}>
                        <TableCell className="font-medium" data-testid={`text-user-name-${member.id}`}>
                          {getDisplayName(member)}
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-user-email-${member.id}`}>
                          {member.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={status.variant}
                            data-testid={`badge-status-${member.id}`}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(member.lastLogin)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            {member.status === "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => suspendMutation.mutate(member.id)}
                                disabled={isAnyPending}
                                data-testid={`button-suspend-${member.id}`}
                              >
                                <ShieldOff className="h-3 w-3 mr-1" />
                                Suspend
                              </Button>
                            )}
                            {member.status === "suspended" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => reactivateMutation.mutate(member.id)}
                                disabled={isAnyPending}
                                data-testid={`button-reactivate-${member.id}`}
                              >
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Reactivate
                              </Button>
                            )}
                            {member.status !== "offboarded" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => offboardMutation.mutate(member.id)}
                                disabled={isAnyPending}
                                data-testid={`button-offboard-${member.id}`}
                              >
                                <UserX className="h-3 w-3 mr-1" />
                                Offboard
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resetMfaMutation.mutate(member.id)}
                              disabled={isAnyPending}
                              data-testid={`button-reset-mfa-${member.id}`}
                            >
                              <KeyRound className="h-3 w-3 mr-1" />
                              Reset MFA
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}