import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Lock, Plus, Pencil, Trash2, Loader2, X, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem?: boolean;
}

const ALL_PERMISSIONS = [
  "matters.view",
  "matters.edit",
  "documents.delete",
  "documents.view_privileged",
  "ai.run",
  "ai.run_external",
  "billing.view",
  "export.all",
  "admin.settings",
  "share.external",
];

const PERMISSION_LABELS: Record<string, string> = {
  "matters.view": "View Matters",
  "matters.edit": "Edit Matters",
  "documents.delete": "Delete Documents",
  "documents.view_privileged": "View Privileged Documents",
  "ai.run": "Run AI (Internal)",
  "ai.run_external": "Run AI (External)",
  "billing.view": "View Billing",
  "export.all": "Export All Data",
  "admin.settings": "Admin Settings",
  "share.external": "Share Externally",
};

export default function RolesPermissionsPage() {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  const { data: roles, isLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  const createRoleMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      apiRequest("POST", "/api/roles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role created successfully" });
      setShowCreateForm(false);
      setCreateName("");
      setCreateDescription("");
    },
    onError: () => {
      toast({ title: "Failed to create role", variant: "destructive" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      apiRequest("PATCH", `/api/roles/${roleId}`, { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role permissions updated" });
      setEditingRoleId(null);
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: (roleId: string) =>
      apiRequest("DELETE", `/api/roles/${roleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({ title: "Role deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete role", variant: "destructive" });
    },
  });

  const handleStartEdit = (role: Role) => {
    setEditingRoleId(role.id);
    setEditPermissions([...role.permissions]);
  };

  const handleTogglePermission = (permission: string) => {
    setEditPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSavePermissions = () => {
    if (editingRoleId) {
      updateRoleMutation.mutate({ roleId: editingRoleId, permissions: editPermissions });
    }
  };

  const handleCreateRole = () => {
    if (!createName.trim()) return;
    createRoleMutation.mutate({ name: createName, description: createDescription });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-roles-title">
            Roles & Permissions
          </h1>
          <p className="text-muted-foreground mt-1">
            Define roles and control access to platform features
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          data-testid="button-create-role"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">New Role</CardTitle>
            <CardDescription>Define a new role for your team</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g., Paralegal"
                data-testid="input-role-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Describe what this role can do"
                data-testid="input-role-description"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                onClick={handleCreateRole}
                disabled={!createName.trim() || createRoleMutation.isPending}
                data-testid="button-save-role"
              >
                {createRoleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Role
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setCreateName("");
                  setCreateDescription("");
                }}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !roles || roles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Shield className="h-10 w-10 mb-3" />
            <p>No roles defined yet</p>
            <p className="text-sm mt-1">Create your first role to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {roles.map((role) => (
            <Card key={role.id} data-testid={`card-role-${role.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base" data-testid={`text-role-name-${role.id}`}>
                      {role.name}
                    </CardTitle>
                    {role.isSystem && (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        System
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(role)}
                      data-testid={`button-edit-role-${role.id}`}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {!role.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteRoleMutation.mutate(role.id)}
                        disabled={deleteRoleMutation.isPending}
                        data-testid={`button-delete-role-${role.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                {role.description && (
                  <CardDescription data-testid={`text-role-description-${role.id}`}>
                    {role.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {editingRoleId === role.id ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium">Permissions</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {ALL_PERMISSIONS.map((permission) => (
                        <div key={permission} className="flex items-center gap-2">
                          <Checkbox
                            id={`perm-${role.id}-${permission}`}
                            checked={editPermissions.includes(permission)}
                            onCheckedChange={() => handleTogglePermission(permission)}
                            data-testid={`checkbox-perm-${permission}`}
                          />
                          <Label
                            htmlFor={`perm-${role.id}-${permission}`}
                            className="text-sm cursor-pointer"
                          >
                            {PERMISSION_LABELS[permission] || permission}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={handleSavePermissions}
                        disabled={updateRoleMutation.isPending}
                        data-testid="button-save-permissions"
                      >
                        {updateRoleMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingRoleId(null)}
                        data-testid="button-cancel-edit"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {role.permissions && role.permissions.length > 0 ? (
                      role.permissions.map((perm) => (
                        <Badge key={perm} variant="outline" className="text-xs" data-testid={`badge-perm-${role.id}-${perm}`}>
                          {PERMISSION_LABELS[perm] || perm}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No permissions assigned</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}