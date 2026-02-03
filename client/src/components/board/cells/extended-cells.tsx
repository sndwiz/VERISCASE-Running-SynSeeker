import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  ThumbsUp,
  Mail,
  Phone,
  Link as LinkIcon,
  MapPin,
  Globe,
  Hash,
  Palette,
  Play,
  Pause,
  Timer,
  Sparkles,
  X,
  Plus,
  Check,
  Clock,
  User,
  RefreshCw,
  GitBranch,
  Calendar,
  FileCheck,
  History,
  PenTool,
  Eye,
  AlertCircle,
  Shield,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format, parseISO } from "date-fns";

interface CellProps {
  value: any;
  onChange: (value: any) => void;
  onClick?: (e: React.MouseEvent) => void;
  options?: string[];
  taskId?: string;
}

// Email Cell
export function EmailCell({ value, onChange, onClick }: CellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) onChange(editValue);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="email"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === "Enter" && handleBlur()}
        className="h-7 text-xs"
        data-testid="email-cell-input"
      />
    );
  }

  return (
    <button
      className="w-full h-7 px-2 py-1 text-xs text-left truncate flex items-center gap-1 text-muted-foreground hover-elevate rounded"
      onClick={() => setIsEditing(true)}
      data-testid="email-cell"
    >
      <Mail className="h-3 w-3 flex-shrink-0" />
      {value || <span className="opacity-50">Add email</span>}
    </button>
  );
}

// Phone Cell
export function PhoneCell({ value, onChange, onClick }: CellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) onChange(editValue);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="tel"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === "Enter" && handleBlur()}
        className="h-7 text-xs"
        data-testid="phone-cell-input"
      />
    );
  }

  return (
    <button
      className="w-full h-7 px-2 py-1 text-xs text-left truncate flex items-center gap-1 text-muted-foreground hover-elevate rounded"
      onClick={() => setIsEditing(true)}
      data-testid="phone-cell"
    >
      <Phone className="h-3 w-3 flex-shrink-0" />
      {value || <span className="opacity-50">Add phone</span>}
    </button>
  );
}

// Rating Cell
export function RatingCell({ value, onChange, onClick }: CellProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const rating = value || 0;
  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex items-center gap-0.5 px-1" data-testid="rating-cell">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={(e) => {
            onClick?.(e);
            onChange(star === rating ? 0 : star);
          }}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(null)}
          className="p-0.5"
          data-testid={`rating-star-${star}`}
        >
          <Star
            className={`h-3.5 w-3.5 ${
              star <= displayRating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// Vote Cell
export function VoteCell({ value, onChange, onClick }: CellProps) {
  const votes = value || 0;

  return (
    <button
      className="flex items-center gap-1 px-2 h-7 text-xs hover-elevate rounded"
      onClick={(e) => {
        onClick?.(e);
        onChange(votes + 1);
      }}
      data-testid="vote-cell"
    >
      <ThumbsUp className={`h-3.5 w-3.5 ${votes > 0 ? "text-blue-500 fill-blue-500" : "text-muted-foreground"}`} />
      <span className={votes > 0 ? "text-blue-500 font-medium" : "text-muted-foreground"}>
        {votes}
      </span>
    </button>
  );
}

// Approval Cell - for legal verification workflow
interface ApprovalValue {
  status: string;
  initials?: Array<{
    by: string;
    at: string;
    status: string;
  }>;
  auditTrail?: Array<{
    action: string;
    by: string;
    at: string;
    notes?: string;
  }>;
  contextPreview?: {
    title: string;
    description?: string;
    relatedDocs?: string[];
  };
}

function safeFormatDate(dateStr: string | undefined): string {
  if (!dateStr) return "Unknown date";
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) return "Unknown date";
    return format(date, "MMM d, yyyy HH:mm");
  } catch {
    return "Unknown date";
  }
}

function safeFormatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) return "";
    return format(date, "MMM d, HH:mm");
  } catch {
    return "";
  }
}

export function ApprovalCell({ value, onChange, onClick, taskId }: CellProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [initialsInput, setInitialsInput] = useState("");
  const [notes, setNotes] = useState("");
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  const approvalStates = [
    { value: "pending", label: "Pending", icon: Clock, bgColor: "bg-amber-100 dark:bg-amber-900/30", textColor: "text-amber-700 dark:text-amber-300" },
    { value: "vetting", label: "Vetting", icon: Eye, bgColor: "bg-purple-100 dark:bg-purple-900/30", textColor: "text-purple-700 dark:text-purple-300" },
    { value: "approved", label: "Approved", icon: CheckCircle2, bgColor: "bg-green-100 dark:bg-green-900/30", textColor: "text-green-700 dark:text-green-300" },
    { value: "confirmed", label: "Confirmed", icon: Shield, bgColor: "bg-emerald-500", textColor: "text-white" },
    { value: "rejected", label: "Rejected", icon: XCircle, bgColor: "bg-red-100 dark:bg-red-900/30", textColor: "text-red-700 dark:text-red-300" },
  ];

  const normalizeApprovalValue = (val: any): ApprovalValue => {
    if (typeof val === "string") {
      return { status: val || "pending", initials: [], auditTrail: [] };
    }
    if (typeof val === "object" && val !== null) {
      return {
        status: val.status || "pending",
        initials: Array.isArray(val.initials) ? val.initials : [],
        auditTrail: Array.isArray(val.auditTrail) ? val.auditTrail : [],
        contextPreview: val.contextPreview,
      };
    }
    return { status: "pending", initials: [], auditTrail: [] };
  };

  const approvalData: ApprovalValue = normalizeApprovalValue(value);
  
  const currentState = approvalStates.find(s => s.value === approvalData.status) || approvalStates[0];
  const StateIcon = currentState.icon;
  const initialsCount = approvalData.initials?.length || 0;

  const handleQuickClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDialog(true);
    onClick?.(e);
  };

  const handleStatusChange = (newStatus: string) => {
    const now = new Date().toISOString();
    const newAuditEntry = {
      action: "status_changed",
      by: "Current User",
      at: now,
      notes: notes || undefined,
    };

    const updatedValue: ApprovalValue = {
      ...approvalData,
      status: newStatus,
      auditTrail: [...(approvalData.auditTrail || []), newAuditEntry],
    };

    onChange(updatedValue);
    setNotes("");
  };

  const handleAddInitials = () => {
    if (!initialsInput.trim()) return;
    
    const now = new Date().toISOString();
    const newInitial = {
      by: initialsInput.toUpperCase(),
      at: now,
      status: approvalData.status,
    };
    const newAuditEntry = {
      action: "initialed",
      by: initialsInput.toUpperCase(),
      at: now,
      notes: `Initialed at status: ${currentState.label}`,
    };

    const updatedValue: ApprovalValue = {
      ...approvalData,
      initials: [...(approvalData.initials || []), newInitial],
      auditTrail: [...(approvalData.auditTrail || []), newAuditEntry],
    };

    const requiredInitials = 3;
    if (updatedValue.initials!.length >= requiredInitials && approvalData.status === "approved") {
      updatedValue.status = "confirmed";
      updatedValue.auditTrail!.push({
        action: "status_changed",
        by: "System",
        at: now,
        notes: `Auto-confirmed after ${requiredInitials} initials`,
      });
    }

    onChange(updatedValue);
    setInitialsInput("");
  };

  return (
    <>
      <button
        className={`px-2 py-1 text-xs rounded ${currentState.bgColor} ${currentState.textColor} font-medium whitespace-nowrap flex items-center gap-1`}
        onClick={handleQuickClick}
        data-testid="approval-cell"
      >
        <StateIcon className="h-3 w-3" />
        {currentState.label}
        {initialsCount > 0 && (
          <span className="ml-1 px-1 rounded bg-black/10 dark:bg-white/10 text-[10px]">
            {initialsCount}/{3}
          </span>
        )}
      </button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Legal Approval Workflow
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg border bg-muted/30">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">CONTEXT PREVIEW</h4>
              <div className="text-sm">
                <p className="font-medium">{approvalData.contextPreview?.title || `Task #${taskId || "N/A"}`}</p>
                <p className="text-muted-foreground text-xs mt-1">
                  {approvalData.contextPreview?.description || "Review this item before changing approval status."}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">CURRENT STATUS</h4>
              <div className="flex items-center gap-2">
                <div className={`px-3 py-2 rounded-lg ${currentState.bgColor} ${currentState.textColor} font-medium flex items-center gap-2`}>
                  <StateIcon className="h-4 w-4" />
                  {currentState.label}
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">CHANGE STATUS</h4>
              <div className="flex flex-wrap gap-2">
                {approvalStates.map((state) => {
                  const Icon = state.icon;
                  return (
                    <Button
                      key={state.value}
                      size="sm"
                      variant={state.value === approvalData.status ? "default" : "outline"}
                      onClick={() => handleStatusChange(state.value)}
                      className="gap-1"
                      data-testid={`approval-status-${state.value}`}
                    >
                      <Icon className="h-3 w-3" />
                      {state.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <PenTool className="h-3 w-3" />
                ATTORNEY INITIALS ({initialsCount}/3 required for confirmation)
              </h4>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Enter initials (e.g., JDS)"
                  value={initialsInput}
                  onChange={(e) => setInitialsInput(e.target.value.slice(0, 4))}
                  className="w-32 uppercase"
                  data-testid="approval-initials-input"
                />
                <Button size="sm" onClick={handleAddInitials} disabled={!initialsInput.trim()} data-testid="button-add-initials">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {approvalData.initials && approvalData.initials.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {approvalData.initials.map((initial, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1">
                      <PenTool className="h-3 w-3" />
                      {initial.by}
                      <span className="text-[10px] text-muted-foreground">
                        {safeFormatShortDate(initial.at)}
                      </span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">NOTES (OPTIONAL)</h4>
              <Textarea
                placeholder="Add notes for the audit trail..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[60px] resize-none"
                data-testid="approval-notes"
              />
            </div>

            <div className="border-t pt-3">
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setShowAuditTrail(!showAuditTrail)}
                data-testid="toggle-audit-trail"
              >
                <History className="h-4 w-4" />
                Audit Trail ({approvalData.auditTrail?.length || 0} entries)
                {showAuditTrail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {showAuditTrail && (
                <ScrollArea className="h-32 mt-2 border rounded-lg p-2">
                  {approvalData.auditTrail && approvalData.auditTrail.length > 0 ? (
                    <div className="space-y-2">
                      {[...approvalData.auditTrail].reverse().map((entry, idx) => (
                        <div key={idx} className="text-xs border-b pb-2 last:border-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {entry.action.replace("_", " ")}
                            </Badge>
                            <span className="font-medium">{entry.by}</span>
                            <span className="text-muted-foreground">
                              {safeFormatDate(entry.at)}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-muted-foreground mt-1 pl-2 border-l-2">{entry.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground text-center py-4">No audit entries yet</p>
                  )}
                </ScrollArea>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Link Cell
export function LinkCell({ value, onChange, onClick }: CellProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(value?.url || "");
  const [label, setLabel] = useState(value?.label || "");

  const handleSave = () => {
    if (url) {
      onChange({ url, label: label || url });
    } else {
      onChange(null);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full h-7 px-2 py-1 text-xs text-left truncate flex items-center gap-1 text-muted-foreground hover-elevate rounded"
          data-testid="link-cell"
        >
          <LinkIcon className="h-3 w-3 flex-shrink-0" />
          {value?.label || value?.url || <span className="opacity-50">Add link</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-2">
          <Input
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="text-xs h-8"
            data-testid="link-url-input"
          />
          <Input
            placeholder="Label (optional)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="text-xs h-8"
            data-testid="link-label-input"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="flex-1 h-7 text-xs" data-testid="button-save-link">
              Save
            </Button>
            {value && (
              <Button size="sm" variant="ghost" onClick={() => { onChange(null); setOpen(false); }} className="h-7 text-xs" data-testid="button-clear-link">
                Clear
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Location Cell
export function LocationCell({ value, onChange, onClick }: CellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== value) onChange(editValue);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === "Enter" && handleBlur()}
        className="h-7 text-xs"
        placeholder="Enter address..."
        data-testid="location-cell-input"
      />
    );
  }

  return (
    <button
      className="w-full h-7 px-2 py-1 text-xs text-left truncate flex items-center gap-1 text-muted-foreground hover-elevate rounded"
      onClick={() => setIsEditing(true)}
      data-testid="location-cell"
    >
      <MapPin className="h-3 w-3 flex-shrink-0" />
      {value || <span className="opacity-50">Add location</span>}
    </button>
  );
}

// Checkbox Cell
export function CheckboxCell({ value, onChange, onClick }: CellProps) {
  return (
    <div className="flex items-center justify-center h-7 px-2">
      <Checkbox
        checked={value || false}
        onCheckedChange={(checked) => {
          onChange(checked);
        }}
        data-testid="checkbox-cell"
      />
    </div>
  );
}

// Dropdown Cell
export function DropdownCell({ value, onChange, options = [], onClick }: CellProps) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-xs border-0 shadow-none" data-testid="dropdown-cell">
        <SelectValue placeholder="Select..." />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option} data-testid={`dropdown-option-${option}`}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Tags Cell
export function TagsCell({ value, onChange, onClick }: CellProps) {
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const tags: string[] = value || [];

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onChange([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const tagColors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full h-7 px-1 flex items-center gap-1 overflow-hidden hover-elevate rounded"
          data-testid="tags-cell"
        >
          {tags.length > 0 ? (
            <div className="flex gap-0.5 overflow-hidden">
              {tags.slice(0, 2).map((tag, i) => (
                <span
                  key={tag}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tagColors[i % tagColors.length]}`}
                >
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="px-1 text-[10px] text-muted-foreground">+{tags.length - 2}</span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground opacity-50">Add tags</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, i) => (
              <Badge key={tag} variant="secondary" className={`${tagColors[i % tagColors.length]} text-xs`}>
                {tag}
                <button onClick={() => removeTag(tag)} className="ml-1" data-testid={`remove-tag-${tag}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-1">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              placeholder="Add tag..."
              className="h-7 text-xs"
              data-testid="tags-input"
            />
            <Button size="sm" onClick={addTag} className="h-7" data-testid="button-add-tag">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Number Cell
export function NumberCell({ value, onChange, onClick }: CellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue)) {
      onChange(numValue);
    } else if (editValue === "") {
      onChange(null);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="number"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === "Enter" && handleBlur()}
        className="h-7 text-xs text-right"
        data-testid="number-cell-input"
      />
    );
  }

  return (
    <button
      className="w-full h-7 px-2 py-1 text-xs text-right text-muted-foreground hover-elevate rounded"
      onClick={() => setIsEditing(true)}
      data-testid="number-cell"
    >
      {value !== null && value !== undefined ? value : <span className="opacity-50">-</span>}
    </button>
  );
}

// Long Text Cell
export function LongTextCell({ value, onChange, onClick }: CellProps) {
  const [open, setOpen] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleSave = () => {
    onChange(editValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full h-7 px-2 py-1 text-xs text-left truncate text-muted-foreground hover-elevate rounded"
          data-testid="long-text-cell"
        >
          {value ? (
            <span className="line-clamp-1">{value}</span>
          ) : (
            <span className="opacity-50">Add text...</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3">
        <div className="space-y-2">
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="min-h-[100px] text-sm"
            placeholder="Enter text..."
            data-testid="long-text-input"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-7 text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="h-7 text-xs" data-testid="button-save-long-text">
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Color Picker Cell
export function ColorPickerCell({ value, onChange, onClick }: CellProps) {
  const [open, setOpen] = useState(false);
  const colors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
    "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280", "#000000",
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full h-7 px-2 flex items-center gap-2 hover-elevate rounded"
          data-testid="color-picker-cell"
        >
          <div
            className="w-4 h-4 rounded-full border"
            style={{ backgroundColor: value || "#6b7280" }}
          />
          <span className="text-xs text-muted-foreground truncate">
            {value || "Select color"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2">
        <div className="grid grid-cols-5 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              className={`w-7 h-7 rounded-full border-2 ${value === color ? "border-primary" : "border-transparent"}`}
              style={{ backgroundColor: color }}
              onClick={() => { onChange(color); setOpen(false); }}
              data-testid={`color-${color}`}
            />
          ))}
        </div>
        <Input
          type="color"
          value={value || "#6b7280"}
          onChange={(e) => { onChange(e.target.value); setOpen(false); }}
          className="w-full h-8 mt-2 cursor-pointer"
          data-testid="color-picker-input"
        />
      </PopoverContent>
    </Popover>
  );
}

// Time Tracking Cell
export function TimeTrackingCell({ value, onChange, onClick }: CellProps) {
  const [isRunning, setIsRunning] = useState(false);
  const totalSeconds = value?.totalSeconds || 0;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const toggleTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRunning(!isRunning);
  };

  return (
    <div className="flex items-center gap-1 px-2 h-7" data-testid="time-tracking-cell">
      <button
        onClick={toggleTimer}
        className={`p-1 rounded ${isRunning ? "text-red-500" : "text-green-500"}`}
        data-testid="timer-toggle"
      >
        {isRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
      </button>
      <span className="text-xs text-muted-foreground">
        {formatTime(totalSeconds)}
      </span>
    </div>
  );
}

// Item ID Cell (read-only)
export function ItemIdCell({ value, taskId }: CellProps) {
  const displayId = taskId ? taskId.slice(0, 8) : value || "-";
  return (
    <div className="px-2 h-7 flex items-center" data-testid="item-id-cell">
      <span className="text-xs text-muted-foreground font-mono">#{displayId}</span>
    </div>
  );
}

// Creation Log Cell (read-only)
export function CreationLogCell({ value }: CellProps) {
  const createdAt = value?.createdAt ? parseISO(value.createdAt) : null;
  const createdBy = value?.createdBy || "Unknown";

  return (
    <div className="px-2 h-7 flex items-center gap-1" data-testid="creation-log-cell">
      <User className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground truncate">
        {createdBy} {createdAt && `• ${format(createdAt, "MMM d")}`}
      </span>
    </div>
  );
}

// Last Updated Cell (read-only)
export function LastUpdatedCell({ value }: CellProps) {
  const updatedAt = value ? parseISO(value) : null;

  return (
    <div className="px-2 h-7 flex items-center gap-1" data-testid="last-updated-cell">
      <RefreshCw className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {updatedAt ? format(updatedAt, "MMM d, h:mm a") : "-"}
      </span>
    </div>
  );
}

// Auto Number Cell (read-only)
export function AutoNumberCell({ value }: CellProps) {
  return (
    <div className="px-2 h-7 flex items-center" data-testid="auto-number-cell">
      <span className="text-xs text-muted-foreground font-mono">{value || "-"}</span>
    </div>
  );
}

// Dependency Cell
export function DependencyCell({ value, onChange, onClick }: CellProps) {
  const dependencies: string[] = value || [];

  return (
    <button
      className="w-full h-7 px-2 flex items-center gap-1 hover-elevate rounded"
      onClick={onClick}
      data-testid="dependency-cell"
    >
      <GitBranch className="h-3 w-3 text-muted-foreground" />
      {dependencies.length > 0 ? (
        <span className="text-xs text-muted-foreground">{dependencies.length} linked</span>
      ) : (
        <span className="text-xs text-muted-foreground opacity-50">Add dependency</span>
      )}
    </button>
  );
}

// Country Cell
export function CountryCell({ value, onChange, onClick }: CellProps) {
  const countries = [
    { code: "US", name: "United States", flag: "🇺🇸" },
    { code: "UK", name: "United Kingdom", flag: "🇬🇧" },
    { code: "CA", name: "Canada", flag: "🇨🇦" },
    { code: "AU", name: "Australia", flag: "🇦🇺" },
    { code: "DE", name: "Germany", flag: "🇩🇪" },
    { code: "FR", name: "France", flag: "🇫🇷" },
    { code: "JP", name: "Japan", flag: "🇯🇵" },
    { code: "IN", name: "India", flag: "🇮🇳" },
  ];

  const selected = countries.find((c) => c.code === value);

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-xs border-0 shadow-none" data-testid="country-cell">
        <SelectValue placeholder="Select country...">
          {selected && (
            <span className="flex items-center gap-1">
              <span>{selected.flag}</span>
              <span>{selected.name}</span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {countries.map((country) => (
          <SelectItem key={country.code} value={country.code} data-testid={`country-${country.code}`}>
            <span className="flex items-center gap-2">
              <span>{country.flag}</span>
              <span>{country.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// World Clock Cell
export function WorldClockCell({ value, onChange }: CellProps) {
  const timezones = [
    { id: "America/New_York", label: "New York (EST)" },
    { id: "America/Los_Angeles", label: "Los Angeles (PST)" },
    { id: "Europe/London", label: "London (GMT)" },
    { id: "Europe/Paris", label: "Paris (CET)" },
    { id: "Asia/Tokyo", label: "Tokyo (JST)" },
    { id: "Asia/Shanghai", label: "Shanghai (CST)" },
  ];

  const selected = timezones.find((tz) => tz.id === value);

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-xs border-0 shadow-none" data-testid="world-clock-cell">
        <div className="flex items-center gap-1">
          <Globe className="h-3 w-3 text-muted-foreground" />
          <SelectValue placeholder="Select timezone">
            {selected?.label}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {timezones.map((tz) => (
          <SelectItem key={tz.id} value={tz.id} data-testid={`timezone-${tz.id}`}>
            {tz.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Hour Cell
export function HourCell({ value, onChange }: CellProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <Input
        type="time"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setIsEditing(false)}
        className="h-7 text-xs"
        autoFocus
        data-testid="hour-cell-input"
      />
    );
  }

  return (
    <button
      className="w-full h-7 px-2 py-1 text-xs text-left flex items-center gap-1 text-muted-foreground hover-elevate rounded"
      onClick={() => setIsEditing(true)}
      data-testid="hour-cell"
    >
      <Clock className="h-3 w-3" />
      {value || <span className="opacity-50">Set time</span>}
    </button>
  );
}

// Week Cell
export function WeekCell({ value, onChange }: CellProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <Input
        type="week"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setIsEditing(false)}
        className="h-7 text-xs"
        autoFocus
        data-testid="week-cell-input"
      />
    );
  }

  return (
    <button
      className="w-full h-7 px-2 py-1 text-xs text-left flex items-center gap-1 text-muted-foreground hover-elevate rounded"
      onClick={() => setIsEditing(true)}
      data-testid="week-cell"
    >
      <Calendar className="h-3 w-3" />
      {value || <span className="opacity-50">Select week</span>}
    </button>
  );
}

// Formula Cell (read-only, displays computed value)
export function FormulaCell({ value }: CellProps) {
  return (
    <div className="px-2 h-7 flex items-center" data-testid="formula-cell">
      <span className="text-xs text-muted-foreground font-mono">{value ?? "-"}</span>
    </div>
  );
}

// Button Cell
export function ButtonCell({ value, onChange, onClick }: CellProps) {
  const buttonLabel = value?.label || "Click";
  
  const handleClick = (e: React.MouseEvent) => {
    onClick?.(e);
    onChange({ ...value, clicked: true, clickedAt: new Date().toISOString() });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleClick}
      className="h-6 text-xs px-2"
      data-testid="button-cell"
    >
      {buttonLabel}
    </Button>
  );
}

// Label Cell
export function LabelCell({ value, onChange, options = [] }: CellProps) {
  const labelColors: Record<string, string> = {
    bug: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    feature: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    improvement: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    question: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    documentation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  };

  const defaultOptions = options.length > 0 ? options : ["bug", "feature", "improvement", "question", "documentation"];

  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="h-7 text-xs border-0 shadow-none" data-testid="label-cell">
        <SelectValue placeholder="Select label">
          {value && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${labelColors[value] || "bg-gray-100 text-gray-700"}`}>
              {value}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {defaultOptions.map((option) => (
          <SelectItem key={option} value={option} data-testid={`label-${option}`}>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${labelColors[option] || "bg-gray-100 text-gray-700"}`}>
              {option}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// AI Cell (for AI-powered columns)
export function AICell({ value, onChange, onClick }: CellProps & { aiType?: string }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAIAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProcessing(true);
    // Simulate AI processing
    setTimeout(() => {
      setIsProcessing(false);
      onChange({ ...value, processed: true, result: "AI processed content" });
    }, 1000);
  };

  return (
    <button
      className="w-full h-7 px-2 flex items-center gap-1 hover-elevate rounded"
      onClick={handleAIAction}
      disabled={isProcessing}
      data-testid="ai-cell"
    >
      <Sparkles className={`h-3 w-3 ${isProcessing ? "animate-spin text-primary" : "text-muted-foreground"}`} />
      <span className="text-xs text-muted-foreground truncate">
        {isProcessing ? "Processing..." : value?.result || "Run AI"}
      </span>
    </button>
  );
}

// Timeline Cell
export function TimelineCell({ value, onChange }: CellProps) {
  const startDate = value?.startDate;
  const endDate = value?.endDate;

  return (
    <button
      className="w-full h-7 px-2 py-1 text-xs text-left flex items-center gap-1 text-muted-foreground hover-elevate rounded"
      onClick={() => {}}
      data-testid="timeline-cell"
    >
      <Calendar className="h-3 w-3 flex-shrink-0" />
      {startDate && endDate ? (
        <span>{format(parseISO(startDate), "MMM d")} - {format(parseISO(endDate), "MMM d")}</span>
      ) : (
        <span className="opacity-50">Set timeline</span>
      )}
    </button>
  );
}

// Progress Tracking Cell
export function ProgressTrackingCell({ value, onChange }: CellProps) {
  const progress = value || 0;
  
  return (
    <div className="w-full h-7 px-2 flex items-center gap-2" data-testid="progress-tracking-cell">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right">{progress}%</span>
    </div>
  );
}
