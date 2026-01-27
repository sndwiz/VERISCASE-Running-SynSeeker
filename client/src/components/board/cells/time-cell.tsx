import { useState } from "react";
import { Clock, Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimeCellProps {
  value: number;
  onChange: (value: number) => void;
  onClick?: (e: React.MouseEvent) => void;
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function parseTimeInput(input: string): number {
  const hours = input.match(/(\d+)\s*h/i);
  const mins = input.match(/(\d+)\s*m/i);
  let total = 0;
  if (hours) total += parseInt(hours[1], 10) * 60;
  if (mins) total += parseInt(mins[1], 10);
  if (!hours && !mins) {
    const num = parseInt(input, 10);
    if (!isNaN(num)) total = num;
  }
  return total;
}

export function TimeCell({ value, onChange, onClick }: TimeCellProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleAddTime = (minutes: number) => {
    onChange(value + minutes);
  };

  const handleSetTime = () => {
    const parsed = parseTimeInput(inputValue);
    if (parsed > 0) {
      onChange(parsed);
      setInputValue("");
    }
  };

  const handleReset = () => {
    onChange(0);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="w-full px-1 py-1 flex items-center gap-2 hover-elevate rounded text-sm"
          onClick={onClick}
          data-testid="time-cell"
        >
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className={value > 0 ? "" : "text-muted-foreground"}>
            {value > 0 ? formatTime(value) : "0m"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-3">
          <div className="text-sm font-medium text-center">
            {formatTime(value)}
          </div>
          
          <div className="flex gap-1">
            <Input
              placeholder="e.g. 1h 30m"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSetTime()}
              data-testid="time-input"
            />
            <Button size="sm" className="h-8" onClick={handleSetTime} data-testid="button-set-time">
              Set
            </Button>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => handleAddTime(15)}
              data-testid="button-add-15m"
            >
              +15m
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => handleAddTime(30)}
              data-testid="button-add-30m"
            >
              +30m
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => handleAddTime(60)}
              data-testid="button-add-1h"
            >
              +1h
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-muted-foreground"
            onClick={handleReset}
            data-testid="button-reset-time"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
