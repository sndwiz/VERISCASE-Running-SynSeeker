import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Columns, Loader2, Trash2, Pencil, Plus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CustomField {
  id: string;
  entityType: string;
  fieldName: string;
  fieldType: string;
  required: boolean;
  options?: string[];
  practiceArea?: string | null;
  sortOrder?: number;
}

const ENTITY_TYPES = [
  { value: "client", label: "Client" },
  { value: "matter", label: "Matter" },
  { value: "contact", label: "Contact" },
  { value: "task", label: "Task" },
  { value: "document", label: "Document" },
  { value: "time_entry", label: "Time Entry" },
];

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi-select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "currency", label: "Currency" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "url", label: "URL" },
];

const PRACTICE_AREAS = [
  { value: "", label: "All Practice Areas" },
  { value: "Personal Injury", label: "Personal Injury" },
  { value: "Family Law", label: "Family Law" },
  { value: "Criminal Law", label: "Criminal Law" },
  { value: "Real Estate", label: "Real Estate" },
  { value: "Corporate Law", label: "Corporate Law" },
  { value: "Employment Law", label: "Employment Law" },
  { value: "Immigration", label: "Immigration" },
  { value: "Bankruptcy", label: "Bankruptcy" },
  { value: "Estate Planning", label: "Estate Planning" },
];

export default function CustomFieldsSettings() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [formData, setFormData] = useState({
    entityType: "matter",
    fieldName: "",
    fieldType: "text",
    required: false,
    practiceArea: "",
    options: "" as string,
  });

  const { data: fields, isLoading } = useQuery<CustomField[]>({
    queryKey: ["/api/custom-fields"],
  });

  const createFieldMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/custom-fields", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({ title: "Custom field created" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to create custom field", variant: "destructive" });
    },
  });

  const updateFieldMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/custom-fields/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({ title: "Custom field updated" });
      closeDialog();
    },
    onError: () => {
      toast({ title: "Failed to update custom field", variant: "destructive" });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: string) =>
      apiRequest("DELETE", `/api/custom-fields/${fieldId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-fields"] });
      toast({ title: "Custom field deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete custom field", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingField(null);
    setFormData({
      entityType: "matter",
      fieldName: "",
      fieldType: "text",
      required: false,
      practiceArea: "",
      options: "",
    });
  };

  const openEditDialog = (field: CustomField) => {
    setEditingField(field);
    setFormData({
      entityType: field.entityType,
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      required: field.required,
      practiceArea: field.practiceArea || "",
      options: field.options?.join(", ") || "",
    });
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.fieldName.trim()) return;

    const payload: any = {
      entityType: formData.entityType,
      fieldName: formData.fieldName,
      fieldType: formData.fieldType,
      required: formData.required,
      createdBy: "admin",
    };

    if (formData.practiceArea) {
      payload.practiceArea = formData.practiceArea;
    }

    if ((formData.fieldType === "select" || formData.fieldType === "multiselect") && formData.options) {
      payload.options = formData.options.split(",").map((o: string) => o.trim()).filter(Boolean);
    }

    if (editingField) {
      updateFieldMutation.mutate({ id: editingField.id, data: payload });
    } else {
      createFieldMutation.mutate(payload);
    }
  };

  const groupedFields = (fields || []).reduce<Record<string, CustomField[]>>((acc, field) => {
    const type = field.entityType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(field);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Columns className="h-5 w-5" />
                Custom Fields
              </CardTitle>
              <CardDescription>
                Define custom fields for different entity types and practice areas
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowDialog(true)}
              data-testid="button-add-custom-field"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedFields).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Columns className="h-10 w-10 mb-3" />
              <p>No custom fields defined yet</p>
              <p className="text-sm mt-1">Add your first custom field to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedFields).map(([entityType, entityFields]) => (
                <div key={entityType}>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="secondary">
                      {ENTITY_TYPES.find(e => e.value === entityType)?.label || entityType}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {entityFields.length} field{entityFields.length !== 1 ? "s" : ""}
                    </span>
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Practice Area</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityFields.map((field) => (
                        <TableRow key={field.id} data-testid={`row-custom-field-${field.id}`}>
                          <TableCell>
                            <span className="font-medium" data-testid={`text-cf-name-${field.id}`}>
                              {field.fieldName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {FIELD_TYPES.find(f => f.value === field.fieldType)?.label || field.fieldType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {field.practiceArea || "All"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {field.required && (
                              <Badge variant="secondary">Required</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(field)}
                                data-testid={`button-edit-cf-${field.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteFieldMutation.mutate(field.id)}
                                disabled={deleteFieldMutation.isPending}
                                data-testid={`button-delete-cf-${field.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? "Edit Custom Field" : "Add Custom Field"}</DialogTitle>
            <DialogDescription>
              {editingField ? "Update the custom field definition" : "Define a new custom field for an entity type"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Field Name</Label>
              <Input
                value={formData.fieldName}
                onChange={(e) => setFormData({ ...formData, fieldName: e.target.value })}
                placeholder="e.g., Case Number, Statute of Limitations"
                data-testid="input-cf-field-name"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Entity Type</Label>
                <Select value={formData.entityType} onValueChange={(v) => setFormData({ ...formData, entityType: v })}>
                  <SelectTrigger data-testid="select-cf-entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((et) => (
                      <SelectItem key={et.value} value={et.value}>
                        {et.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select value={formData.fieldType} onValueChange={(v) => setFormData({ ...formData, fieldType: v })}>
                  <SelectTrigger data-testid="select-cf-field-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((ft) => (
                      <SelectItem key={ft.value} value={ft.value}>
                        {ft.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Practice Area (optional)</Label>
              <Select value={formData.practiceArea || "_all"} onValueChange={(v) => setFormData({ ...formData, practiceArea: v === "_all" ? "" : v })}>
                <SelectTrigger data-testid="select-cf-practice-area">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRACTICE_AREAS.map((pa) => (
                    <SelectItem key={pa.value || "_all"} value={pa.value || "_all"}>
                      {pa.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(formData.fieldType === "select" || formData.fieldType === "multiselect") && (
              <div className="space-y-2">
                <Label>Options (comma-separated)</Label>
                <Input
                  value={formData.options}
                  onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                  placeholder="e.g., Option 1, Option 2, Option 3"
                  data-testid="input-cf-options"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <Switch
                id="cf-required"
                checked={formData.required}
                onCheckedChange={(checked) => setFormData({ ...formData, required: checked })}
                data-testid="switch-cf-required"
              />
              <Label htmlFor="cf-required" className="cursor-pointer">
                Required field
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-cf">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.fieldName.trim() || createFieldMutation.isPending || updateFieldMutation.isPending}
              data-testid="button-save-cf"
            >
              {(createFieldMutation.isPending || updateFieldMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {editingField ? "Update Field" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
