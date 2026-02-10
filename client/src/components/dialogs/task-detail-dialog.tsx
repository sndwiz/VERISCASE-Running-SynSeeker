import { format, parseISO, isValid } from "date-fns";
import { X, Calendar, User, Clock, Tag, FileText, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusCell } from "@/components/board/cells/status-cell";
import { PriorityCell } from "@/components/board/cells/priority-cell";
import { ProgressCell } from "@/components/board/cells/progress-cell";
import type { Task, StatusType, Priority } from "@shared/schema";
import { useState, useEffect } from "react";

interface TaskDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

export function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  onUpdate,
}: TaskDetailDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setNotes(task.notes || "");
    }
  }, [task]);

  if (!task) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleTitleBlur = () => {
    if (title !== task.title) {
      onUpdate(task.id, { title });
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== task.description) {
      onUpdate(task.id, { description });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== task.notes) {
      onUpdate(task.id, { notes });
    }
  };

  const dueDate = task.dueDate ? parseISO(task.dueDate) : null;
  const createdAt = parseISO(task.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="text-xl font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
              data-testid="input-task-title-detail"
            />
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status & Priority Row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-16">Status</span>
              <div className="w-32">
                <StatusCell
                  value={task.status}
                  onChange={(value: string) => onUpdate(task.id, { status: value as StatusType })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-16">Priority</span>
              <div className="w-24">
                <PriorityCell
                  value={task.priority}
                  onChange={(value: Priority) => onUpdate(task.id, { priority: value })}
                />
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-16">Progress</span>
            <div className="flex-1 max-w-xs">
              <ProgressCell
                value={task.progress}
                onChange={(value: number) => onUpdate(task.id, { progress: value })}
              />
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Description</span>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Add a description..."
              className="min-h-[100px] resize-none"
              data-testid="textarea-task-description"
            />
          </div>

          {/* Assignees */}
          {task.assignees.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Assignees</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {task.assignees.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarFallback
                        className="text-xs text-white"
                        style={{ backgroundColor: person.color }}
                      >
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{person.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Due Date:</span>
            <span className="text-sm">
              {dueDate && isValid(dueDate)
                ? format(dueDate, "MMM d, yyyy")
                : "Not set"}
            </span>
          </div>

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>Tags</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {task.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Notes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>Notes</span>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={handleNotesBlur}
              placeholder="Add notes..."
              className="min-h-[80px] resize-none"
              data-testid="textarea-task-notes"
            />
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Created {isValid(createdAt) ? format(createdAt, "MMM d, yyyy") : "Unknown"}
              </span>
            </div>
            {task.timeTracked > 0 && (
              <div>
                Time tracked: {task.timeTracked}h
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
