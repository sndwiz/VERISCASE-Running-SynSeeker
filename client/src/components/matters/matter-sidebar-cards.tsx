import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Gavel, Calendar, Users, CheckCircle2 } from "lucide-react";
import type { Matter, MatterPhase, TriggerDates, TeamMember } from "@/types/matters";

const KEY_DATE_LABELS: { key: keyof TriggerDates; label: string }[] = [
  { key: "filingDate", label: "Filing Date" },
  { key: "serviceDate", label: "Service Date" },
  { key: "schedulingOrderDate", label: "Scheduling Order" },
  { key: "discoveryCutoff", label: "Discovery Cutoff" },
  { key: "expertDeadline", label: "Expert Deadline" },
  { key: "trialDate", label: "Trial Date" },
  { key: "mediationDate", label: "Mediation Date" },
];

interface PhasesCardProps {
  phases: MatterPhase[];
  currentPhase?: string;
}

export function PhasesCard({ phases, currentPhase }: PhasesCardProps) {
  const sorted = [...phases].sort((a, b) => a.order - b.order);
  const current = sorted.find(p => p.id === currentPhase);
  const nextPhase = current ? sorted.find(p => p.order === current.order + 1) : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gavel className="h-4 w-4" />
          Litigation Phases
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {sorted.map((phase) => {
          const isCurrent = phase.id === currentPhase;
          return (
            <div
              key={phase.id}
              className={`flex items-center gap-2 p-1.5 rounded-md text-sm ${
                isCurrent ? "bg-primary/10 font-medium" : ""
              }`}
              data-testid={`phase-${phase.id}`}
            >
              {phase.status === "completed" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : isCurrent ? (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-primary bg-primary/20 shrink-0" />
              ) : (
                <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />
              )}
              <span className={phase.status === "completed" ? "text-muted-foreground line-through" : ""}>
                {phase.name}
              </span>
              {isCurrent && (
                <Badge variant="secondary" className="ml-auto text-[10px]">Current</Badge>
              )}
            </div>
          );
        })}
        {current && (
          <div className="mt-3 pt-3 border-t space-y-1.5">
            <p className="text-xs text-muted-foreground">{current.description}</p>
            {nextPhase && (
              <p className="text-xs text-muted-foreground">
                Next: <span className="font-medium text-foreground">{nextPhase.name}</span>
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface KeyDatesCardProps {
  triggerDates: TriggerDates;
}

export function KeyDatesCard({ triggerDates }: KeyDatesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Key Dates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {KEY_DATE_LABELS.map(({ key, label }) => {
          const val = triggerDates[key];
          if (!val) return null;
          const d = new Date(val + "T00:00:00");
          const isPast = d < new Date();
          return (
            <div key={key} className="flex items-center justify-between text-sm" data-testid={`date-${key}`}>
              <span className="text-muted-foreground">{label}</span>
              <span className={isPast ? "text-muted-foreground" : "font-medium"}>
                {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface PartiesCardProps {
  parties: Matter["parties"];
}

export function PartiesCard({ parties }: PartiesCardProps) {
  if (!parties || parties.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Parties
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {parties.map((party, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm" data-testid={`party-${idx}`}>
            <Badge variant="secondary" className="text-[10px] shrink-0">{party.role}</Badge>
            <span className="truncate">{party.name}</span>
            {party.counsel && (
              <span className="text-muted-foreground text-xs truncate ml-auto">({party.counsel})</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface TeamAssignmentsCardProps {
  matter: Matter;
  teamMembers: TeamMember[];
}

export function TeamAssignmentsCard({ matter, teamMembers }: TeamAssignmentsCardProps) {
  const responsibleParty = matter.responsiblePartyId
    ? teamMembers.find(tm => tm.id === matter.responsiblePartyId)
    : null;
  const assignedAtts = (matter.assignedAttorneys || [])
    .map(id => teamMembers.find(tm => tm.id === id))
    .filter(Boolean);
  const assignedPls = (matter.assignedParalegals || [])
    .map(id => teamMembers.find(tm => tm.id === id))
    .filter(Boolean);
  const hasTeam = responsibleParty || assignedAtts.length > 0 || assignedPls.length > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasTeam ? (
          <p className="text-sm text-muted-foreground">No team members assigned.</p>
        ) : (
          <>
            {responsibleParty && (
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {responsibleParty.firstName[0]}{responsibleParty.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium" data-testid="text-responsible-party">
                    {responsibleParty.firstName} {responsibleParty.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">Responsible Attorney</p>
                </div>
              </div>
            )}
            {assignedAtts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Attorneys</p>
                {assignedAtts.map(atty => atty && (
                  <div key={atty.id} className="flex items-center gap-3 py-1" data-testid={`text-attorney-${atty.id}`}>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">{atty.firstName[0]}{atty.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm">{atty.firstName} {atty.lastName}</p>
                  </div>
                ))}
              </div>
            )}
            {assignedPls.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Paralegals</p>
                {assignedPls.map(pl => pl && (
                  <div key={pl.id} className="flex items-center gap-3 py-1" data-testid={`text-paralegal-${pl.id}`}>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs">{pl.firstName[0]}{pl.lastName[0]}</AvatarFallback>
                    </Avatar>
                    <p className="text-sm">{pl.firstName} {pl.lastName}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
