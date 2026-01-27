import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { statusConfig, type StatusType } from "@shared/schema";

interface StatusCellProps {
  value: StatusType;
  onChange: (value: StatusType) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function StatusCell({ value, onChange, onClick }: StatusCellProps) {
  const config = statusConfig[value];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`w-full px-2 py-1 rounded text-xs font-medium text-center ${config.bgColor} ${config.color} hover-elevate`}
          onClick={onClick}
          data-testid={`status-cell-${value}`}
        >
          {config.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {(Object.keys(statusConfig) as StatusType[]).map((status) => {
          const statusCfg = statusConfig[status];
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => onChange(status)}
              data-testid={`status-option-${status}`}
            >
              <div
                className={`w-full px-2 py-1 rounded text-xs font-medium text-center ${statusCfg.bgColor} ${statusCfg.color}`}
              >
                {statusCfg.label}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
