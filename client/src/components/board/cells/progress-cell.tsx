import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";

interface ProgressCellProps {
  value: number;
  onChange: (value: number) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export function ProgressCell({ value, onChange, onClick }: ProgressCellProps) {
  const [open, setOpen] = useState(false);

  const getProgressColor = (val: number) => {
    if (val === 100) return "bg-green-500";
    if (val >= 75) return "bg-blue-500";
    if (val >= 50) return "bg-amber-500";
    if (val >= 25) return "bg-orange-500";
    return "bg-gray-400";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full px-1 py-1 flex items-center gap-2 hover-elevate rounded"
          onClick={onClick}
          data-testid="progress-cell"
        >
          <Progress
            value={value}
            className="h-2 flex-1"
            style={
              {
                "--progress-background": getProgressColor(value).replace(
                  "bg-",
                  ""
                ),
              } as React.CSSProperties
            }
          />
          <span className="text-xs text-muted-foreground w-8 text-right">
            {value}%
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium text-center">{value}%</div>
          <Slider
            value={[value]}
            onValueChange={([val]) => onChange(val)}
            max={100}
            step={5}
            data-testid="progress-slider"
          />
          <div className="flex justify-between gap-2 text-xs text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
