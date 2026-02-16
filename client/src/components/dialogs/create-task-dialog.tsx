import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Group } from "@shared/schema";

const formSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  groupId: z.string().min(1, "Please select a group"),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
});

type FormData = z.infer<typeof formSchema>;

const groupColorOptions = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FormData) => void;
  groups: Group[];
  defaultGroupId?: string;
  onCreateGroup?: (data: { title: string; color: string }) => Promise<Group | undefined>;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  groups,
  defaultGroupId,
  onCreateGroup,
}: CreateTaskDialogProps) {
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#6366f1");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      groupId: defaultGroupId || groups[0]?.id || "",
      priority: "medium",
    },
  });

  const handleSubmit = (data: FormData) => {
    onSubmit(data);
    form.reset();
    setShowNewGroup(false);
    setNewGroupTitle("");
    onOpenChange(false);
  };

  const handleCreateGroup = async () => {
    if (!newGroupTitle.trim() || !onCreateGroup) return;
    setCreatingGroup(true);
    try {
      const newGroup = await onCreateGroup({ title: newGroupTitle.trim(), color: newGroupColor });
      if (newGroup) {
        form.setValue("groupId", newGroup.id);
      }
      setShowNewGroup(false);
      setNewGroupTitle("");
    } finally {
      setCreatingGroup(false);
    }
  };

  const hasNoGroups = groups.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your board.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Review contract draft"
                      {...field}
                      data-testid="input-task-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add details about this task..."
                      {...field}
                      data-testid="input-task-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group</FormLabel>
                  {hasNoGroups && !showNewGroup ? (
                    <div className="text-sm text-muted-foreground mb-2">
                      No groups exist yet. Create one to continue.
                    </div>
                  ) : null}
                  {!showNewGroup && groups.length > 0 && (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-group">
                          <SelectValue placeholder="Select a group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem
                            key={group.id}
                            value={group.id}
                            data-testid={`group-option-${group.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              {group.title}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {showNewGroup && (
                    <div className="space-y-3 p-3 border rounded-md bg-muted/30">
                      <Input
                        placeholder="Group name, e.g. To Do"
                        value={newGroupTitle}
                        onChange={(e) => setNewGroupTitle(e.target.value)}
                        autoFocus
                        data-testid="input-new-group-title"
                      />
                      <div className="flex gap-1.5 flex-wrap">
                        {groupColorOptions.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-6 h-6 rounded-md transition-transform ${
                              newGroupColor === color
                                ? "ring-2 ring-offset-1 ring-primary scale-110"
                                : ""
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewGroupColor(color)}
                            data-testid={`new-group-color-${color}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCreateGroup}
                          disabled={!newGroupTitle.trim() || creatingGroup}
                          data-testid="button-confirm-new-group"
                        >
                          {creatingGroup ? "Creating..." : "Create Group"}
                        </Button>
                        {groups.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNewGroup(false)}
                            data-testid="button-cancel-new-group"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {!showNewGroup && onCreateGroup && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-1 gap-1 text-xs"
                      onClick={() => setShowNewGroup(true)}
                      data-testid="button-add-new-group"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New Group
                    </Button>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-task"
              >
                Cancel
              </Button>
              <Button type="submit" data-testid="button-create-task">
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
