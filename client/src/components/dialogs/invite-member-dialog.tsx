import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Check, UserPlus, Shield, Eye, Users, Link2, Mail, Send } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string | null;
  color: string;
}

interface UserWithRole {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  profileImageUrl: string | null;
}

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardName?: string;
}

export function InviteMemberDialog({ open, onOpenChange, boardName }: InviteMemberDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const isAdmin = user?.role === "admin";

  const inviteLink = typeof window !== "undefined" ? window.location.origin : "";

  const { data: teamMembers = [], isLoading: membersLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
    enabled: open,
  });

  const { data: adminUsers = [] } = useQuery<UserWithRole[]>({
    queryKey: ["/api/admin/users"],
    enabled: open && isAdmin,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      toast({ title: "Role updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const res = await apiRequest("POST", "/api/team/invite", { email, role });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setInviteEmail("");
      setInviteRole("member");
      toast({ title: data?.message || "Invitation sent successfully" });
    },
    onError: (error: Error) => {
      const message = error?.message || "Failed to send invitation";
      toast({ title: message, variant: "destructive" });
    },
  });

  const handleInvite = () => {
    const emailTrimmed = inviteEmail.trim();
    if (!emailTrimmed) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }
    inviteMutation.mutate({ email: emailTrimmed, role: inviteRole });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({ title: "Invite link copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy link", variant: "destructive" });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Shield className="h-3.5 w-3.5" />;
      case "viewer": return <Eye className="h-3.5 w-3.5" />;
      default: return <Users className="h-3.5 w-3.5" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default" as const;
      case "viewer": return "secondary" as const;
      default: return "outline" as const;
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const displayMembers = isAdmin && adminUsers.length > 0
    ? adminUsers.map(u => ({
        id: u.id,
        name: u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email?.split("@")[0] || "User",
        email: u.email,
        role: u.role,
        color: teamMembers.find(m => m.id === u.id)?.color || "#6366f1",
      }))
    : teamMembers.map(m => ({ ...m, role: "member" }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-invite-dialog-title">
            <UserPlus className="h-5 w-5" />
            Invite to {boardName || "Workspace"}
          </DialogTitle>
          <DialogDescription>
            Add team members by email or share the invite link for them to join.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {isAdmin ? (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Invite by Email
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@lawfirm.com"
                    className="text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                    data-testid="input-invite-email"
                  />
                </div>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-[110px]" data-testid="select-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3 w-3" />
                        Member
                      </span>
                    </SelectItem>
                    <SelectItem value="viewer">
                      <span className="flex items-center gap-1.5">
                        <Eye className="h-3 w-3" />
                        Viewer
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleInvite}
                  disabled={!inviteEmail.trim() || inviteMutation.isPending}
                  className="gap-1.5"
                  data-testid="button-send-invite"
                >
                  <Send className="h-4 w-4" />
                  Invite
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border p-3">
              <p className="text-sm text-muted-foreground">
                Only admins can invite new members by email. Share the invite link below instead.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Invite Link
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="text-sm bg-muted/40"
                data-testid="input-invite-link"
              />
              <Button
                variant="outline"
                onClick={handleCopyLink}
                className="gap-1.5 flex-shrink-0"
                data-testid="button-copy-invite-link"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-sm font-medium">
                Team Members ({displayMembers.length})
              </label>
              {!isAdmin && (
                <span className="text-xs text-muted-foreground">Admin access required to manage roles</span>
              )}
            </div>
            <ScrollArea className="max-h-[240px]">
              <div className="space-y-1">
                {membersLoading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    Loading team members...
                  </div>
                ) : displayMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No team members yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Invite someone to get started</p>
                  </div>
                ) : (
                  displayMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 py-2 px-2 rounded-md"
                      data-testid={`row-team-member-${member.id}`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback style={{ backgroundColor: member.color }} className="text-white text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                            {member.name}
                          </span>
                          {member.id === user?.id && (
                            <Badge variant="secondary" className="text-[10px]">You</Badge>
                          )}
                        </div>
                        {member.email && (
                          <span className="text-xs text-muted-foreground truncate block" data-testid={`text-member-email-${member.id}`}>
                            {member.email}
                          </span>
                        )}
                      </div>
                      {isAdmin && member.id !== user?.id ? (
                        <Select
                          value={member.role}
                          onValueChange={(role) => updateRoleMutation.mutate({ userId: member.id, role })}
                        >
                          <SelectTrigger className="w-[110px]" data-testid={`select-role-${member.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <span className="flex items-center gap-1.5">
                                <Shield className="h-3 w-3" />
                                Admin
                              </span>
                            </SelectItem>
                            <SelectItem value="member">
                              <span className="flex items-center gap-1.5">
                                <Users className="h-3 w-3" />
                                Member
                              </span>
                            </SelectItem>
                            <SelectItem value="viewer">
                              <span className="flex items-center gap-1.5">
                                <Eye className="h-3 w-3" />
                                Viewer
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1 text-xs">
                          {getRoleIcon(member.role)}
                          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
