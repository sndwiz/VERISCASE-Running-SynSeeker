import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Person } from "@shared/schema";

interface PersonCellProps {
  value: Person[];
  onChange: (value: Person[]) => void;
  onClick?: (e: React.MouseEvent) => void;
}

interface TeamMember {
  id: string;
  name: string;
  email?: string;
  color: string;
}

export function PersonCell({ value, onChange, onClick }: PersonCellProps) {
  const [open, setOpen] = useState(false);

  const { data: teamMembers, isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
    enabled: open,
    staleTime: 30000,
  });

  const availableMembers: Person[] = teamMembers
    ? teamMembers.map(m => ({ id: m.id, name: m.name, color: m.color }))
    : [];

  const addPerson = (person: Person) => {
    if (!value.find((p) => p.id === person.id)) {
      onChange([...value, person]);
    }
  };

  const removePerson = (personId: string) => {
    onChange(value.filter((p) => p.id !== personId));
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 px-1 justify-start"
          onClick={onClick}
          data-testid="person-cell"
        >
          {value.length === 0 ? (
            <div className="flex items-center text-xs text-muted-foreground">
              <Plus className="h-3 w-3 mr-1" />
              Assign
            </div>
          ) : (
            <div className="flex -space-x-1">
              {value.slice(0, 3).map((person) => (
                <Avatar
                  key={person.id}
                  className="h-6 w-6 border-2 border-background"
                >
                  <AvatarFallback
                    className="text-xs text-white"
                    style={{ backgroundColor: person.color }}
                  >
                    {getInitials(person.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {value.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                  +{value.length - 3}
                </div>
              )}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          {value.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-1">
                Assigned
              </p>
              {value.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between gap-2 px-1 py-1 rounded hover-elevate"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback
                        className="text-xs text-white"
                        style={{ backgroundColor: person.color }}
                      >
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{person.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => removePerson(person.id)}
                    data-testid={`button-remove-person-${person.id}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground px-1">
              Team Members
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : availableMembers.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-2">
                No team members found. Sign in to be added as a team member.
              </p>
            ) : availableMembers.filter((m) => !value.find((v) => v.id === m.id)).length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-2">
                All team members assigned
              </p>
            ) : (
              availableMembers
                .filter((m) => !value.find((v) => v.id === m.id))
                .map((person) => (
                  <button
                    key={person.id}
                    className="flex items-center gap-2 w-full px-1 py-1 rounded text-left hover-elevate"
                    onClick={() => addPerson(person)}
                    data-testid={`button-add-person-${person.id}`}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback
                        className="text-xs text-white"
                        style={{ backgroundColor: person.color }}
                      >
                        {getInitials(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{person.name}</span>
                  </button>
                ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
