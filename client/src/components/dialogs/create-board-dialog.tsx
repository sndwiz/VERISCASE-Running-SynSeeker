import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users, Briefcase, ClipboardCheck, AlarmClock, FileText,
  Search, HeartPulse, Activity, DollarSign, Mic, GraduationCap,
  Handshake, Library, LayoutGrid, ArrowLeft, Check, Columns3,
  FolderKanban,
} from "lucide-react";
import type { Client, Matter, ColumnType } from "@shared/schema";
import {
  boardTemplates,
  templateCategories,
  getTemplateColumns,
  type BoardTemplate,
} from "@/lib/board-templates";

const TEMPLATE_ICONS: Record<string, any> = {
  "users": Users,
  "briefcase": Briefcase,
  "clipboard-check": ClipboardCheck,
  "alarm-clock": AlarmClock,
  "file-text": FileText,
  "search": Search,
  "heart-pulse": HeartPulse,
  "activity": Activity,
  "dollar-sign": DollarSign,
  "mic": Mic,
  "graduation-cap": GraduationCap,
  "handshake": Handshake,
  "library": Library,
  "layout-grid": LayoutGrid,
};

const formSchema = z.object({
  name: z.string().min(1, "Board name is required"),
  description: z.string().optional(),
  color: z.string().default("#6366f1"),
  clientId: z.string().nullable().optional(),
  matterId: z.string().nullable().optional(),
});

type FormData = z.infer<typeof formSchema>;

export interface CreateBoardSubmitData extends FormData {
  templateId?: string;
  columns?: Array<{ id: string; title: string; type: ColumnType; width: number; visible: boolean; order: number; options?: string[] }>;
  groups?: Array<{ title: string; color: string }>;
}

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateBoardSubmitData) => void;
}

const colorOptions = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

type Step = "template" | "details";

export function CreateBoardDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateBoardDialogProps) {
  const [step, setStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplate | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#6366f1",
      clientId: null,
      matterId: null,
    },
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    enabled: open,
  });

  const { data: matters = [] } = useQuery<Matter[]>({
    queryKey: ["/api/matters"],
    enabled: open,
  });

  const selectedClientId = form.watch("clientId");

  const filteredMatters = selectedClientId
    ? matters.filter(m => m.clientId === selectedClientId)
    : [];

  const handleSelectTemplate = (template: BoardTemplate | null) => {
    setSelectedTemplate(template);
    if (template) {
      form.setValue("name", template.name);
      form.setValue("description", template.description);
      form.setValue("color", template.color);
    } else {
      form.setValue("name", "");
      form.setValue("description", "");
      form.setValue("color", "#6366f1");
    }
    setStep("details");
  };

  const handleSubmit = (data: FormData) => {
    const submitData: CreateBoardSubmitData = { ...data };
    if (selectedTemplate) {
      submitData.templateId = selectedTemplate.id;
      submitData.columns = getTemplateColumns(selectedTemplate);
      submitData.groups = selectedTemplate.groups;
    }
    onSubmit(submitData);
    handleClose();
  };

  const handleClose = () => {
    form.reset();
    setStep("template");
    setSelectedTemplate(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    setStep("template");
    setSelectedTemplate(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === "template" ? "sm:max-w-2xl" : "sm:max-w-md"}>
        {step === "template" ? (
          <TemplatePickerStep onSelect={handleSelectTemplate} />
        ) : (
          <DetailsStep
            form={form}
            selectedTemplate={selectedTemplate}
            clients={clients}
            matters={matters}
            filteredMatters={filteredMatters}
            selectedClientId={selectedClientId}
            onBack={handleBack}
            onSubmit={handleSubmit}
            onCancel={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplatePickerStep({ onSelect }: { onSelect: (template: BoardTemplate | null) => void }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Board</DialogTitle>
        <DialogDescription>
          Start from a template or create a blank board.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh] pr-2">
        <div className="space-y-5 pb-2">
          <button
            onClick={() => onSelect(null)}
            className="w-full flex items-center gap-3 p-3 rounded-md border border-dashed hover-elevate text-left transition-all"
            data-testid="template-blank"
          >
            <div className="h-10 w-10 rounded-md flex items-center justify-center bg-muted shrink-0">
              <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">Blank Board</p>
              <p className="text-xs text-muted-foreground">Start fresh with default columns</p>
            </div>
          </button>

          {templateCategories.map(cat => {
            const templates = boardTemplates.filter(t => t.category === cat.id);
            if (templates.length === 0) return null;
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-2">
                  <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" />
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{cat.label}</h3>
                  <span className="text-xs text-muted-foreground">({templates.length})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map(template => {
                    const Icon = TEMPLATE_ICONS[template.icon] || LayoutGrid;
                    const isHovered = hoveredId === template.id;
                    return (
                      <button
                        key={template.id}
                        onClick={() => onSelect(template)}
                        onMouseEnter={() => setHoveredId(template.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className="flex items-start gap-3 p-3 rounded-md border hover-elevate text-left transition-all"
                        data-testid={`template-${template.id}`}
                      >
                        <div
                          className="h-10 w-10 rounded-md flex items-center justify-center shrink-0"
                          style={{ backgroundColor: template.color }}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm">{template.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{template.description}</p>
                          {isHovered && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              <Badge variant="secondary" className="text-[10px]">
                                <Columns3 className="h-2.5 w-2.5 mr-0.5" />
                                {template.columns.length} columns
                              </Badge>
                              <Badge variant="secondary" className="text-[10px]">
                                <FolderKanban className="h-2.5 w-2.5 mr-0.5" />
                                {template.groups.length} groups
                              </Badge>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </>
  );
}

function DetailsStep({
  form,
  selectedTemplate,
  clients,
  matters,
  filteredMatters,
  selectedClientId,
  onBack,
  onSubmit,
  onCancel,
}: {
  form: any;
  selectedTemplate: BoardTemplate | null;
  clients: Client[];
  matters: Matter[];
  filteredMatters: Matter[];
  selectedClientId: string | null | undefined;
  onBack: () => void;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}) {
  const Icon = selectedTemplate ? (TEMPLATE_ICONS[selectedTemplate.icon] || LayoutGrid) : LayoutGrid;

  return (
    <>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onBack}
            data-testid="button-back-to-templates"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <DialogTitle className="flex items-center gap-2">
              {selectedTemplate && (
                <div
                  className="h-6 w-6 rounded flex items-center justify-center shrink-0"
                  style={{ backgroundColor: selectedTemplate.color }}
                >
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              {selectedTemplate ? selectedTemplate.name : "Blank Board"}
            </DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              {selectedTemplate
                ? `${selectedTemplate.columns.length} columns, ${selectedTemplate.groups.length} groups`
                : "Start with default columns"}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      {selectedTemplate && (
        <div className="rounded-md border p-3 space-y-2 bg-muted/30">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Groups</p>
            <div className="flex flex-wrap gap-1">
              {selectedTemplate.groups.map((g, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full mr-1 shrink-0" style={{ backgroundColor: g.color }} />
                  {g.title}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Columns</p>
            <div className="flex flex-wrap gap-1">
              {selectedTemplate.columns.slice(0, 8).map((col, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{col.title}</Badge>
              ))}
              {selectedTemplate.columns.length > 8 && (
                <Badge variant="secondary" className="text-[10px]">+{selectedTemplate.columns.length - 8} more</Badge>
              )}
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Board Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Active Cases"
                    {...field}
                    data-testid="input-board-name"
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
                    placeholder="Brief description of this board..."
                    {...field}
                    data-testid="input-board-description"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Client (optional)</FormLabel>
                <Select
                  onValueChange={(val) => {
                    field.onChange(val === "__none__" ? null : val);
                    if (val === "__none__") {
                      form.setValue("matterId", null);
                    }
                  }}
                  value={field.value || "__none__"}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-client">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">No client (general board)</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedClientId && filteredMatters.length > 0 && (
            <FormField
              control={form.control}
              name="matterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Case/Matter (optional)</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "__none__" ? null : val)}
                    value={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-matter">
                        <SelectValue placeholder="Select a case" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">No specific case</SelectItem>
                      {filteredMatters.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-md transition-transform ${
                          field.value === color
                            ? "ring-2 ring-offset-2 ring-primary scale-110"
                            : ""
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => field.onChange(color)}
                        data-testid={`color-option-${color}`}
                      />
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" data-testid="button-create-board">
              {selectedTemplate && <Check className="h-4 w-4 mr-1" />}
              Create Board
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
