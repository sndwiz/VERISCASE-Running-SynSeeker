import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Gavel, Users, CalendarDays, Plus, X } from "lucide-react";
import type { MatterParty, TriggerDates, LitigationTemplateInfo } from "@/types/matters";

interface MatterFormData {
  litigationTemplateId: string;
  venue: string;
  parties: MatterParty[];
  claims: string[];
  triggerDates: TriggerDates;
}

interface LitigationFormSectionProps {
  formData: MatterFormData;
  onUpdate: (updater: (prev: MatterFormData) => MatterFormData) => void;
  templates: LitigationTemplateInfo[];
  showLitigationFields: boolean;
  onToggle: (show: boolean) => void;
}

const TRIGGER_DATE_FIELDS: { key: keyof TriggerDates; label: string; testId: string }[] = [
  { key: "filingDate", label: "Filing Date", testId: "input-filing-date" },
  { key: "serviceDate", label: "Service Date", testId: "input-service-date" },
  { key: "schedulingOrderDate", label: "Scheduling Order Date", testId: "input-scheduling-order-date" },
  { key: "discoveryCutoff", label: "Discovery Cutoff", testId: "input-discovery-cutoff" },
  { key: "expertDeadline", label: "Expert Deadline", testId: "input-expert-deadline" },
  { key: "trialDate", label: "Trial Date", testId: "input-trial-date" },
  { key: "mediationDate", label: "Mediation Date", testId: "input-mediation-date" },
];

export function LitigationFormSection({ formData, onUpdate, templates, showLitigationFields, onToggle }: LitigationFormSectionProps) {
  const [newPartyName, setNewPartyName] = useState("");
  const [newPartyRole, setNewPartyRole] = useState<MatterParty["role"]>("plaintiff");
  const [newPartyCounsel, setNewPartyCounsel] = useState("");
  const [newClaim, setNewClaim] = useState("");

  const handleToggle = () => {
    const next = !showLitigationFields;
    onToggle(next);
    if (!next) {
      onUpdate(p => ({
        ...p,
        litigationTemplateId: "",
        parties: [],
        claims: [],
        triggerDates: {},
      }));
    }
  };

  const addParty = () => {
    if (!newPartyName.trim()) return;
    onUpdate(p => ({
      ...p,
      parties: [...p.parties, {
        name: newPartyName.trim(),
        role: newPartyRole,
        counsel: newPartyCounsel.trim() || undefined,
      }],
    }));
    setNewPartyName("");
    setNewPartyCounsel("");
  };

  const removeParty = (idx: number) => {
    onUpdate(p => ({ ...p, parties: p.parties.filter((_, i) => i !== idx) }));
  };

  const addClaim = () => {
    if (!newClaim.trim()) return;
    onUpdate(p => ({ ...p, claims: [...p.claims, newClaim.trim()] }));
    setNewClaim("");
  };

  const removeClaim = (idx: number) => {
    onUpdate(p => ({ ...p, claims: p.claims.filter((_, i) => i !== idx) }));
  };

  const updateTriggerDate = (key: keyof TriggerDates, value: string) => {
    onUpdate(p => ({
      ...p,
      triggerDates: { ...p.triggerDates, [key]: value || undefined },
    }));
  };

  const selectedTemplate = templates.find(t => t.id === formData.litigationTemplateId);

  return (
    <div className="border-t pt-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Litigation Workflow Template</Label>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggle}
          data-testid="button-toggle-litigation"
        >
          {showLitigationFields ? "Hide" : "Configure Litigation Workflow"}
        </Button>
      </div>

      {showLitigationFields && (
        <div className="space-y-4 p-3 border rounded-md bg-muted/30">
          <div className="space-y-2">
            <Label>Workflow Template</Label>
            <Select
              value={formData.litigationTemplateId}
              onValueChange={v => onUpdate(p => ({ ...p, litigationTemplateId: v }))}
            >
              <SelectTrigger data-testid="select-litigation-template">
                <SelectValue placeholder="Select a litigation template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id} data-testid={`option-template-${t.id}`}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
            )}
          </div>

          {formData.litigationTemplateId && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-sm">Parties</Label>
                </div>
                {formData.parties.length > 0 && (
                  <div className="space-y-1">
                    {formData.parties.map((party, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-sm p-1.5 border rounded-md">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="secondary" className="shrink-0">{party.role}</Badge>
                          <span className="truncate">{party.name}</span>
                          {party.counsel && (
                            <span className="text-muted-foreground truncate">({party.counsel})</span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeParty(idx)}
                          data-testid={`button-remove-party-${idx}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
                  <Input
                    value={newPartyName}
                    onChange={e => setNewPartyName(e.target.value)}
                    placeholder="Party name"
                    data-testid="input-party-name"
                  />
                  <Select value={newPartyRole} onValueChange={v => setNewPartyRole(v as MatterParty["role"])}>
                    <SelectTrigger className="w-[130px]" data-testid="select-party-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plaintiff">Plaintiff</SelectItem>
                      <SelectItem value="defendant">Defendant</SelectItem>
                      <SelectItem value="third-party">Third Party</SelectItem>
                      <SelectItem value="cross-defendant">Cross-Defendant</SelectItem>
                      <SelectItem value="intervenor">Intervenor</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={newPartyCounsel}
                    onChange={e => setNewPartyCounsel(e.target.value)}
                    placeholder="Counsel (optional)"
                    data-testid="input-party-counsel"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!newPartyName.trim()}
                    onClick={addParty}
                    data-testid="button-add-party"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Claims / Causes of Action</Label>
                {formData.claims.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formData.claims.map((claim, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {claim}
                        <button
                          onClick={() => removeClaim(idx)}
                          className="ml-0.5"
                          data-testid={`button-remove-claim-${idx}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={newClaim}
                    onChange={e => setNewClaim(e.target.value)}
                    placeholder="e.g., Breach of Contract, Negligence"
                    onKeyDown={e => {
                      if (e.key === "Enter" && newClaim.trim()) {
                        e.preventDefault();
                        addClaim();
                      }
                    }}
                    data-testid="input-claim"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!newClaim.trim()}
                    onClick={addClaim}
                    data-testid="button-add-claim"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-sm">Key Dates (triggers automatic deadlines)</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {TRIGGER_DATE_FIELDS.map(field => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{field.label}</Label>
                      <Input
                        type="date"
                        value={formData.triggerDates[field.key] || ""}
                        onChange={e => updateTriggerDate(field.key, e.target.value)}
                        data-testid={field.testId}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Dates can be added later. When entered, the system will automatically generate deadline tasks on the corresponding boards.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
