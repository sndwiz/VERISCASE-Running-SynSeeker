import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { priorityConfig, type Priority } from "@shared/schema";

interface PriorityCellProps {
  value: Priority;
  onChange: (value: Priority) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function PriorityCell({ value, onChange, onClick }: PriorityCellProps) {
  const config = priorityConfig[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`w-full px-2 py-1 rounded text-xs font-medium text-center ${config.bgColor} ${config.color} hover-elevate`}
          onClick={onClick}
          data-testid={`priority-cell-${value}`}
        >
          {config.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {(Object.keys(priorityConfig) as Priority[]).map((priority) => {
          const priorityCfg = priorityConfig[priority];
          return (
            <DropdownMenuItem
              key={priority}
              onClick={() => onChange(priority)}
              data-testid={`priority-option-${priority}`}
            >
              <div
                className={`w-full px-2 py-1 rounded text-xs font-medium text-center ${priorityCfg.bgColor} ${priorityCfg.color}`}
              >
                {priorityCfg.label}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
