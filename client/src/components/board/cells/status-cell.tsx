import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit3 } from "lucide-react";
import { statusConfig, type StatusType, type CustomStatusLabel, defaultStatusLabels } from "@shared/schema";

interface StatusCellProps {
  value: StatusType | string;
  onChange: (value: StatusType | string) => void;
  onClick?: (e: React.MouseEvent) => void;
  customLabels?: CustomStatusLabel[];
  onEditLabels?: () => void;
}

export function StatusCell({
  value,
  onChange,
  onClick,
  customLabels,
  onEditLabels,
}: StatusCellProps) {
  const labels = customLabels && customLabels.length > 0 ? customLabels : defaultStatusLabels;

  const getDisplayConfig = () => {
    const customLabel = labels.find((l) => l.id === value);
    if (customLabel) {
      return {
        label: customLabel.label,
        bgColor: `${customLabel.color}20`,
        textColor: customLabel.color,
      };
    }
    
    const fallbackConfig = statusConfig[value as StatusType];
    if (fallbackConfig) {
      return {
        label: fallbackConfig.label,
        bgColor: fallbackConfig.bgColor,
        textColor: fallbackConfig.color,
      };
    }
    
    return {
      label: value || "Select",
      bgColor: "#6B728020",
      textColor: "#6B7280",
    };
  };

  const config = getDisplayConfig();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-full px-2 py-1 rounded text-xs font-medium text-center hover-elevate"
          style={{
            backgroundColor: config.bgColor,
            color: config.textColor,
          }}
          onClick={onClick}
          data-testid={`status-cell-${value}`}
        >
          {config.label}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-[160px]">
        {labels.map((label) => (
          <DropdownMenuItem
            key={label.id}
            onClick={() => onChange(label.id)}
            data-testid={`status-option-${label.id}`}
          >
            <div
              className="w-full px-2 py-1 rounded text-xs font-medium text-center"
              style={{
                backgroundColor: `${label.color}20`,
                color: label.color,
              }}
            >
              {label.label}
            </div>
          </DropdownMenuItem>
        ))}
        {onEditLabels && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEditLabels();
              }}
              className="text-muted-foreground text-xs"
              data-testid="button-edit-labels"
            >
              <Edit3 className="h-3 w-3 mr-2" />
              Edit Labels
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
